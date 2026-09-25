import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { sentryCaptureEvent } from "./lib/sentry";
import {
  buildCoachSystemPrompt,
  buildCoachUserPrompt,
  getTimeOfDayLabel,
  isWorkTime,
} from "./lib/coachPrompt";
import { callOpenRouterChat, tryParseJson } from "./lib/openRouter";
import { today } from "./lib/calendar";

const MAX_NOTIFICATIONS_PER_DAY = 3;

export const countTodayNotifications = internalQuery({
  args: { userId: v.string(), today: v.string() },
  returns: v.number(),
  handler: async (ctx, { userId, today: todayStr }) => {
    const logs = await ctx.db
      .query("coachNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("date"), todayStr))
      .collect();
    return logs.length;
  },
});

export const logNotification = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    type: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("coachNotificationLog", args);
    return null;
  },
});

export const listRecipientIds = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_coach_enabled", (q) => q.eq("coachNotificationsEnabled", true))
      .collect();

    const userIds: string[] = [];
    for (const row of settings) {
      if (row.notificationsEnabled === false) continue;
      const token = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", row.userId))
        .first();
      if (token) userIds.push(row.userId);
    }
    return userIds;
  },
});

export const getUserCoachContext = internalQuery({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today: todayStr }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (
      settings?.coachNotificationsEnabled !== true ||
      settings.notificationsEnabled === false
    ) {
      return null;
    }

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("dueDate"), todayStr),
          q.eq(q.field("completed"), false),
        ),
      )
      .collect();

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      name: prefs?.name,
      bestWorkTimes: prefs?.bestWorkTimes ?? [],
      uncompletedTaskCount: tasks.length,
      topTaskTitles: tasks.slice(0, 3).map((t) => t.title),
      currentStreak: streak?.currentStreak ?? 0,
      lastCompletionDate: streak?.lastCompletionDate,
    };
  },
});

export const processAllUsers = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const nowMs = Date.now();
    const currentHour = new Date(nowMs).getUTCHours();
    const todayStr = today(nowMs);

    const userIds = await ctx.runQuery(
      internal.coachNotifications.listRecipientIds,
      {},
    );

    for (const userId of userIds) {
      try {
        const userCtx = await ctx.runQuery(
          internal.coachNotifications.getUserCoachContext,
          { userId, today: todayStr },
        );
        if (!userCtx) continue;

        if (!isWorkTime(userCtx.bestWorkTimes, currentHour)) continue;

        const todayCount = await ctx.runQuery(
          internal.coachNotifications.countTodayNotifications,
          { userId, today: todayStr },
        );
        if (todayCount >= MAX_NOTIFICATIONS_PER_DAY) continue;

        if (userCtx.uncompletedTaskCount === 0) continue;

        const timeOfDay = getTimeOfDayLabel(currentHour);
        const systemPrompt = buildCoachSystemPrompt();
        const userPrompt = buildCoachUserPrompt({
          userName: userCtx.name,
          uncompletedTaskCount: userCtx.uncompletedTaskCount,
          topTaskTitles: userCtx.topTaskTitles,
          currentStreak: userCtx.currentStreak,
          lastCompletionDate: userCtx.lastCompletionDate,
          timeOfDay,
        });

        const llm = await callOpenRouterChat({ systemPrompt, userPrompt });
        if (!llm.ok) continue;

        let message: string;
        const parsed = tryParseJson(llm.rawText);
        if (
          parsed &&
          typeof parsed === "object" &&
          "message" in parsed &&
          typeof (parsed as { message: unknown }).message === "string"
        ) {
          message = (parsed as { message: string }).message;
        } else {
          message = llm.rawText.slice(0, 120);
        }

        if (!message) continue;

        await ctx.runAction(internal.pushNotifications.send, {
          userId,
          title: "Lullio Coach",
          body: message,
          data: { type: "coach" },
        });

        await ctx.runMutation(internal.coachNotifications.logNotification, {
          userId,
          date: todayStr,
          type: "coach",
          message,
        });
      } catch (error) {
        await sentryCaptureEvent(
          "error",
          `[Coach] Failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
          { userId },
        );
      }
    }

    return null;
  },
});

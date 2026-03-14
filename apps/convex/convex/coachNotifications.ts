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

const MAX_NOTIFICATIONS_PER_DAY = 3;

export const countTodayNotifications = internalQuery({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today }) => {
    const logs = await ctx.db
      .query("coachNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("date"), today))
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
  handler: async (ctx, args) => {
    await ctx.db.insert("coachNotificationLog", args);
  },
});

export const getActiveSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return subs
      .filter((s) => !s.expiresAt || new Date(s.expiresAt) > new Date())
      .map((s) => s.userId);
  },
});

export const getUserCoachContext = internalQuery({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today }) => {
    // Settings — check notifications enabled
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings?.notificationsEnabled === false) {
      return null;
    }

    // Preferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Today's uncompleted tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("dueDate"), today),
          q.eq(q.field("completed"), false),
        ),
      )
      .collect();

    // Streak
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
  handler: async (ctx) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return;

    const now = new Date();
    const currentHour = now.getUTCHours();
    const today = now.toISOString().slice(0, 10);

    const userIds = await ctx.runQuery(
      internal.coachNotifications.getActiveSubscribers,
      {},
    );

    for (const userId of userIds) {
      try {
        // Get user context
        const userCtx = await ctx.runQuery(
          internal.coachNotifications.getUserCoachContext,
          { userId, today },
        );
        if (!userCtx) continue; // notifications disabled

        // Check if current hour matches their preferred work times
        if (!isWorkTime(userCtx.bestWorkTimes, currentHour)) continue;

        // Check daily notification limit
        const todayCount = await ctx.runQuery(
          internal.coachNotifications.countTodayNotifications,
          { userId, today },
        );
        if (todayCount >= MAX_NOTIFICATIONS_PER_DAY) continue;

        // Skip if no tasks to work on
        if (userCtx.uncompletedTaskCount === 0) continue;

        // Generate message via LLM
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

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }),
          },
        );

        if (!response.ok) continue;

        const data = await response.json();
        let raw = data.choices?.[0]?.message?.content?.trim() ?? "";
        raw = raw
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();

        let message: string;
        try {
          message = JSON.parse(raw).message;
        } catch {
          message = raw.slice(0, 120);
        }

        if (!message) continue;

        // Send push notification
        await ctx.runAction(internal.pushNotifications.send, {
          userId,
          title: "Lullio Coach",
          body: message,
          data: { type: "coach" },
        });

        // Log notification
        await ctx.runMutation(internal.coachNotifications.logNotification, {
          userId,
          date: today,
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
  },
});

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { today, yesterday, weekStart, daysBetween } from "./lib/calendar";
import { requireAuth } from "./lib/auth";

const streakReadReturns = v.object({
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastCompletionDate: v.union(v.string(), v.null()),
});

const streakUpdateReturns = v.object({
  currentStreak: v.number(),
});

export const get = query({
  args: { nowMs: v.number() },
  returns: streakReadReturns,
  handler: async (ctx, { nowMs }) => {
    const userId = await requireAuth(ctx);

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!streak) {
      return { currentStreak: 0, longestStreak: 0, lastCompletionDate: null };
    }

    const todayStr = today(nowMs);
    const yesterdayStr = yesterday(nowMs);

    if (
      streak.lastCompletionDate !== todayStr &&
      streak.lastCompletionDate !== yesterdayStr
    ) {
      return {
        currentStreak: 0,
        longestStreak: streak.longestStreak,
        lastCompletionDate: streak.lastCompletionDate,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletionDate: streak.lastCompletionDate,
    };
  },
});

export const updateOnCompletion = internalMutation({
  args: {
    userId: v.string(),
    nowMs: v.optional(v.number()),
  },
  returns: streakUpdateReturns,
  handler: async (ctx, { userId, nowMs = Date.now() }) => {
    const todayStr = today(nowMs);
    const yesterdayStr = yesterday(nowMs);
    const mondayOfThisWeek = weekStart(nowMs);

    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("streaks", {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: todayStr,
        freezesUsedThisWeek: 0,
        weekStart: mondayOfThisWeek,
      });
      return { currentStreak: 1 };
    }

    if (existing.lastCompletionDate === todayStr) {
      return { currentStreak: existing.currentStreak };
    }

    let newStreak = existing.currentStreak;
    let freezesUsed = existing.freezesUsedThisWeek;
    let weekStartDate = existing.weekStart;

    if (mondayOfThisWeek !== weekStartDate) {
      freezesUsed = 0;
      weekStartDate = mondayOfThisWeek;
    }

    if (existing.lastCompletionDate === yesterdayStr) {
      newStreak += 1;
    } else {
      const daysMissed =
        daysBetween(existing.lastCompletionDate, todayStr) - 1;

      if (daysMissed === 1 && freezesUsed < 1) {
        newStreak += 1;
        freezesUsed += 1;
      } else {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(existing.longestStreak, newStreak);

    await ctx.db.patch(existing._id, {
      currentStreak: newStreak,
      longestStreak,
      lastCompletionDate: todayStr,
      freezesUsedThisWeek: freezesUsed,
      weekStart: weekStartDate,
    });

    return { currentStreak: newStreak };
  },
});

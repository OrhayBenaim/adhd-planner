import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth, requirePremium } from "./lib/auth";
import {
  getTrendsSince,
  getWeeklyBoundaries,
} from "./lib/insightsWindows";

const weeklyReportReturns = v.object({
  tasksCompletedThisWeek: v.number(),
  tasksCompletedLastWeek: v.number(),
  mostProductiveDay: v.union(v.string(), v.null()),
  avgDifficulty: v.number(),
  currentStreak: v.number(),
  longestStreak: v.number(),
});

export const getWeeklyReport = query({
  args: { nowMs: v.number() },
  returns: weeklyReportReturns,
  handler: async (ctx, { nowMs }) => {
    const userId = await requireAuth(ctx);
    await requirePremium(ctx, userId, nowMs);

    const { weekAgoMs, twoWeeksAgoMs } = getWeeklyBoundaries(nowMs);

    // Only fetch completed tasks from last 2 weeks (not ALL tasks ever)
    const recentTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.gte(q.field("_creationTime"), twoWeeksAgoMs),
        ),
      )
      .collect();

    const completedThisWeek = recentTasks.filter(
      (t) => t._creationTime >= weekAgoMs,
    );
    const completedLastWeek = recentTasks.filter(
      (t) => t._creationTime < weekAgoMs,
    );

    // Most productive day
    const dayMap: Record<string, number> = {};
    for (const t of completedThisWeek) {
      const day = new Date(t._creationTime).toLocaleDateString("en-US", {
        weekday: "long",
      });
      dayMap[day] = (dayMap[day] ?? 0) + 1;
    }
    const mostProductiveDay =
      Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Average difficulty
    const scoredTasks = completedThisWeek.filter((t) => t.difficulty > 0);
    const avgDifficulty = scoredTasks.length
      ? Math.round(
          scoredTasks.reduce((sum, t) => sum + t.difficulty, 0) /
            scoredTasks.length,
        )
      : 0;

    // Streak
    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      tasksCompletedThisWeek: completedThisWeek.length,
      tasksCompletedLastWeek: completedLastWeek.length,
      mostProductiveDay,
      avgDifficulty,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
    };
  },
});

export const getCompletionTrends = query({
  args: { nowMs: v.number(), days: v.optional(v.number()) },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, { nowMs, days = 30 }) => {
    const userId = await requireAuth(ctx);
    await requirePremium(ctx, userId, nowMs);

    const since = getTrendsSince(nowMs, days);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.gte(q.field("_creationTime"), since),
        ),
      )
      .collect();

    const byDate: Record<string, number> = {};
    for (const t of tasks) {
      const date = new Date(t._creationTime).toISOString().slice(0, 10);
      byDate[date] = (byDate[date] ?? 0) + 1;
    }

    return byDate;
  },
});

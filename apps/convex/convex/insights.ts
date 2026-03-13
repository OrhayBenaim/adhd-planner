import { v } from "convex/values";
import { query } from "./_generated/server";
import { DAY_MS } from "./lib/constants";
import { requireAuth, requirePremium } from "./lib/auth";

export const getWeeklyReport = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await requirePremium(ctx, userId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

    // Only fetch completed tasks from last 2 weeks (not ALL tasks ever)
    const recentTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.gte(q.field("_creationTime"), twoWeeksAgo.getTime()),
        ),
      )
      .collect();

    const completedThisWeek = recentTasks.filter(
      (t) => t._creationTime >= weekAgo.getTime(),
    );
    const completedLastWeek = recentTasks.filter(
      (t) => t._creationTime < weekAgo.getTime(),
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
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }) => {
    const userId = await requireAuth(ctx);
    await requirePremium(ctx, userId);

    const since = Date.now() - days * DAY_MS;

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

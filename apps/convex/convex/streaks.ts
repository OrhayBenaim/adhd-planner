import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { DAY_MS } from "./lib/constants";
import { requireAuth } from "./lib/auth";

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!streak) {
      return { currentStreak: 0, longestStreak: 0, lastCompletionDate: null };
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - DAY_MS)
      .toISOString()
      .slice(0, 10);

    if (
      streak.lastCompletionDate !== today &&
      streak.lastCompletionDate !== yesterday
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
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check premium status inline (mutations can't call runQuery on other modules)
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const isPremium = sub?.isActive ?? false;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - DAY_MS)
      .toISOString()
      .slice(0, 10);
    const mondayOfThisWeek = getMonday(today);

    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      await ctx.db.insert("streaks", {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: today,
        freezesUsedThisWeek: 0,
        weekStart: mondayOfThisWeek,
      });
      return { currentStreak: 1 };
    }

    // Already completed today
    if (existing.lastCompletionDate === today) {
      return { currentStreak: existing.currentStreak };
    }

    let newStreak = existing.currentStreak;
    let freezesUsed = existing.freezesUsedThisWeek;
    let weekStart = existing.weekStart;

    // Reset weekly freeze counter if new week
    if (mondayOfThisWeek !== weekStart) {
      freezesUsed = 0;
      weekStart = mondayOfThisWeek;
    }

    if (existing.lastCompletionDate === yesterday) {
      newStreak += 1;
    } else {
      // Missed at least one day
      const missedDate = new Date(
        existing.lastCompletionDate + "T00:00:00Z",
      );
      const todayDate = new Date(today + "T00:00:00Z");
      const daysMissed =
        Math.floor(
          (todayDate.getTime() - missedDate.getTime()) / DAY_MS,
        ) - 1;

      if (isPremium && daysMissed === 1 && freezesUsed < 1) {
        // Premium streak freeze — forgive one missed day per week
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
      lastCompletionDate: today,
      freezesUsedThisWeek: freezesUsed,
      weekStart,
    });

    return { currentStreak: newStreak };
  },
});

import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;

    // Delete tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete userSettings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings) await ctx.db.delete(settings._id);

    // Delete userProgress
    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (progress) await ctx.db.delete(progress._id);

    // Delete userPreferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (prefs) await ctx.db.delete(prefs._id);

    // Delete aiScoringAudit
    const audits = await ctx.db
      .query("aiScoringAudit")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const audit of audits) {
      await ctx.db.delete(audit._id);
    }

    // Delete userCosts
    const costs = await ctx.db
      .query("userCosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (costs) await ctx.db.delete(costs._id);

    // Delete pushTokens
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }

    // Delete subscriptions
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (sub) await ctx.db.delete(sub._id);

    // Delete monthlyAiCosts
    const monthlyCosts = await ctx.db
      .query("monthlyAiCosts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const mc of monthlyCosts) {
      await ctx.db.delete(mc._id);
    }

    // Delete aiCredits
    const credits = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (credits) await ctx.db.delete(credits._id);

    // Delete streaks
    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (streak) await ctx.db.delete(streak._id);

    // Delete achievements
    const userAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const a of userAchievements) {
      await ctx.db.delete(a._id);
    }
  },
});

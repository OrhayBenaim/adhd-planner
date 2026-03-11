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
  },
});

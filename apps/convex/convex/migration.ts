import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateUserData = internalMutation({
  args: {
    oldUserId: v.string(),
    newUserId: v.string(),
  },
  handler: async (ctx, { oldUserId, newUserId }) => {
    // Migrate userPreferences
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (prefs) {
      // Check if new user already has preferences
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(prefs._id);
      } else {
        await ctx.db.patch(prefs._id, { userId: newUserId });
      }
    }

    // Migrate tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    for (const task of tasks) {
      await ctx.db.patch(task._id, { userId: newUserId });
    }

    // Migrate userSettings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (settings) {
      const existing = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(settings._id);
      } else {
        await ctx.db.patch(settings._id, { userId: newUserId });
      }
    }

    // Migrate userProgress
    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (progress) {
      const existing = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(progress._id);
      } else {
        await ctx.db.patch(progress._id, { userId: newUserId });
      }
    }
  },
});

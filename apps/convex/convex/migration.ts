import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const migrateUserData = internalMutation({
  args: {
    oldUserId: v.string(),
    newUserId: v.string(),
  },
  handler: async (ctx, { oldUserId, newUserId }) => {
    console.log(`[migration] migrating user data: ${oldUserId} → ${newUserId}`);

    // Pre-fetch all old user data upfront
    const oldPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    const oldTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    const oldSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    const oldProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();

    // Idempotency guard: if oldUser has no data, migration already ran
    if (!oldPrefs && oldTasks.length === 0 && !oldSettings && !oldProgress) {
      console.log(`[migration] no data found for ${oldUserId}, skipping (already migrated?)`);
      return;
    }

    // Migrate userPreferences
    if (oldPrefs) {
      console.log(`[migration] found preferences for old user, migrating`);
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldPrefs._id);
      } else {
        await ctx.db.patch(oldPrefs._id, { userId: newUserId });
      }
    }

    // Migrate tasks
    console.log(`[migration] migrating ${oldTasks.length} tasks`);
    for (const task of oldTasks) {
      await ctx.db.patch(task._id, { userId: newUserId });
    }

    // Migrate userSettings
    if (oldSettings) {
      const existing = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldSettings._id);
      } else {
        await ctx.db.patch(oldSettings._id, { userId: newUserId });
      }
    }

    // Migrate userProgress
    if (oldProgress) {
      const existing = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldProgress._id);
      } else {
        await ctx.db.patch(oldProgress._id, { userId: newUserId });
      }
    }
  },
});

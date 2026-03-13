import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

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

    console.log(`[migration] lookup results for oldUserId "${oldUserId}":`, {
      hasPrefs: !!oldPrefs,
      prefsUserId: oldPrefs?.userId,
      taskCount: oldTasks.length,
      hasSettings: !!oldSettings,
      hasProgress: !!oldProgress,
    });

    // Idempotency guard: if oldUser has no data, migration already ran (and was cleaned up)
    if (!oldPrefs && oldTasks.length === 0 && !oldSettings && !oldProgress) {
      console.log(`[migration] no data found for ${oldUserId}, skipping (already migrated?)`);
      return;
    }

    // Also check: if new user already has preferences, migration already ran
    // (old records may still exist before scheduled cleanup)
    const newPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", newUserId))
      .first();
    if (newPrefs?.onboardingCompleted) {
      console.log(`[migration] new user already has completed onboarding, skipping`);
      return;
    }

    // Migrate userPreferences
    // Strategy: COPY to new user but keep old record intact.
    // The client's Convex JWT may still reference the old userId during the
    // session transition after account linking. If we delete/move the old record,
    // needsOnboarding returns true with the stale JWT → false onboarding redirect.
    // Keeping the old record prevents this race condition.
    if (oldPrefs) {
      console.log(`[migration] found preferences for old user, copying to new user`);
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        // Merge critical flags from old prefs into existing new user prefs
        const patch: Record<string, unknown> = {};
        if (oldPrefs.onboardingCompleted && !existing.onboardingCompleted) {
          patch.onboardingCompleted = true;
        }
        if (!existing.name && oldPrefs.name) patch.name = oldPrefs.name;
        if ((!existing.bestWorkTimes || existing.bestWorkTimes.length === 0) && oldPrefs.bestWorkTimes?.length > 0) {
          patch.bestWorkTimes = oldPrefs.bestWorkTimes;
        }
        if ((!existing.difficulties || existing.difficulties.length === 0) && oldPrefs.difficulties?.length > 0) {
          patch.difficulties = oldPrefs.difficulties;
        }
        if ((!existing.strengths || existing.strengths.length === 0) && oldPrefs.strengths?.length > 0) {
          patch.strengths = oldPrefs.strengths;
        }
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
        }
        // Keep old record — it will be orphaned when anonymous session expires
      } else {
        // Insert a copy for the new user; keep old record for stale JWT
        const { _id, _creationTime, userId: _oldUid, ...prefsData } = oldPrefs;
        await ctx.db.insert("userPreferences", {
          ...prefsData,
          userId: newUserId,
        });
      }
    }

    // Migrate tasks — copy to new user, keep old copies for stale JWT
    console.log(`[migration] copying ${oldTasks.length} tasks to new user`);
    for (const task of oldTasks) {
      const { _id, _creationTime, userId: _oldUid, ...taskData } = task;
      await ctx.db.insert("tasks", { ...taskData, userId: newUserId });
    }

    // Migrate userSettings
    if (oldSettings) {
      const existing = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (!existing) {
        const { _id, _creationTime, userId: _oldUid, ...settingsData } = oldSettings;
        await ctx.db.insert("userSettings", { ...settingsData, userId: newUserId });
      }
      // Keep old record for stale JWT
    }

    // Migrate userProgress
    if (oldProgress) {
      const existing = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (!existing) {
        const { _id, _creationTime, userId: _oldUid, ...progressData } = oldProgress;
        await ctx.db.insert("userProgress", { ...progressData, userId: newUserId });
      }
      // Keep old record for stale JWT
    }

    // Migrate subscriptions
    const oldSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldSub) {
      const existingSub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (!existingSub) {
        const { _id, _creationTime, userId: _oldUid, ...subData } = oldSub;
        await ctx.db.insert("subscriptions", { ...subData, userId: newUserId });
      }
    }

    // Migrate aiCredits
    const oldCredits = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldCredits) {
      const existingCredits = await ctx.db
        .query("aiCredits")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (!existingCredits) {
        const { _id, _creationTime, userId: _oldUid, ...creditData } = oldCredits;
        await ctx.db.insert("aiCredits", { ...creditData, userId: newUserId });
      }
    }

    // Migrate streaks
    const oldStreak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldStreak) {
      const existingStreak = await ctx.db
        .query("streaks")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (!existingStreak) {
        const { _id, _creationTime, userId: _oldUid, ...streakData } = oldStreak;
        await ctx.db.insert("streaks", { ...streakData, userId: newUserId });
      }
    }

    // Migrate achievements
    const oldAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    for (const ach of oldAchievements) {
      const exists = await ctx.db
        .query("achievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", newUserId).eq("achievementId", ach.achievementId),
        )
        .first();
      if (!exists) {
        const { _id, _creationTime, userId: _oldUid, ...achData } = ach;
        await ctx.db.insert("achievements", { ...achData, userId: newUserId });
      }
    }

    console.log(`[migration] migration complete: data copied from ${oldUserId} to ${newUserId}`);

    // Schedule cleanup of orphaned old records after JWT has refreshed
    await ctx.scheduler.runAfter(30_000, internal.migration.cleanupOldUserData, {
      oldUserId,
    });
  },
});

export const cleanupOldUserData = internalMutation({
  args: { oldUserId: v.string() },
  handler: async (ctx, { oldUserId }) => {
    console.log(`[migration] cleaning up orphaned data for ${oldUserId}`);

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (prefs) await ctx.db.delete(prefs._id);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (settings) await ctx.db.delete(settings._id);

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (progress) await ctx.db.delete(progress._id);

    const oldSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldSub) await ctx.db.delete(oldSub._id);

    const oldCredits = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldCredits) await ctx.db.delete(oldCredits._id);

    const oldStreak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    if (oldStreak) await ctx.db.delete(oldStreak._id);

    const oldAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    for (const a of oldAchievements) {
      await ctx.db.delete(a._id);
    }

    const oldCoachLogs = await ctx.db
      .query("coachNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    for (const log of oldCoachLogs) {
      await ctx.db.delete(log._id);
    }

    console.log(`[migration] cleanup complete for ${oldUserId}`);
  },
});

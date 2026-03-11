import { v, ConvexError } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import {
  assertMaxLength,
  assertArrayLimits,
  MAX_NAME,
  MAX_PREF_ITEM,
  MAX_PREF_ARRAY,
} from "./lib/validation";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const needsOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = identity.subject;

    // Has preferences with onboarding completed? Skip.
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (prefs?.onboardingCompleted) return false;

    // Has existing data (tasks or progress)? They're a pre-onboarding user. Skip.
    const hasTask = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (hasTask) return false;

    const hasProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (hasProgress) return false;

    // New user with no data and no completed onboarding
    return true;
  },
});

export const getByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    bestWorkTimes: v.array(v.string()),
    difficulties: v.array(v.string()),
    strengths: v.array(v.string()),
    notificationsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const { notificationsEnabled, ...prefsArgs } = args;

    assertMaxLength(prefsArgs.name, MAX_NAME, "name");
    assertArrayLimits(prefsArgs.difficulties, MAX_PREF_ARRAY, MAX_PREF_ITEM, "difficulties");
    assertArrayLimits(prefsArgs.strengths, MAX_PREF_ARRAY, MAX_PREF_ITEM, "strengths");
    assertArrayLimits(prefsArgs.bestWorkTimes, MAX_PREF_ARRAY, MAX_PREF_ITEM, "bestWorkTimes");

    const userId = identity.subject;

    // Save user preferences
    const existingPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        ...prefsArgs,
        onboardingCompleted: true,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...prefsArgs,
        onboardingCompleted: true,
      });
    }

    // Ensure userSettings row exists with notification preference
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { notificationsEnabled });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        aiEnabled: true,
        userAiEnabled: true,
        notificationsEnabled,
      });
    }
  },
});

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    bestWorkTimes: v.optional(v.array(v.string())),
    difficulties: v.optional(v.array(v.string())),
    strengths: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) throw new ConvexError("No preferences found");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      assertMaxLength(args.name, MAX_NAME, "name");
      patch.name = args.name;
    }
    if (args.bestWorkTimes !== undefined) {
      assertArrayLimits(args.bestWorkTimes, MAX_PREF_ARRAY, MAX_PREF_ITEM, "bestWorkTimes");
      patch.bestWorkTimes = args.bestWorkTimes;
    }
    if (args.difficulties !== undefined) {
      assertArrayLimits(args.difficulties, MAX_PREF_ARRAY, MAX_PREF_ITEM, "difficulties");
      patch.difficulties = args.difficulties;
    }
    if (args.strengths !== undefined) {
      assertArrayLimits(args.strengths, MAX_PREF_ARRAY, MAX_PREF_ITEM, "strengths");
      patch.strengths = args.strengths;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
  },
});

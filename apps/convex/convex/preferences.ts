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

export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { notificationsEnabled: enabled });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        name: "",
        bestWorkTimes: [],
        difficulties: [],
        strengths: [],
        notificationsEnabled: enabled,
        onboardingCompleted: false,
      });
    }
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

    assertMaxLength(args.name, MAX_NAME, "name");
    assertArrayLimits(args.difficulties, MAX_PREF_ARRAY, MAX_PREF_ITEM, "difficulties");
    assertArrayLimits(args.strengths, MAX_PREF_ARRAY, MAX_PREF_ITEM, "strengths");
    assertArrayLimits(args.bestWorkTimes, MAX_PREF_ARRAY, MAX_PREF_ITEM, "bestWorkTimes");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        onboardingCompleted: true,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...args,
        onboardingCompleted: true,
      });
    }
  },
});

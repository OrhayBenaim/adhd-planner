import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const DEFAULTS = {
  aiEnabled: true,
  userAiEnabled: true,
  notificationsEnabled: false,
} as const;

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const setUserAiEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { userAiEnabled: enabled });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULTS,
        userAiEnabled: enabled,
      });
    }
  },
});

export const registerDeviceId = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      if (existing.deviceId !== deviceId) {
        await ctx.db.patch(existing._id, { deviceId });
      }
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULTS,
        deviceId,
      });
    }
  },
});

export const getDeviceId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.deviceId ?? null;
  },
});

export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { notificationsEnabled: enabled });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        ...DEFAULTS,
        notificationsEnabled: enabled,
      });
    }
  },
});
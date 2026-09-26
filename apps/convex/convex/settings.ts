import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { upsertUserSetting } from "./lib/upsert";

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
    await upsertUserSetting(ctx, userId, { userAiEnabled: enabled });
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
    // Skip patch if deviceId unchanged
    if (existing?.deviceId === deviceId) return;
    await upsertUserSetting(ctx, userId, { deviceId });
  },
});

export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    await upsertUserSetting(ctx, userId, { notificationsEnabled: enabled });
  },
});

export const setCoachNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    await upsertUserSetting(ctx, userId, { coachNotificationsEnabled: enabled });
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

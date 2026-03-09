import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertMaxLength, MAX_STT_MODEL, MAX_STT_LOCALE } from "./lib/validation";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const setUserAiEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { userAiEnabled: enabled });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        aiEnabled: true,
        userAiEnabled: enabled,
      });
    }
  },
});

export const setSttSettings = mutation({
  args: {
    sttModel: v.optional(v.string()),
    sttLocale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    if (args.sttModel !== undefined) {
      assertMaxLength(args.sttModel, MAX_STT_MODEL, "sttModel");
    }
    if (args.sttLocale !== undefined) {
      assertMaxLength(args.sttLocale, MAX_STT_LOCALE, "sttLocale");
    }

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch: Record<string, string | undefined> = {};
    if (args.sttModel !== undefined) patch.sttModel = args.sttModel;
    if (args.sttLocale !== undefined) patch.sttLocale = args.sttLocale;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        aiEnabled: true,
        ...patch,
      });
    }
  },
});

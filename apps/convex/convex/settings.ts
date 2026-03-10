import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

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

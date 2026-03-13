import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const isPremium = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return sub?.isActive ?? false;
  },
});

export const upsertFromWebhook = internalMutation({
  args: {
    userId: v.string(),
    revenueCatId: v.string(),
    entitlement: v.string(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),
    productId: v.optional(v.string()),
    periodType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_rc_id", (q) => q.eq("revenueCatId", args.revenueCatId))
      .first();

    if (!existing) {
      existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        expiresAt: args.expiresAt,
        productId: args.productId,
        periodType: args.periodType,
      });
    } else {
      await ctx.db.insert("subscriptions", args);
    }
  },
});

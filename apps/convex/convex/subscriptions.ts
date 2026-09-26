import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { isSubscriptionActive } from "./lib/subscriptionStatus";

const subscriptionStatusValidator = v.union(
  v.object({
    isActive: v.boolean(),
    expiresAt: v.union(v.string(), v.null()),
  }),
  v.null(),
);

export const getStatus = query({
  args: { nowMs: v.number() },
  returns: subscriptionStatusValidator,
  handler: async (ctx, { nowMs }) => {
    const userId = await requireAuth(ctx);
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!sub) return null;

    return {
      isActive: isSubscriptionActive(sub, nowMs),
      expiresAt: sub.expiresAt ?? null,
    };
  },
});

export const isPremium = internalQuery({
  args: { userId: v.string(), nowMs: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { userId, nowMs }) => {
    return await checkPremium(ctx, userId, nowMs);
  },
});

export async function checkPremium(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  nowMs: number,
): Promise<boolean> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return isSubscriptionActive(sub, nowMs);
}

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

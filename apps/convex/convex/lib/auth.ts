import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { isSubscriptionActive } from "./subscriptionStatus";

/**
 * Require authenticated user identity. Throws ConvexError if unauthenticated.
 * Returns the userId (identity.subject).
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}

/**
 * Check if user has active premium subscription.
 */
export async function checkPremium(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return isSubscriptionActive(sub, nowMs);
}

/**
 * Require active premium subscription. Throws ConvexError if not premium.
 */
export async function requirePremium(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const premium = await checkPremium(ctx, userId, nowMs);
  if (!premium) {
    throw new ConvexError("Premium subscription required");
  }
}

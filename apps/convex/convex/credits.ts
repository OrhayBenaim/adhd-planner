import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/** Owns every write to aiCredits. */
export async function addCreditsToUser(
  ctx: MutationCtx,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;

  const existing = await ctx.db
    .query("aiCredits")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      balance: existing.balance + amount,
    });
  } else {
    await ctx.db.insert("aiCredits", { userId, balance: amount });
  }
}

export const getMyBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const row = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row?.balance ?? 0;
  },
});

export const getBalance = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row?.balance ?? 0;
  },
});

export const addCredits = internalMutation({
  args: { userId: v.string(), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, { userId, amount }) => {
    await addCreditsToUser(ctx, userId, amount);
    return null;
  },
});

export const deductCredits = internalMutation({
  args: { userId: v.string(), amount: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { userId, amount }) => {
    const existing = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing || existing.balance < amount) {
      return false;
    }

    await ctx.db.patch(existing._id, {
      balance: existing.balance - amount,
    });
    return true;
  },
});

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const getMyBalance = query({
  args: {},
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
  handler: async (ctx, { userId, amount }) => {
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
  },
});

export const deductCredits = internalMutation({
  args: { userId: v.string(), amount: v.number() },
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

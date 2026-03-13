import { v, ConvexError } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

const DEFAULTS: Record<string, number> = {
  freeTierCostCeiling: 1.0,
  premiumTierCostCeiling: 10.0,
  aiCreditValue: 0.5,
  maxCoachNotificationsPerDay: 3,
};

export const get = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? DEFAULTS[key] ?? 0;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const rows = await ctx.db.query("appConfig").collect();
    const config: Record<string, number> = { ...DEFAULTS };
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.number() },
  handler: async (ctx, { key, value }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    // TODO: Add admin check when admin roles are implemented

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("appConfig", { key, value });
    }
  },
});

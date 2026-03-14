import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";

// Default values — used when no config row exists in the dashboard
const DEFAULTS: Record<string, number> = {
  freeTierCostCeiling: 1.0,
  premiumTierCostCeiling: 10.0,
  aiCreditValue: 0.5,
  maxCoachNotificationsPerDay: 3,
  aiPickDaysAhead: 7,
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

export const getPublic = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? DEFAULTS[key] ?? 0;
  },
});

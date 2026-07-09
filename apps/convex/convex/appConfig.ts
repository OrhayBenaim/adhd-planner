import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { appConfigDefault } from "./lib/appConfigDefaults";

export const get = internalQuery({
  args: { key: v.string() },
  returns: v.number(),
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? appConfigDefault(key);
  },
});

export const getPublic = query({
  args: { key: v.string() },
  returns: v.number(),
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? appConfigDefault(key);
  },
});

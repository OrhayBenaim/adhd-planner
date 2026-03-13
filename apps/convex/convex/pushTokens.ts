import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const register = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, { token, platform }) => {
    const userId = await requireAuth(ctx);

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { token, platform });
    } else {
      await ctx.db.insert("pushTokens", { userId, token, platform });
    }
  },
});

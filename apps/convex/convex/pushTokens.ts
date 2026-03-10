import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";

export const register = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, { token, platform }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const userId = identity.subject;

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

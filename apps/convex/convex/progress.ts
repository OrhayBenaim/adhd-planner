// apps/convex/convex/progress.ts
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return progress ?? { level: 1, points: 0, pointsToNextLevel: 50 };
  },
});

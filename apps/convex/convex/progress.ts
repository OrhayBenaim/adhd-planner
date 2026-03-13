// apps/convex/convex/progress.ts
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return progress ?? { level: 1, points: 0, pointsToNextLevel: 50 };
  },
});

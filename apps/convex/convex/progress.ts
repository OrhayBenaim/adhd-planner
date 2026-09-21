import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const progressShape = {
  level: 1,
  points: 0,
  pointsToNextLevel: 50,
};

function nextLevelThreshold(level: number): number {
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

export type AwardPointsResult = {
  progress: {
    level: number;
    points: number;
    pointsToNextLevel: number;
  };
  leveledUp: boolean;
};

/** Owns every write to userProgress. */
export async function awardPoints(
  ctx: MutationCtx,
  userId: string,
  amount: number,
): Promise<AwardPointsResult> {
  const existing = await ctx.db
    .query("userProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const current = existing ?? {
    level: progressShape.level,
    points: progressShape.points,
    pointsToNextLevel: progressShape.pointsToNextLevel,
  };

  if (amount <= 0) {
    return { progress: current, leveledUp: false };
  }

  let { level, points, pointsToNextLevel } = current;
  const startLevel = level;
  points += amount;

  while (points >= pointsToNextLevel) {
    level += 1;
    points -= pointsToNextLevel;
    pointsToNextLevel = nextLevelThreshold(level);
  }

  const next = { level, points, pointsToNextLevel };
  if (existing) {
    await ctx.db.patch(existing._id, next);
  } else {
    await ctx.db.insert("userProgress", { userId, ...next });
  }

  return { progress: next, leveledUp: level > startLevel };
}

export const get = query({
  args: {},
  returns: v.object({
    level: v.number(),
    points: v.number(),
    pointsToNextLevel: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const { level, points, pointsToNextLevel } = progress ?? progressShape;
    return { level, points, pointsToNextLevel };
  },
});

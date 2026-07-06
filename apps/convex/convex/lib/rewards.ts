import type { MutationCtx } from "../_generated/server";

function nextLevelThreshold(level: number): number {
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

/** Grant bonus XP (survey reward). Internal use only. */
export async function grantPoints(
  ctx: MutationCtx,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;

  const existing = await ctx.db
    .query("userProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const current = existing ?? { level: 1, points: 0, pointsToNextLevel: 50 };
  let { level, points, pointsToNextLevel } = current;
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
}

/** Grant AI credits. Internal use only. */
export async function grantCredits(
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

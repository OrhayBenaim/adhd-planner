// apps/convex/convex/tasks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

async function requireAuth(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}

function calcPointsEarned(difficulty: number): number {
  return Math.round(difficulty / 10) + 1;
}

function nextLevelThreshold(level: number): number {
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return ctx.db.insert("tasks", {
      ...args,
      userId,
      completed: false,
    });
  },
});

export const completeTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);

    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");

    await ctx.db.patch(id, { completed: true });

    // Award points — atomic with task completion
    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const current = existing ?? { level: 1, points: 0, pointsToNextLevel: 50 };
    const earned = calcPointsEarned(task.difficulty);
    let { level, points, pointsToNextLevel } = current;
    points += earned;
    let leveledUp = false;

    if (points >= pointsToNextLevel) {
      level += 1;
      points -= pointsToNextLevel;
      pointsToNextLevel = nextLevelThreshold(level);
      leveledUp = true;
    }

    const next = { level, points, pointsToNextLevel };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert("userProgress", { userId, ...next });
    }

    return { earned, leveledUp, progress: next };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");
    await ctx.db.delete(id);
  },
});

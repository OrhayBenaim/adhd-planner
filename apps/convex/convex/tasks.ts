// apps/convex/convex/tasks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import {
  assertMaxLength,
  assertDateFormat,
  assertTimeFormat,
  MAX_TITLE,
  MAX_DESCRIPTION,
} from "./lib/validation";
import { normalizedLevenshtein } from "./lib/levenshtein";

const RESCORE_THRESHOLD = 0.3;

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
    const all = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all.filter((t) => !t.completed);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.string(),
    dueTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    assertMaxLength(args.title, MAX_TITLE, "title");
    if (args.description) {
      assertMaxLength(args.description, MAX_DESCRIPTION, "description");
    }
    assertDateFormat(args.dueDate);
    assertTimeFormat(args.dueTime);

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      userId,
      difficulty: -1,
      completed: false,
    });

    // Schedule AI difficulty scoring in the background
    await ctx.scheduler.runAfter(0, internal.ai.scoreTaskDifficulty, {
      taskId,
      userId,
      title: args.title,
    });

    return taskId;
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

    // Update streak and check achievements in background
    await ctx.scheduler.runAfter(
      0,
      internal.streaks.updateOnCompletion,
      { userId },
    );
    await ctx.scheduler.runAfter(
      0,
      internal.achievementDefs.checkOnTaskComplete,
      { userId, taskDifficulty: task.difficulty, newLevel: next.level },
    );

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

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    dueDate: v.string(),
    dueTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");

    assertMaxLength(args.title, MAX_TITLE, "title");
    assertDateFormat(args.dueDate);
    assertTimeFormat(args.dueTime);

    const oldTitle = task.title;
    await ctx.db.patch(args.id, {
      title: args.title,
      dueDate: args.dueDate,
      dueTime: args.dueTime,
    });

    // Re-score difficulty if title changed significantly
    const diff = normalizedLevenshtein(oldTitle, args.title);
    if (diff >= RESCORE_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.ai.scoreTaskDifficulty, {
        taskId: args.id,
        userId,
        title: args.title,
      });
    }
  },
});

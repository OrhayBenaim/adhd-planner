// apps/convex/convex/tasks.ts
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  assertMaxLength,
  assertDateFormat,
  assertTimeFormat,
  MAX_TITLE,
  MAX_DESCRIPTION,
} from "./lib/validation";
import { normalizedLevenshtein } from "./lib/levenshtein";
import { requireAuth } from "./lib/auth";
import { clearSelectedTaskIfMatches } from "./userSessionState";
import { awardPoints } from "./progress";

const RESCORE_THRESHOLD = 0.3;

function calcPointsEarned(difficulty: number): number {
  return Math.round(difficulty / 10) + 1;
}

const completeTaskReturns = v.object({
  earned: v.number(),
  leveledUp: v.boolean(),
  progress: v.object({
    level: v.number(),
    points: v.number(),
    pointsToNextLevel: v.number(),
  }),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", userId).eq("completed", false),
      )
      .collect();
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
  returns: completeTaskReturns,
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);

    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");

    await ctx.db.patch(id, { completed: true });

    await clearSelectedTaskIfMatches(ctx, userId, id);

    const earned = calcPointsEarned(task.difficulty);
    const { progress, leveledUp } = await awardPoints(ctx, userId, earned);

    await ctx.scheduler.runAfter(
      0,
      internal.streaks.updateOnCompletion,
      { userId },
    );
    await ctx.scheduler.runAfter(
      0,
      internal.achievementDefs.checkOnTaskComplete,
      { userId, taskDifficulty: task.difficulty, newLevel: progress.level },
    );

    return { earned, leveledUp, progress };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");
    await clearSelectedTaskIfMatches(ctx, userId, id);
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

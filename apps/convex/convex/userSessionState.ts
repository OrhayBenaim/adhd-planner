import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAuth } from "./lib/auth";

async function getSessionRow(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("userSessionState")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

async function validateSelectedTask(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  taskId: Id<"tasks">,
): Promise<boolean> {
  const task = await ctx.db.get("tasks", taskId);
  return !!task && task.userId === userId && !task.completed;
}

export const get = query({
  args: {},
  returns: v.object({ selectedTaskId: v.union(v.id("tasks"), v.null()) }),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const row = await getSessionRow(ctx, userId);
    if (!row?.selectedTaskId) {
      return { selectedTaskId: null };
    }

    const valid = await validateSelectedTask(ctx, userId, row.selectedTaskId);
    if (valid) {
      return { selectedTaskId: row.selectedTaskId };
    }

    return { selectedTaskId: null };
  },
});

export const setSelectedTask = mutation({
  args: { taskId: v.union(v.id("tasks"), v.null()) },
  returns: v.null(),
  handler: async (ctx, { taskId }) => {
    const userId = await requireAuth(ctx);

    if (taskId !== null) {
      const valid = await validateSelectedTask(ctx, userId, taskId);
      if (!valid) {
        throw new ConvexError("Task not found or not selectable");
      }
    }

    const now = Date.now();
    const existing = await getSessionRow(ctx, userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedTaskId: taskId ?? undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSessionState", {
        userId,
        selectedTaskId: taskId ?? undefined,
        updatedAt: now,
      });
    }
    return null;
  },
});

/** Used by migration to remap selectedTaskId after task copy. */
export async function upsertSelectedTaskId(
  ctx: MutationCtx,
  userId: string,
  selectedTaskId: Id<"tasks"> | undefined,
): Promise<void> {
  const now = Date.now();
  const existing = await getSessionRow(ctx, userId);
  if (existing) {
    await ctx.db.patch(existing._id, {
      selectedTaskId,
      updatedAt: now,
    });
  } else if (selectedTaskId) {
    await ctx.db.insert("userSessionState", {
      userId,
      selectedTaskId,
      updatedAt: now,
    });
  }
}

export async function clearSelectedTaskIfMatches(
  ctx: MutationCtx,
  userId: string,
  taskId: Id<"tasks">,
): Promise<void> {
  const row = await getSessionRow(ctx, userId);
  if (row?.selectedTaskId === taskId) {
    await ctx.db.patch(row._id, {
      selectedTaskId: undefined,
      updatedAt: Date.now(),
    });
  }
}

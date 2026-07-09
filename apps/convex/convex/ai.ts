import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { sanitizeForPrompt, MAX_TITLE } from "./lib/validation";
import { sentryCaptureEvent } from "./lib/sentry";
import { requireAuth } from "./lib/auth";
import { evaluateBudget } from "./lib/aiBudget";
import { callOpenRouterChat, tryParseJson } from "./lib/openRouter";

const TASK_SCORING_MODEL = "@preset/task-scoring";

const ceilingStatusReturns = v.union(
  v.object({ atCeiling: v.literal(false) }),
  v.object({
    atCeiling: v.literal(true),
    reason: v.string(),
  }),
);

const budgetReturns = v.object({
  aiEnabled: v.boolean(),
  rateLimited: v.boolean(),
  allowed: v.boolean(),
  atCeiling: v.boolean(),
  creditsWillBeUsed: v.boolean(),
  deviceId: v.union(v.string(), v.null()),
  monthKey: v.string(),
  monthlyCost: v.number(),
  ceiling: v.number(),
  creditBalance: v.number(),
});

export const checkBudget = internalQuery({
  args: { userId: v.string(), nowMs: v.number() },
  returns: budgetReturns,
  handler: async (ctx, { userId, nowMs }) => {
    return await evaluateBudget(ctx, { userId, nowMs });
  },
});

export const getCeilingStatus = query({
  args: { nowMs: v.number() },
  returns: ceilingStatusReturns,
  handler: async (ctx, { nowMs }) => {
    const userId = await requireAuth(ctx);
    const budget = await evaluateBudget(ctx, { userId, nowMs });

    if (!budget.aiEnabled) {
      return { atCeiling: false as const };
    }

    if (!budget.atCeiling || budget.creditBalance > 0) {
      return { atCeiling: false as const };
    }

    return {
      atCeiling: true as const,
      reason: "Monthly AI scoring limit reached",
    };
  },
});

export const updateTaskDifficulty = internalMutation({
  args: {
    taskId: v.id("tasks"),
    difficulty: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { taskId, difficulty }) => {
    await ctx.db.patch(taskId, { difficulty });
    return null;
  },
});

export const logScoringAudit = internalMutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    taskTitle: v.string(),
    score: v.number(),
    reason: v.string(),
    model: v.optional(v.string()),
    cost: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("aiScoringAudit", args);
    return null;
  },
});

export const getUserModelOverride = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.modelOverride ?? null;
  },
});

export const getLifetimeCost = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_user_month", (q) => q.eq("userId", userId))
      .collect();
    return rows.reduce((sum, r) => sum + r.totalCost, 0);
  },
});

/** @deprecated Use getLifetimeCost instead. Kept for backward compat until userCosts table cleanup. */
export const accumulateUserCost = internalMutation({
  args: { userId: v.string(), cost: v.number() },
  returns: v.number(),
  handler: async (ctx, { userId, cost }) => {
    const existing = await ctx.db
      .query("userCosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalCost: existing.totalCost + cost,
      });
      return existing.totalCost + cost;
    }

    await ctx.db.insert("userCosts", { userId, totalCost: cost });
    return cost;
  },
});

export const accumulateMonthlyAiCost = internalMutation({
  args: {
    userId: v.string(),
    month: v.string(),
    cost: v.number(),
    deviceId: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, { userId, month, cost, deviceId }) => {
    const existing = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", userId).eq("month", month),
      )
      .first();

    if (existing) {
      const patch: { totalCost: number; deviceId?: string } = {
        totalCost: existing.totalCost + cost,
      };
      if (deviceId && !existing.deviceId) {
        patch.deviceId = deviceId;
      }
      await ctx.db.patch(existing._id, patch);
      return existing.totalCost + cost;
    }

    await ctx.db.insert("monthlyAiCosts", {
      userId,
      month,
      totalCost: cost,
      ...(deviceId ? { deviceId } : {}),
    });
    return cost;
  },
});

export const scoreTaskDifficulty = internalAction({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { taskId, userId, title }) => {
    const nowMs = Date.now();
    const budget = await ctx.runQuery(internal.ai.checkBudget, { userId, nowMs });

    if (!budget.allowed) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      if (budget.rateLimited) {
        await sentryCaptureEvent(
          "warning",
          `[AI] rate limit exceeded for user ${userId}, task ${taskId} set to 0`,
          { userId, taskId },
        );
      }
      return null;
    }

    const sanitizedTitle = sanitizeForPrompt(title).slice(0, MAX_TITLE);
    const prefs = await ctx.runQuery(internal.preferences.getByUserId, { userId });

    let systemPrompt =
      "You are a task difficulty scorer for an ADHD planner app. " +
      "Given a task title, rate its difficulty from 0 to 100. " +
      "0 = trivially easy (e.g. drink water), 100 = extremely difficult (e.g. write a thesis). " +
      "Consider cognitive load, time required, and executive function demand. " +
      'Respond with JSON only: {"score": <number>, "reason": "<1-2 sentence explanation>"}';

    if (prefs) {
      const difficulties = prefs.difficulties.map(sanitizeForPrompt).join(", ");
      const strengths = prefs.strengths.map(sanitizeForPrompt).join(", ");
      const bestWorkTimes = prefs.bestWorkTimes.map(sanitizeForPrompt).join(", ");

      systemPrompt +=
        "\n\nUser context:" +
        `\n- Finds these challenging: ${difficulties}` +
        `\n- Enjoys and is good at: ${strengths}` +
        `\n- Most productive during: ${bestWorkTimes}` +
        "\n\nUse this context to personalize the difficulty score. " +
        "Tasks related to their challenges should score higher. " +
        "Tasks aligned with their strengths should score lower.";
    }

    try {
      const llm = await callOpenRouterChat({
        model: TASK_SCORING_MODEL,
        systemPrompt,
        userPrompt: sanitizedTitle,
      });

      if (!llm.ok) {
        throw new Error(llm.message);
      }

      let score: number;
      let reason: string;

      const parsed = tryParseJson(llm.rawText);
      if (
        parsed &&
        typeof parsed === "object" &&
        "score" in parsed &&
        typeof (parsed as { score: unknown }).score === "number"
      ) {
        const obj = parsed as { score: number; reason?: string };
        score = obj.score;
        reason = obj.reason ?? "";
      } else {
        score = parseInt(llm.rawText, 10);
        reason = "";
      }

      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Invalid score from AI: "${llm.rawText}"`);
      }

      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: score });
      await ctx.runMutation(internal.ai.logScoringAudit, {
        taskId,
        userId,
        taskTitle: title,
        score,
        reason: reason.slice(0, 1000),
        model: llm.model,
        cost: llm.cost,
      });

      if (llm.cost > 0) {
        if (budget.creditsWillBeUsed) {
          await ctx.runMutation(internal.credits.deductCredits, {
            userId,
            amount: llm.cost,
          });
        }

        await ctx.runMutation(internal.ai.accumulateMonthlyAiCost, {
          userId,
          month: budget.monthKey,
          cost: llm.cost,
          ...(budget.deviceId ? { deviceId: budget.deviceId } : {}),
        });

        const newTotal = await ctx.runQuery(internal.ai.getLifetimeCost, {
          userId,
        });

        const threshold = parseFloat(process.env.COST_ALERT_THRESHOLD ?? "20");
        if (newTotal >= threshold) {
          await sentryCaptureEvent(
            "error",
            `[COST ALERT] User ${userId} total cost $${newTotal.toFixed(4)} exceeds threshold $${threshold}`,
            { userId, totalCost: newTotal, threshold },
          );
        }
      }
    } catch (error) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      await ctx.runMutation(internal.ai.logScoringAudit, {
        taskId,
        userId,
        taskTitle: title,
        score: 0,
        reason: `Error: ${(error instanceof Error ? error.message : String(error)).slice(0, 1000)}`,
      });
      await sentryCaptureEvent(
        "error",
        `[AI] scoring failed for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
        { taskId, userId },
      );
    }

    return null;
  },
});

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { sanitizeForPrompt, MAX_TITLE } from "./lib/validation";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SCORES_PER_WINDOW = 10;

export const updateTaskDifficulty = internalMutation({
  args: {
    taskId: v.id("tasks"),
    difficulty: v.number(),
  },
  handler: async (ctx, { taskId, difficulty }) => {
    await ctx.db.patch(taskId, { difficulty });
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
  handler: async (ctx, args) => {
    await ctx.db.insert("aiScoringAudit", args);
  },
});

export const getUserModelOverride = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.modelOverride ?? undefined;
  },
});

export const accumulateUserCost = internalMutation({
  args: { userId: v.string(), cost: v.number() },
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
    } else {
      await ctx.db.insert("userCosts", { userId, totalCost: cost });
      return cost;
    }
  },
});

export const getUserAiEnabled = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Admin override takes priority, then user preference
    const adminEnabled = settings?.aiEnabled ?? true;
    const userEnabled = settings?.userAiEnabled ?? true;
    return adminEnabled && userEnabled;
  },
});

export const countRecentScores = internalQuery({
  args: { userId: v.string(), since: v.number() },
  handler: async (ctx, { userId, since }) => {
    const recent = await ctx.db
      .query("aiScoringAudit")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("_creationTime"), since),
        ),
      )
      .collect();
    return recent.length;
  },
});

export const scoreTaskDifficulty = internalAction({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { taskId, userId, title }) => {
    // Check kill switch
    const settings = await ctx.runQuery(internal.ai.getUserAiEnabled, { userId });
    if (!settings) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      console.warn(`[AI] aiEnabled=false for user ${userId}, task ${taskId} set to 0`);
      return;
    }

    // Per-user rate limit
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recentCount = await ctx.runQuery(internal.ai.countRecentScores, {
      userId,
      since: windowStart,
    });
    if (recentCount >= MAX_SCORES_PER_WINDOW) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      console.warn(`[AI] rate limit exceeded for user ${userId}, task ${taskId} set to 0`);
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      console.error(`[AI] OPENROUTER_API_KEY not set, task ${taskId} set to 0`);
      return;
    }

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

    const sanitizedTitle = sanitizeForPrompt(title).slice(0, MAX_TITLE);

    // Read model override for this user
    const modelOverride = await ctx.runQuery(internal.ai.getUserModelOverride, { userId });

    const requestBody: Record<string, unknown> = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sanitizedTitle },
      ],
    };
    if (modelOverride) {
      requestBody.model = modelOverride;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`OpenRouter HTTP ${response.status}: [response redacted]`);
        }
        throw new Error(`OpenRouter HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }

      const data = await response.json();
      let raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      const model = data.model ?? undefined;
      const costFromResponse = data.usage?.total_cost ?? data.usage?.cost ?? 0;

      // Strip markdown code blocks if present
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      let score: number;
      let reason: string;

      try {
        const parsed = JSON.parse(raw);
        score = parsed.score;
        reason = parsed.reason ?? "";
      } catch {
        // Fallback: try parsing as plain number
        score = parseInt(raw, 10);
        reason = "";
      }

      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Invalid score from AI: "${raw}"`);
      }

      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: score });
      await ctx.runMutation(internal.ai.logScoringAudit, {
        taskId,
        userId,
        taskTitle: title,
        score,
        reason: reason.slice(0, 1000),
        model,
        cost: costFromResponse,
      });

      if (costFromResponse > 0) {
        const newTotal = await ctx.runMutation(internal.ai.accumulateUserCost, {
          userId, cost: costFromResponse,
        });

        const threshold = parseFloat(process.env.COST_ALERT_THRESHOLD ?? "20");
        if (newTotal >= threshold) {
          console.error(
            `[COST ALERT] User ${userId} total cost $${newTotal.toFixed(4)} exceeds threshold $${threshold}`,
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
      console.error(`[AI] scoring failed for task ${taskId}:`, error);
    }
  },
});


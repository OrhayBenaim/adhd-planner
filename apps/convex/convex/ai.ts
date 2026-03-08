import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const updateTaskDifficulty = internalMutation({
  args: {
    taskId: v.id("tasks"),
    difficulty: v.number(),
  },
  handler: async (ctx, { taskId, difficulty }) => {
    await ctx.db.patch(taskId, { difficulty });
  },
});

export const getUserAiEnabled = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Default to true if no settings row exists
    return settings?.aiEnabled ?? true;
  },
});

const LABEL_MAP: Record<string, string> = {
  early_morning: "Early morning",
  mid_morning: "Mid-morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  starting_tasks: "Starting tasks",
  finishing_projects: "Finishing projects",
  keeping_track_of_time: "Keeping track of time",
  staying_focused: "Staying focused",
  making_decisions: "Making decisions",
  cooking_meal_prep: "Cooking & meal prep",
  cleaning_tidying: "Cleaning & tidying",
  paying_bills: "Paying bills",
  grocery_shopping: "Grocery shopping",
  exercising: "Exercising",
  creative_work: "Creative work",
  helping_others: "Helping others",
  learning_new_things: "Learning new things",
  problem_solving: "Problem solving",
  quick_small_tasks: "Quick small tasks",
  shopping: "Shopping",
  social_activities: "Social activities",
  reading_research: "Reading & research",
};

function toLabels(ids: string[]): string {
  return ids.map((id) => LABEL_MAP[id] ?? id).join(", ");
}

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
      "Respond with ONLY the number, nothing else.";

    if (prefs) {
      systemPrompt +=
        "\n\nUser context:" +
        `\n- Finds these challenging: ${toLabels(prefs.difficulties)}` +
        `\n- Enjoys and is good at: ${toLabels(prefs.strengths)}` +
        `\n- Most productive during: ${toLabels(prefs.bestWorkTimes)}` +
        "\n\nUse this context to personalize the difficulty score. " +
        "Tasks related to their challenges should score higher. " +
        "Tasks aligned with their strengths should score lower.";
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: title,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      const score = parseInt(raw, 10);

      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Invalid score from AI: "${raw}"`);
      }

      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: score });
    } catch (error) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      console.error(`[AI] scoring failed for task ${taskId}:`, error);
    }
  },
});

export const getStaleScoringTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const allTasks = await ctx.db.query("tasks").collect();
    return allTasks.filter(
      (t) => t.difficulty === -1 && t._creationTime < fiveMinutesAgo
    );
  },
});

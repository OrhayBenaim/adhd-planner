import { v, ConvexError } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { weekStart } from "./lib/calendar";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_step", name: "First Step", description: "Complete your first task", icon: "footsteps-outline" },
  { id: "on_a_roll_3", name: "On a Roll", description: "3-day streak", icon: "flame-outline" },
  { id: "unstoppable_7", name: "Unstoppable", description: "7-day streak", icon: "rocket-outline" },
  { id: "hard_mode", name: "Hard Mode", description: "Complete a task with difficulty 80+", icon: "diamond-outline" },
  { id: "weekly_warrior", name: "Weekly Warrior", description: "Complete 15+ tasks in a week", icon: "shield-outline" },
  { id: "level_5", name: "Rising Star", description: "Reach level 5", icon: "star-outline" },
  { id: "level_10", name: "Veteran", description: "Reach level 10", icon: "star-half-outline" },
  { id: "level_25", name: "Legend", description: "Reach level 25", icon: "star" },
];

export const listDefinitions = query({
  args: {},
  handler: async () => ACHIEVEMENT_DEFS,
});

export const listUnlocked = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

async function tryUnlock(
  ctx: { db: any },
  userId: string,
  achievementId: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_user_achievement", (q: any) =>
      q.eq("userId", userId).eq("achievementId", achievementId),
    )
    .first();

  if (existing) return false;

  await ctx.db.insert("achievements", {
    userId,
    achievementId,
    unlockedAt: Date.now(),
  });
  return true;
}

export const checkOnTaskComplete = internalMutation({
  args: {
    userId: v.string(),
    taskDifficulty: v.number(),
    newLevel: v.number(),
  },
  handler: async (ctx, { userId, taskDifficulty, newLevel }) => {
    const unlocked: string[] = [];

    // First Step
    if (await tryUnlock(ctx, userId, "first_step")) {
      unlocked.push("first_step");
    }

    // Hard Mode
    if (taskDifficulty >= 80) {
      if (await tryUnlock(ctx, userId, "hard_mode")) {
        unlocked.push("hard_mode");
      }
    }

    // Streak achievements — query streaks directly
    const streakRow = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const currentStreak = streakRow?.currentStreak ?? 0;

    if (currentStreak >= 3) {
      if (await tryUnlock(ctx, userId, "on_a_roll_3")) {
        unlocked.push("on_a_roll_3");
      }
    }
    if (currentStreak >= 7) {
      if (await tryUnlock(ctx, userId, "unstoppable_7")) {
        unlocked.push("unstoppable_7");
      }
    }

    // Level achievements
    const levelAchievements = [
      { level: 5, id: "level_5" },
      { level: 10, id: "level_10" },
      { level: 25, id: "level_25" },
    ];
    for (const la of levelAchievements) {
      if (newLevel >= la.level) {
        if (await tryUnlock(ctx, userId, la.id)) {
          unlocked.push(la.id);
        }
      }
    }

    // Weekly warrior — count completions this week
    const mondayMs = new Date(weekStart(Date.now()) + "T00:00:00Z").getTime();

    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.gte(q.field("_creationTime"), mondayMs),
        ),
      )
      .collect();

    if (weekTasks.length >= 15) {
      if (await tryUnlock(ctx, userId, "weekly_warrior")) {
        unlocked.push("weekly_warrior");
      }
    }

    return unlocked;
  },
});

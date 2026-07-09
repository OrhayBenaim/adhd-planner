import { MutationCtx } from "../_generated/server";

/** Tables with single record per user (query .first()) */
const SINGLE_TABLES = [
  "userSettings",
  "userProgress",
  "userPreferences",
  "userSessionState",
  "userCosts",
  "subscriptions",
  "aiCredits",
  "streaks",
] as const;

/** Tables with multiple records per user (query .collect()) */
const MULTI_TABLES = [
  "tasks",
  "aiScoringAudit",
  "pushTokens",
  "achievements",
  "coachNotificationLog",
  "surveyCompletions",
] as const;

/**
 * Delete all data for a user across all tables.
 * Used by both account deletion and migration cleanup.
 */
export async function deleteAllUserData(
  ctx: MutationCtx,
  userId: string,
): Promise<void> {
  // Delete single-record tables
  for (const table of SINGLE_TABLES) {
    const record = await ctx.db
      .query(table)
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    if (record) await ctx.db.delete(record._id);
  }

  // Delete multi-record tables
  for (const table of MULTI_TABLES) {
    const records = await ctx.db
      .query(table)
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
  }

  // monthlyAiCosts uses a different index
  const monthlyCosts = await ctx.db
    .query("monthlyAiCosts")
    .withIndex("by_user_month", (q: any) => q.eq("userId", userId))
    .collect();
  for (const mc of monthlyCosts) {
    await ctx.db.delete(mc._id);
  }
}

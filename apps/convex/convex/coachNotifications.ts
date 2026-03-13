import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";

export const countTodayNotifications = internalQuery({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today }) => {
    const logs = await ctx.db
      .query("coachNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("date"), today))
      .collect();
    return logs.length;
  },
});

export const logNotification = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    type: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("coachNotificationLog", args);
  },
});

export const processAllUsers = internalAction({
  handler: async (_ctx) => {
    // Skeleton — full implementation when push notification infrastructure is built.
    //
    // This runs on a cron schedule (every hour). It should:
    // 1. Query all subscriptions where isActive = true
    // 2. For each, check userPreferences.bestWorkTimes against current hour
    // 3. Check daily limit from coachNotificationLog
    // 4. Gather context (tasks, streak, recent completions)
    // 5. Call LLM to generate personalized message
    // 6. Send push notification via Expo push service
  },
});

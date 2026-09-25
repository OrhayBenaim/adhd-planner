import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    completed: v.boolean(),
    dueDate: v.string(),
    dueTime: v.string(),
    sourceType: v.optional(v.literal("survey")),
    sourceId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completed"]),

  userSettings: defineTable({
    userId: v.string(),
    aiEnabled: v.boolean(),
    userAiEnabled: v.optional(v.boolean()),
    modelOverride: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    coachNotificationsEnabled: v.optional(v.boolean()),
    deviceId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_coach_enabled", ["coachNotificationsEnabled"]),

  userProgress: defineTable({
    userId: v.string(),
    level: v.number(),
    points: v.number(),
    pointsToNextLevel: v.number(),
  }).index("by_user", ["userId"]),

  aiScoringAudit: defineTable({
    taskId: v.id("tasks"),
    userId: v.string(),
    taskTitle: v.string(),
    score: v.number(),
    reason: v.string(),
    model: v.optional(v.string()),
    cost: v.optional(v.number()),
  }).index("by_task", ["taskId"]).index("by_user", ["userId"]),

  userCosts: defineTable({
    userId: v.string(),
    totalCost: v.number(),
  }).index("by_user", ["userId"]),

  pushTokens: defineTable({
    userId: v.string(),
    token: v.string(),
    platform: v.string(),
  }).index("by_user", ["userId"]),

  userPreferences: defineTable({
    userId: v.string(),
    name: v.string(),
    bestWorkTimes: v.array(v.string()),
    difficulties: v.array(v.string()),
    strengths: v.array(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    onboardingCompleted: v.boolean(),
    hasCompletedTour: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  subscriptions: defineTable({
    userId: v.string(),
    revenueCatId: v.string(),
    entitlement: v.string(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),
    productId: v.optional(v.string()),
    periodType: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_rc_id", ["revenueCatId"]),

  monthlyAiCosts: defineTable({
    userId: v.string(),
    month: v.string(),
    totalCost: v.number(),
    deviceId: v.optional(v.string()),
  })
    .index("by_user_month", ["userId", "month"])
    .index("by_device_month", ["deviceId", "month"]),

  appConfig: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  streaks: defineTable({
    userId: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletionDate: v.string(),
    freezesUsedThisWeek: v.number(),
    weekStart: v.string(),
  }).index("by_user", ["userId"]),

  achievements: defineTable({
    userId: v.string(),
    achievementId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"]),

  aiCredits: defineTable({
    userId: v.string(),
    balance: v.number(),
  }).index("by_user", ["userId"]),

  coachNotificationLog: defineTable({
    userId: v.string(),
    date: v.string(),
    type: v.string(),
    message: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  userSessionState: defineTable({
    userId: v.string(),
    selectedTaskId: v.optional(v.id("tasks")),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  surveyCampaigns: defineTable({
    posthogSurveyId: v.string(),
    title: v.string(),
    description: v.string(),
    rewardType: v.union(
      v.literal("points"),
      v.literal("pro_days"),
      v.literal("ai_credits"),
    ),
    rewardAmount: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed"),
    ),
    pushTitle: v.optional(v.string()),
    pushBody: v.optional(v.string()),
    activatedAt: v.optional(v.number()),
  })
    .index("by_posthog_survey", ["posthogSurveyId"])
    .index("by_status", ["status"]),

  surveyCompletions: defineTable({
    userId: v.string(),
    campaignId: v.id("surveyCampaigns"),
    completedAt: v.number(),
    rewardType: v.union(
      v.literal("points"),
      v.literal("pro_days"),
      v.literal("ai_credits"),
    ),
    rewardAmount: v.number(),
    rewardStatus: v.union(
      v.literal("granted"),
      v.literal("pending_rc"),
      v.literal("failed"),
    ),
    posthogSubmissionId: v.optional(v.string()),
  })
    .index("by_user_campaign", ["userId", "campaignId"])
    .index("by_user", ["userId"]),
});

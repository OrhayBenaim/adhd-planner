import { v, ConvexError } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { grantCredits, grantPoints } from "./lib/rewards";
import { getLocalToday } from "./lib/surveyDates";

const rewardTypeValidator = v.union(
  v.literal("points"),
  v.literal("pro_days"),
  v.literal("ai_credits"),
);

const rewardStatusValidator = v.union(
  v.literal("granted"),
  v.literal("pending_rc"),
  v.literal("failed"),
);

const campaignPublicValidator = v.object({
  _id: v.id("surveyCampaigns"),
  posthogSurveyId: v.string(),
  title: v.string(),
  description: v.string(),
  rewardType: rewardTypeValidator,
  rewardAmount: v.number(),
});

const rewardStatusPublicValidator = v.union(
  v.object({
    campaignId: v.id("surveyCampaigns"),
    rewardType: rewardTypeValidator,
    rewardAmount: v.number(),
    rewardStatus: rewardStatusValidator,
    completedAt: v.number(),
  }),
  v.null(),
);

export const getCampaign = query({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.union(campaignPublicValidator, v.null()),
  handler: async (ctx, { campaignId }) => {
    await requireAuth(ctx);
    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.status === "closed") return null;
    return {
      _id: campaign._id,
      posthogSurveyId: campaign.posthogSurveyId,
      title: campaign.title,
      description: campaign.description,
      rewardType: campaign.rewardType,
      rewardAmount: campaign.rewardAmount,
    };
  },
});

export const getPendingCampaign = query({
  args: {},
  returns: v.union(campaignPublicValidator, v.null()),
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const active = await ctx.db
      .query("surveyCampaigns")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const campaign of active) {
      const completion = await ctx.db
        .query("surveyCompletions")
        .withIndex("by_user_campaign", (q) =>
          q.eq("userId", userId).eq("campaignId", campaign._id),
        )
        .first();
      if (completion) continue;

      return {
        _id: campaign._id,
        posthogSurveyId: campaign.posthogSurveyId,
        title: campaign.title,
        description: campaign.description,
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
      };
    }

    return null;
  },
});

export const getRewardStatus = query({
  args: { campaignId: v.optional(v.id("surveyCampaigns")) },
  returns: rewardStatusPublicValidator,
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    if (args.campaignId) {
      const row = await ctx.db
        .query("surveyCompletions")
        .withIndex("by_user_campaign", (q) =>
          q.eq("userId", userId).eq("campaignId", args.campaignId!),
        )
        .first();
      if (!row) return null;
      return {
        campaignId: row.campaignId,
        rewardType: row.rewardType,
        rewardAmount: row.rewardAmount,
        rewardStatus: row.rewardStatus,
        completedAt: row.completedAt,
      };
    }

    const latest = await ctx.db
      .query("surveyCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!latest) return null;
    return {
      campaignId: latest.campaignId,
      rewardType: latest.rewardType,
      rewardAmount: latest.rewardAmount,
      rewardStatus: latest.rewardStatus,
      completedAt: latest.completedAt,
    };
  },
});

export const deferAsTask = mutation({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.id("tasks"),
  handler: async (ctx, { campaignId }) => {
    const userId = await requireAuth(ctx);

    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.status !== "active") {
      throw new ConvexError("Survey not available");
    }

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", userId).eq("completed", false),
      )
      .collect();

    const surveyTask = existing.find(
      (t) => t.sourceType === "survey" && t.sourceId === campaignId,
    );
    if (surveyTask) return surveyTask._id;

    const today = getLocalToday();
    return await ctx.db.insert("tasks", {
      userId,
      title: campaign.title,
      description: campaign.description,
      difficulty: 0,
      completed: false,
      dueDate: today,
      dueTime: "23:59",
      sourceType: "survey",
      sourceId: campaignId,
    });
  },
});

export const dismissDeferredTask = mutation({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.null(),
  handler: async (ctx, { campaignId }) => {
    const userId = await requireAuth(ctx);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", userId).eq("completed", false),
      )
      .collect();

    for (const task of tasks) {
      if (task.sourceType === "survey" && task.sourceId === campaignId) {
        await ctx.db.delete(task._id);
      }
    }
    return null;
  },
});

export const processSurveyWebhook = internalMutation({
  args: {
    userId: v.string(),
    surveyId: v.string(),
    submissionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { userId, surveyId, submissionId }) => {
    const campaign = await ctx.db
      .query("surveyCampaigns")
      .withIndex("by_posthog_survey", (q) => q.eq("posthogSurveyId", surveyId))
      .first();

    if (!campaign || campaign.status !== "active") {
      return null;
    }

    const existing = await ctx.db
      .query("surveyCompletions")
      .withIndex("by_user_campaign", (q) =>
        q.eq("userId", userId).eq("campaignId", campaign._id),
      )
      .first();

    if (existing) return null;

    const completedAt = Date.now();

    if (campaign.rewardType === "points") {
      await grantPoints(ctx, userId, campaign.rewardAmount);
      await ctx.db.insert("surveyCompletions", {
        userId,
        campaignId: campaign._id,
        completedAt,
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
        rewardStatus: "granted",
        posthogSubmissionId: submissionId,
      });
    } else if (campaign.rewardType === "ai_credits") {
      await grantCredits(ctx, userId, campaign.rewardAmount);
      await ctx.db.insert("surveyCompletions", {
        userId,
        campaignId: campaign._id,
        completedAt,
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
        rewardStatus: "granted",
        posthogSubmissionId: submissionId,
      });
    } else if (campaign.rewardType === "pro_days") {
      await ctx.db.insert("surveyCompletions", {
        userId,
        campaignId: campaign._id,
        completedAt,
        rewardType: campaign.rewardType,
        rewardAmount: campaign.rewardAmount,
        rewardStatus: "pending_rc",
        posthogSubmissionId: submissionId,
      });

      await ctx.scheduler.runAfter(0, internal.lib.revenueCat.grantPromotionalPro, {
        userId,
        days: campaign.rewardAmount,
        campaignId: campaign._id,
      });
    }

    // Remove deferred survey task if present
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const task of tasks) {
      if (
        task.sourceType === "survey" &&
        task.sourceId === campaign._id &&
        !task.completed
      ) {
        await ctx.db.delete(task._id);
      }
    }

    return null;
  },
});

export const markProRewardGranted = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const pending = await ctx.db
      .query("surveyCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const row of pending) {
      if (row.rewardType === "pro_days" && row.rewardStatus === "pending_rc") {
        await ctx.db.patch(row._id, { rewardStatus: "granted" });
      }
    }
    return null;
  },
});

export const markProRewardFailed = internalMutation({
  args: { userId: v.string(), campaignId: v.id("surveyCampaigns") },
  returns: v.null(),
  handler: async (ctx, { userId, campaignId }) => {
    const row = await ctx.db
      .query("surveyCompletions")
      .withIndex("by_user_campaign", (q) =>
        q.eq("userId", userId).eq("campaignId", campaignId),
      )
      .first();

    if (row && row.rewardStatus === "pending_rc") {
      await ctx.db.patch(row._id, { rewardStatus: "failed" });
    }
    return null;
  },
});

export const activateCampaign = internalMutation({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.null(),
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) throw new ConvexError("Campaign not found");

    await ctx.db.patch(campaignId, {
      status: "active",
      activatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.surveys.broadcastCampaignPush, {
      campaignId,
    });

    return null;
  },
});

export const listEligibleUserIds = internalQuery({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.array(v.string()),
  handler: async (ctx, { campaignId }) => {
    const tokens = await ctx.db.query("pushTokens").collect();
    const userIds = new Set<string>();

    for (const token of tokens) {
      const completion = await ctx.db
        .query("surveyCompletions")
        .withIndex("by_user_campaign", (q) =>
          q.eq("userId", token.userId).eq("campaignId", campaignId),
        )
        .first();
      if (completion) continue;

      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", token.userId))
        .first();
      if (settings?.notificationsEnabled === false) continue;

      userIds.add(token.userId);
    }

    return [...userIds];
  },
});

export const broadcastCampaignPush = internalAction({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.null(),
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.runQuery(internal.surveys.getCampaignById, {
      campaignId,
    });
    if (!campaign) return null;

    const userIds = await ctx.runQuery(internal.surveys.listEligibleUserIds, {
      campaignId,
    });

    const notifications = userIds.map((userId) => ({
      userId,
      title: campaign.pushTitle ?? campaign.title,
      body: campaign.pushBody ?? campaign.description,
      data: { type: "survey", campaignId },
    }));

    if (notifications.length === 0) return null;

    await ctx.runAction(internal.pushNotifications.sendBatch, {
      notifications,
    });

    return null;
  },
});

export const getCampaignById = internalQuery({
  args: { campaignId: v.id("surveyCampaigns") },
  returns: v.union(
    v.object({
      title: v.string(),
      description: v.string(),
      pushTitle: v.optional(v.string()),
      pushBody: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) return null;
    return {
      title: campaign.title,
      description: campaign.description,
      pushTitle: campaign.pushTitle,
      pushBody: campaign.pushBody,
    };
  },
});

/** ponytail: staging/admin helper — idempotent seed for survey campaign rows */
export const seedTestCampaign = internalMutation({
  args: {
    posthogSurveyId: v.string(),
    title: v.string(),
    description: v.string(),
    rewardType: rewardTypeValidator,
    rewardAmount: v.number(),
    pushTitle: v.optional(v.string()),
    pushBody: v.optional(v.string()),
    activate: v.optional(v.boolean()),
  },
  returns: v.id("surveyCampaigns"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("surveyCampaigns")
      .withIndex("by_posthog_survey", (q) =>
        q.eq("posthogSurveyId", args.posthogSurveyId),
      )
      .first();

    if (existing) {
      if (args.activate && existing.status !== "active") {
        await ctx.db.patch(existing._id, {
          status: "active",
          activatedAt: Date.now(),
        });
        await ctx.scheduler.runAfter(0, internal.surveys.broadcastCampaignPush, {
          campaignId: existing._id,
        });
      }
      return existing._id;
    }

    const campaignId = await ctx.db.insert("surveyCampaigns", {
      posthogSurveyId: args.posthogSurveyId,
      title: args.title,
      description: args.description,
      rewardType: args.rewardType,
      rewardAmount: args.rewardAmount,
      status: args.activate ? "active" : "draft",
      pushTitle: args.pushTitle,
      pushBody: args.pushBody,
      activatedAt: args.activate ? Date.now() : undefined,
    });

    if (args.activate) {
      await ctx.scheduler.runAfter(0, internal.surveys.broadcastCampaignPush, {
        campaignId,
      });
    }

    return campaignId;
  },
});

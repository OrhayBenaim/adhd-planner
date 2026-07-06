"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { DAY_MS } from "./constants";
import { sentryCaptureEvent } from "./sentry";

const ENTITLEMENT_ID = "Lullio Pro";
const RC_API_BASE = "https://api.revenuecat.com/v1";

/** Grant promotional pro via RevenueCat REST API (Apple/Google sync). */
export const grantPromotionalPro = internalAction({
  args: {
    userId: v.string(),
    days: v.number(),
    campaignId: v.id("surveyCampaigns"),
  },
  returns: v.null(),
  handler: async (ctx, { userId, days, campaignId }) => {
    const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!apiKey) {
      await sentryCaptureEvent(
        "error",
        "[RevenueCat] REVENUECAT_SECRET_API_KEY is not configured",
        { userId },
      );
      await ctx.runMutation(internal.surveys.markProRewardFailed, {
        userId,
        campaignId,
      });
      return null;
    }

    const endTimeMs = Date.now() + days * DAY_MS;
    const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent(ENTITLEMENT_ID)}/promotional`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ end_time_ms: endTimeMs }),
      });

      if (!response.ok) {
        const text = await response.text();
        await sentryCaptureEvent(
          "error",
          `[RevenueCat] grant failed: HTTP ${response.status}`,
          { userId, body: text.slice(0, 500) },
        );
        await ctx.runMutation(internal.surveys.markProRewardFailed, {
          userId,
          campaignId,
        });
      }
    } catch (error) {
      await sentryCaptureEvent(
        "error",
        `[RevenueCat] grant failed: ${error instanceof Error ? error.message : String(error)}`,
        { userId },
      );
      await ctx.runMutation(internal.surveys.markProRewardFailed, {
        userId,
        campaignId,
      });
    }

    return null;
  },
});

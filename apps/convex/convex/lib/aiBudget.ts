import type { QueryCtx } from "../_generated/server";
import {
  AI_MAX_SCORES_PER_WINDOW,
  AI_RATE_LIMIT_WINDOW_MS,
} from "./constants";
import { appConfigDefault } from "./appConfigDefaults";
import { isSubscriptionActive } from "./subscriptionStatus";
import { month as calendarMonth } from "./calendar";

export type BudgetEvaluation = {
  aiEnabled: boolean;
  rateLimited: boolean;
  allowed: boolean;
  atCeiling: boolean;
  creditsWillBeUsed: boolean;
  deviceId: string | null;
  monthKey: string;
  monthlyCost: number;
  ceiling: number;
  creditBalance: number;
};

export async function evaluateBudget(
  ctx: QueryCtx,
  { userId, nowMs }: { userId: string; nowMs: number },
): Promise<BudgetEvaluation> {
  const monthKey = calendarMonth(nowMs);

  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  const adminEnabled = settings?.aiEnabled ?? true;
  const userEnabled = settings?.userAiEnabled ?? true;
  const aiEnabled = adminEnabled && userEnabled;
  const deviceId = settings?.deviceId ?? null;

  const windowStart = nowMs - AI_RATE_LIMIT_WINDOW_MS;
  const recentScores = await ctx.db
    .query("aiScoringAudit")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("_creationTime"), windowStart))
    .collect();
  const rateLimited = recentScores.length >= AI_MAX_SCORES_PER_WINDOW;

  const userCostRow = await ctx.db
    .query("monthlyAiCosts")
    .withIndex("by_user_month", (q) =>
      q.eq("userId", userId).eq("month", monthKey),
    )
    .first();
  let monthlyCost = userCostRow?.totalCost ?? 0;

  if (deviceId) {
    const deviceRows = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_device_month", (q) =>
        q.eq("deviceId", deviceId).eq("month", monthKey),
      )
      .collect();
    const deviceCost = deviceRows.reduce((sum, row) => sum + row.totalCost, 0);
    monthlyCost = Math.max(monthlyCost, deviceCost);
  }

  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const premium = isSubscriptionActive(sub, nowMs);

  const ceilingKey = premium
    ? "premiumTierCostCeiling"
    : "freeTierCostCeiling";
  const ceilingRow = await ctx.db
    .query("appConfig")
    .withIndex("by_key", (q) => q.eq("key", ceilingKey))
    .first();
  const ceiling = ceilingRow?.value ?? appConfigDefault(ceilingKey);

  const creditRow = await ctx.db
    .query("aiCredits")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const creditBalance = creditRow?.balance ?? 0;

  const atCeiling = monthlyCost >= ceiling;
  const creditsWillBeUsed = atCeiling && creditBalance > 0;
  const allowed =
    aiEnabled && !rateLimited && (!atCeiling || creditsWillBeUsed);

  return {
    aiEnabled,
    rateLimited,
    allowed,
    atCeiling,
    creditsWillBeUsed,
    deviceId,
    monthKey,
    monthlyCost,
    ceiling,
    creditBalance,
  };
}

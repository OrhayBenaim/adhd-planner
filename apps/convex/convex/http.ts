// apps/convex/convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { RC_ACTIVE_EVENTS, RC_INACTIVE_EVENTS, CREDIT_MULTIPLIERS } from "./lib/constants";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const event = body.event;

    if (!event) {
      return new Response("No event", { status: 400 });
    }

    const appUserId = event.app_user_id;
    const rcId =
      event.id ?? event.original_transaction_id ?? appUserId;

    const eventType = event.type;
    let isActive: boolean | null = null;

    if ((RC_ACTIVE_EVENTS as readonly string[]).includes(eventType)) {
      isActive = true;
    } else if ((RC_INACTIVE_EVENTS as readonly string[]).includes(eventType)) {
      isActive = false;
    }

    if (isActive !== null && appUserId) {
      await ctx.runMutation(internal.subscriptions.upsertFromWebhook, {
        userId: appUserId,
        revenueCatId: rcId,
        entitlement: "premium",
        isActive,
        expiresAt: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : undefined,
        productId: event.product_id,
        periodType: event.period_type,
      });
    }

    // Handle consumable (AI credits) purchases
    if (eventType === "NON_RENEWING_PURCHASE" && appUserId) {
      const productId = event.product_id ?? "";
      const creditValue = await ctx.runQuery(internal.appConfig.get, {
        key: "aiCreditValue",
      });
      const tier = Object.keys(CREDIT_MULTIPLIERS).find((t) => productId.includes(t));
      const creditAmount = tier ? creditValue * CREDIT_MULTIPLIERS[tier] : 0;

      if (creditAmount > 0) {
        await ctx.runMutation(internal.credits.addCredits, {
          userId: appUserId,
          amount: creditAmount,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;

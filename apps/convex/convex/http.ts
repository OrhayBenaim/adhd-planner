// apps/convex/convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

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

    const activeTypes = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
      "SUBSCRIPTION_EXTENDED",
    ];
    const inactiveTypes = [
      "CANCELLATION",
      "EXPIRATION",
      "BILLING_ISSUE",
      "SUBSCRIPTION_PAUSED",
    ];

    const eventType = event.type;
    let isActive: boolean | null = null;

    if (activeTypes.includes(eventType)) {
      isActive = true;
    } else if (inactiveTypes.includes(eventType)) {
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
      let creditAmount = 0;
      if (productId.includes("small")) creditAmount = creditValue;
      else if (productId.includes("medium")) creditAmount = creditValue * 3;
      else if (productId.includes("large")) creditAmount = creditValue * 5;

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

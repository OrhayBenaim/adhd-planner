import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { validateWebhookPayload } from "./lib/webhook";
import { CREDIT_MULTIPLIERS } from "./lib/constants";
import { sentryCaptureEvent } from "./lib/sentry";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Fail closed: reject if secret is not configured
    const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedToken) {
      await sentryCaptureEvent(
        "error",
        "[Webhook] REVENUECAT_WEBHOOK_SECRET is not configured",
        {},
      );
      return new Response("Server misconfigured", { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${expectedToken}`) {
      await sentryCaptureEvent("warning", "[Webhook] Unauthorized request", {
        ip: request.headers.get("x-forwarded-for"),
      });
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const validated = validateWebhookPayload(body);
    if (validated === null) {
      await sentryCaptureEvent("warning", "[Webhook] Invalid payload", {
        body: JSON.stringify(body).slice(0, 500),
      });
      return new Response("Invalid payload", { status: 400 });
    }

    if (validated.kind === "ignored") {
      return new Response("OK", { status: 200 });
    }

    if (validated.kind === "subscription") {
      const d = validated.data;
      await ctx.runMutation(internal.subscriptions.upsertFromWebhook, {
        userId: d.appUserId,
        revenueCatId: d.rcId,
        entitlement: "premium",
        isActive: d.classification === "active",
        expiresAt: d.expirationAtMs
          ? new Date(d.expirationAtMs).toISOString()
          : undefined,
        productId: d.productId,
        periodType: d.periodType,
      });
    }

    if (validated.kind === "credit") {
      const d = validated.data;
      const creditValue = await ctx.runQuery(internal.appConfig.get, {
        key: "aiCreditValue",
      });
      const tier = Object.keys(CREDIT_MULTIPLIERS).find((t) =>
        d.productId.includes(t),
      );
      const creditAmount = tier ? creditValue * CREDIT_MULTIPLIERS[tier] : 0;

      if (creditAmount > 0) {
        await ctx.runMutation(internal.credits.addCredits, {
          userId: d.appUserId,
          amount: creditAmount,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;

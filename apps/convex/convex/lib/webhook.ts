import { RC_ACTIVE_EVENTS, RC_INACTIVE_EVENTS } from "./constants";

/**
 * Classify a RevenueCat event type as active, inactive, or unknown.
 */
export function classifyEventType(
  eventType: string,
): "active" | "inactive" | null {
  if ((RC_ACTIVE_EVENTS as readonly string[]).includes(eventType))
    return "active";
  if ((RC_INACTIVE_EVENTS as readonly string[]).includes(eventType))
    return "inactive";
  return null;
}

export interface ValidatedSubscriptionEvent {
  appUserId: string;
  rcId: string;
  eventType: string;
  classification: "active" | "inactive";
  expirationAtMs?: number;
  productId?: string;
  periodType?: string;
}

export interface ValidatedCreditEvent {
  appUserId: string;
  eventType: "NON_RENEWING_PURCHASE";
  productId: string;
}

export type ValidatedEvent =
  | { kind: "subscription"; data: ValidatedSubscriptionEvent }
  | { kind: "credit"; data: ValidatedCreditEvent }
  | { kind: "ignored" };

/**
 * Validate and extract fields from a RevenueCat webhook body.
 * Returns null if the payload is malformed.
 */
export function validateWebhookPayload(body: unknown): ValidatedEvent | null {
  if (!body || typeof body !== "object") return null;

  const event = (body as Record<string, unknown>).event;
  if (!event || typeof event !== "object") return null;

  const e = event as Record<string, unknown>;
  const eventType = e.type;
  const appUserId = e.app_user_id;

  if (typeof eventType !== "string" || !eventType) return null;
  if (typeof appUserId !== "string" || !appUserId) return null;

  // Credit purchase
  if (eventType === "NON_RENEWING_PURCHASE") {
    const productId = e.product_id;
    if (typeof productId !== "string" || !productId) return null;
    return {
      kind: "credit",
      data: { appUserId, eventType, productId },
    };
  }

  // Subscription event
  const classification = classifyEventType(eventType);
  if (!classification) {
    return { kind: "ignored" };
  }

  const rcId = e.id ?? e.original_transaction_id ?? appUserId;
  if (typeof rcId !== "string") return null;

  return {
    kind: "subscription",
    data: {
      appUserId,
      rcId,
      eventType,
      classification,
      expirationAtMs:
        typeof e.expiration_at_ms === "number"
          ? e.expiration_at_ms
          : undefined,
      productId: typeof e.product_id === "string" ? e.product_id : undefined,
      periodType:
        typeof e.period_type === "string" ? e.period_type : undefined,
    },
  };
}

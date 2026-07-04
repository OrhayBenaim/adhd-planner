import { describe, expect, test } from "vitest";
import {
  classifyEventType,
  isPromotionalGrant,
  validateWebhookPayload,
} from "../lib/webhook";

describe("classifyEventType", () => {
  test("returns 'active' for INITIAL_PURCHASE", () => {
    expect(classifyEventType("INITIAL_PURCHASE")).toBe("active");
  });

  test("returns 'inactive' for CANCELLATION", () => {
    expect(classifyEventType("CANCELLATION")).toBe("inactive");
  });

  test("returns null for unknown event type", () => {
    expect(classifyEventType("UNKNOWN_EVENT")).toBeNull();
  });
});

describe("validateWebhookPayload", () => {
  test("returns null for non-object body", () => {
    expect(validateWebhookPayload(null)).toBeNull();
    expect(validateWebhookPayload("string")).toBeNull();
  });

  test("returns null when event is missing", () => {
    expect(validateWebhookPayload({})).toBeNull();
  });

  test("returns null when app_user_id is missing", () => {
    expect(
      validateWebhookPayload({ event: { type: "RENEWAL" } }),
    ).toBeNull();
  });

  test("returns subscription event for valid RENEWAL", () => {
    const result = validateWebhookPayload({
      event: {
        type: "RENEWAL",
        app_user_id: "user123",
        id: "txn_abc",
        product_id: "premium_monthly",
        period_type: "NORMAL",
        expiration_at_ms: 1700000000000,
      },
    });
    expect(result).toEqual({
      kind: "subscription",
      data: {
        appUserId: "user123",
        rcId: "txn_abc",
        eventType: "RENEWAL",
        classification: "active",
        expirationAtMs: 1700000000000,
        productId: "premium_monthly",
        periodType: "NORMAL",
      },
    });
  });

  test("returns credit event for NON_RENEWING_PURCHASE", () => {
    const result = validateWebhookPayload({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "user123",
        product_id: "credits_small",
      },
    });
    expect(result).toEqual({
      kind: "credit",
      data: {
        appUserId: "user123",
        eventType: "NON_RENEWING_PURCHASE",
        productId: "credits_small",
      },
    });
  });

  test("returns subscription event for promotional NON_RENEWING_PURCHASE", () => {
    const result = validateWebhookPayload({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "user123",
        id: "promo_txn_1",
        product_id: "rc_promo_lullio_pro_monthly",
        store: "PROMOTIONAL",
        period_type: "PROMOTIONAL",
        expiration_at_ms: 1700000000000,
      },
    });
    expect(result).toEqual({
      kind: "subscription",
      data: {
        appUserId: "user123",
        rcId: "promo_txn_1",
        eventType: "NON_RENEWING_PURCHASE",
        classification: "active",
        expirationAtMs: 1700000000000,
        productId: "rc_promo_lullio_pro_monthly",
        periodType: "PROMOTIONAL",
      },
    });
  });

  test("returns ignored for unrecognized event type", () => {
    const result = validateWebhookPayload({
      event: {
        type: "TRANSFER",
        app_user_id: "user123",
      },
    });
    expect(result).toEqual({ kind: "ignored" });
  });

  test("returns null for NON_RENEWING_PURCHASE without product_id", () => {
    const result = validateWebhookPayload({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "user123",
      },
    });
    expect(result).toBeNull();
  });
});

describe("isPromotionalGrant", () => {
  test("returns true for PROMOTIONAL store", () => {
    expect(
      isPromotionalGrant({
        store: "PROMOTIONAL",
        product_id: "some_product",
      }),
    ).toBe(true);
  });

  test("returns true for rc_promo product id prefix", () => {
    expect(
      isPromotionalGrant({
        product_id: "rc_promo_lullio_pro_monthly",
      }),
    ).toBe(true);
  });

  test("returns false for credit pack product", () => {
    expect(
      isPromotionalGrant({
        product_id: "credits_small",
      }),
    ).toBe(false);
  });
});

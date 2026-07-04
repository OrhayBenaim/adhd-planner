import { describe, expect, test } from "vitest";
import { isSubscriptionActive } from "../lib/subscriptionStatus";

describe("isSubscriptionActive", () => {
  test("returns false for null subscription", () => {
    expect(isSubscriptionActive(null, Date.now())).toBe(false);
  });

  test("returns false when inactive", () => {
    expect(
      isSubscriptionActive({ isActive: false }, Date.now()),
    ).toBe(false);
  });

  test("returns true for active subscription without expiration", () => {
    expect(
      isSubscriptionActive({ isActive: true }, Date.now()),
    ).toBe(true);
  });

  test("returns false when expiration is in the past", () => {
    const nowMs = new Date("2025-06-01T00:00:00.000Z").getTime();
    expect(
      isSubscriptionActive(
        { isActive: true, expiresAt: "2025-01-01T00:00:00.000Z" },
        nowMs,
      ),
    ).toBe(false);
  });

  test("returns true when expiration is in the future", () => {
    const nowMs = new Date("2025-06-01T00:00:00.000Z").getTime();
    expect(
      isSubscriptionActive(
        { isActive: true, expiresAt: "2026-01-01T00:00:00.000Z" },
        nowMs,
      ),
    ).toBe(true);
  });
});

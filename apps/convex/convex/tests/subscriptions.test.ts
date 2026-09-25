import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal, api } from "../_generated/api";
import schema from "../schema";
import { isSubscriptionActive } from "../lib/subscriptionStatus";

const modules = import.meta.glob("../**/*.ts");

const FIXED_NOW_MS = new Date("2025-06-01T12:00:00.000Z").getTime();

describe("isSubscriptionActive", () => {
  test("returns false when subscription is null", () => {
    expect(isSubscriptionActive(null, FIXED_NOW_MS)).toBe(false);
  });

  test("returns false when inactive", () => {
    expect(isSubscriptionActive({ isActive: false }, FIXED_NOW_MS)).toBe(false);
  });

  test("returns true for active subscription without expiration", () => {
    expect(isSubscriptionActive({ isActive: true }, FIXED_NOW_MS)).toBe(true);
  });

  test("returns false when expiration is in the past", () => {
    expect(
      isSubscriptionActive(
        { isActive: true, expiresAt: "2025-01-01T00:00:00.000Z" },
        FIXED_NOW_MS,
      ),
    ).toBe(false);
  });

  test("returns true when expiration is in the future", () => {
    expect(
      isSubscriptionActive(
        { isActive: true, expiresAt: "2026-01-01T00:00:00.000Z" },
        FIXED_NOW_MS,
      ),
    ).toBe(true);
  });
});

describe("isPremium", () => {
  test("returns false when no subscription exists", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "nonexistent",
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBe(false);
  });

  test("returns true for active subscription without expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBe(true);
  });

  test("returns false for inactive subscription", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: false,
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBe(false);
  });

  test("returns false for active subscription with past expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2020-01-01T00:00:00.000Z",
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBe(false);
  });
});

describe("getStatus", () => {
  test("returns null when no subscription exists", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ name: "Free", subject: "free_user" });
    const result = await asUser.query(api.subscriptions.getStatus, {
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBeNull();
  });

  test("returns effective status when row exists", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "premium_user",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    });

    const asUser = t.withIdentity({ name: "Pro", subject: "premium_user" });
    const result = await asUser.query(api.subscriptions.getStatus, {
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toEqual({
      isActive: true,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });

  test("returns inactive effective status for expired row", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "lapsed_user",
        revenueCatId: "rc_2",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2020-01-01T00:00:00.000Z",
      });
    });

    const asUser = t.withIdentity({ name: "Lapsed", subject: "lapsed_user" });
    const result = await asUser.query(api.subscriptions.getStatus, {
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toEqual({
      isActive: false,
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
  });
});

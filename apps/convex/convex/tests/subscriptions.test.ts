import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { internal, api } from "../_generated/api";
import schema from "../schema";
import { isSubscriptionActive } from "../lib/subscriptionStatus";

const modules = import.meta.glob("../**/*.ts");

const FIXED_NOW_MS = new Date("2025-06-01T12:00:00.000Z").getTime();

describe("isSubscriptionActive", () => {
  test("returns false when subscription is null", () => {
    expect(isSubscriptionActive(null, FIXED_NOW_MS)).toBe(false);
  });
});

describe("isPremium", () => {
  test("returns false when no subscription exists", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "nonexistent",
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

  test("returns true for active subscription with future expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toBe(true);
  });
});

describe("getStatus", () => {
  test("returns null when no subscription exists", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ name: "Free", subject: "free_user" });
    const result = await asUser.query(api.subscriptions.getStatus, {});
    expect(result).toBeNull();
  });

  test("returns raw subscription status when row exists", async () => {
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
    const result = await asUser.query(api.subscriptions.getStatus, {});
    expect(result).toEqual({
      isActive: true,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });
});

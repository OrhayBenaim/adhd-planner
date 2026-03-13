import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("premium gated queries", () => {
  test("insights getWeeklyReport requires premium", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ name: "Free", subject: "free_user" });

    const { api } = await import("../_generated/api");
    await expect(
      asUser.query(api.insights.getWeeklyReport),
    ).rejects.toThrow(/[Pp]remium/);
  });

  test("insights getWeeklyReport works for premium users", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "premium_user",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "Pro", subject: "premium_user" });
    const { api } = await import("../_generated/api");
    const result = await asUser.query(api.insights.getWeeklyReport);
    expect(result).toBeDefined();
  });
});

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("getLifetimeCost aggregates all monthly costs for a user", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("monthlyAiCosts", {
      userId: "user1",
      month: "2026-01",
      totalCost: 0.5,
    });
    await ctx.db.insert("monthlyAiCosts", {
      userId: "user1",
      month: "2026-02",
      totalCost: 0.3,
    });
  });

  const result = await t.query(internal.ai.getLifetimeCost, {
    userId: "user1",
  });
  expect(result).toBeCloseTo(0.8);
});

test("getLifetimeCost returns 0 for new user", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(internal.ai.getLifetimeCost, {
    userId: "nobody",
  });
  expect(result).toBe(0);
});

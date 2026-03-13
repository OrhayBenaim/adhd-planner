import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("isPremium returns false when no subscription exists", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(internal.subscriptions.isPremium, {
    userId: "nonexistent",
  });
  expect(result).toBe(false);
});

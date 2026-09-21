import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("get returns only public progress fields for an existing user", async () => {
  const t = convexTest(schema, modules);
  const progress = { level: 1, points: 6, pointsToNextLevel: 50 };
  await t.run(async (ctx) => {
    await ctx.db.insert("userProgress", { userId: "user1", ...progress });
  });
  const asUser = t.withIdentity({ subject: "user1" });
  expect(await asUser.query(api.progress.get, {})).toEqual(progress);
});

test("get returns default progress for a new user", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ subject: "user1" });
  expect(await asUser.query(api.progress.get, {})).toEqual({
    level: 1,
    points: 0,
    pointsToNextLevel: 50,
  });
});

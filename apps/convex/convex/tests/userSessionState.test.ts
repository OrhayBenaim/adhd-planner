import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("get returns null for stale selectedTaskId", async () => {
  const t = convexTest(schema, modules);
  const taskId = await t.run(async (ctx) => {
    return await ctx.db.insert("tasks", {
      userId: "user1",
      title: "Done",
      difficulty: 50,
      completed: true,
      dueDate: "2026-03-13",
      dueTime: "10:00",
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("userSessionState", {
      userId: "user1",
      selectedTaskId: taskId,
      updatedAt: Date.now(),
    });
  });

  const asUser = t.withIdentity({ name: "Test", subject: "user1" });
  const { api } = await import("../_generated/api");
  const result = await asUser.query(api.userSessionState.get, {});
  expect(result.selectedTaskId).toBeNull();
});

test("setSelectedTask stores and get returns valid task id", async () => {
  const t = convexTest(schema, modules);
  const taskId = await t.run(async (ctx) => {
    return await ctx.db.insert("tasks", {
      userId: "user1",
      title: "Active",
      difficulty: 50,
      completed: false,
      dueDate: "2026-03-13",
      dueTime: "10:00",
    });
  });

  const asUser = t.withIdentity({ name: "Test", subject: "user1" });
  const { api } = await import("../_generated/api");
  await asUser.mutation(api.userSessionState.setSelectedTask, { taskId });
  const result = await asUser.query(api.userSessionState.get, {});
  expect(result.selectedTaskId).toBe(taskId);
});

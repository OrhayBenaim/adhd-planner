import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const contactMessage = {
  topic: "bug" as const,
  message: "The timer froze",
  replyAddress: "ada@example.com",
  os: "ios 18.1",
  appVersion: "1.4.0",
};

async function contactMessagesOf(t: ReturnType<typeof convexTest>, userId: string) {
  return t.run((ctx) =>
    ctx.db
      .query("contactMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );
}

// Fake timers keep migration's scheduled cleanup from firing on its own.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("deleteAccount removes all user data including survey completions", async () => {
  const t = convexTest(schema, modules);

  const campaignId = await t.run(async (ctx) => {
    return await ctx.db.insert("surveyCampaigns", {
      posthogSurveyId: "survey-del",
      title: "Delete test",
      description: "x",
      rewardType: "points",
      rewardAmount: 1,
      status: "active",
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("tasks", {
      userId: "user1",
      title: "Test",
      difficulty: 50,
      completed: false,
      dueDate: "2026-03-13",
      dueTime: "10:00",
    });
    await ctx.db.insert("userSettings", {
      userId: "user1",
      aiEnabled: true,
    });
    await ctx.db.insert("userProgress", {
      userId: "user1",
      level: 1,
      points: 0,
      pointsToNextLevel: 50,
    });
    await ctx.db.insert("streaks", {
      userId: "user1",
      currentStreak: 5,
      longestStreak: 5,
      lastCompletionDate: "2026-03-13",
      freezesUsedThisWeek: 0,
      weekStart: "2026-03-10",
    });
    await ctx.db.insert("surveyCompletions", {
      userId: "user1",
      campaignId,
      completedAt: Date.now(),
      rewardType: "points",
      rewardAmount: 1,
      rewardStatus: "granted",
    });
    await ctx.db.insert("contactMessages", { userId: "user1", ...contactMessage });
  });

  const asUser = t.withIdentity({ name: "Test", subject: "user1" });
  const { api } = await import("../_generated/api");
  await asUser.mutation(api.account.deleteAccount);

  await t.run(async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .collect();
    expect(tasks).toHaveLength(0);

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .first();
    expect(settings).toBeNull();

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .first();
    expect(streak).toBeNull();

    const completions = await ctx.db
      .query("surveyCompletions")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .collect();
    expect(completions).toHaveLength(0);
  });

  expect(await contactMessagesOf(t, "user1")).toHaveLength(0);
});

test("guest contact messages move to the linked account and the guest copies are cleaned up", async () => {
  const t = convexTest(schema, modules);
  const { internal } = await import("../_generated/api");

  await t.run(async (ctx) => {
    await ctx.db.insert("userSettings", { userId: "guest", aiEnabled: true });
    await ctx.db.insert("contactMessages", { userId: "guest", ...contactMessage });
  });

  await t.mutation(internal.migration.migrateUserData, { oldUserId: "guest", newUserId: "account" });

  const moved = await contactMessagesOf(t, "account");
  expect(moved).toHaveLength(1);
  expect(moved[0]).toMatchObject({ userId: "account", ...contactMessage });

  await t.mutation(internal.migration.cleanupOldUserData, { oldUserId: "guest" });

  expect(await contactMessagesOf(t, "guest")).toHaveLength(0);
  expect(await contactMessagesOf(t, "account")).toHaveLength(1);
});

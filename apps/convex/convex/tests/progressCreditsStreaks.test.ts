import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal, api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function drainScheduled(t: ReturnType<typeof convexTest>) {
  await t.finishAllScheduledFunctions(() => {
    vi.runAllTimers();
  });
}

const MONDAY_MS = new Date("2025-06-16T12:00:00.000Z").getTime();
const TUESDAY_MS = new Date("2025-06-17T12:00:00.000Z").getTime();
const WEDNESDAY_MS = new Date("2025-06-18T12:00:00.000Z").getTime();
const THURSDAY_MS = new Date("2025-06-19T12:00:00.000Z").getTime();
const NEXT_MONDAY_MS = new Date("2025-06-23T12:00:00.000Z").getTime();

describe("progress via callers", () => {
  test("creates first progress row on task completion", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ name: "User", subject: "user1" });

    const taskId = await asUser.mutation(api.tasks.create, {
      title: "Easy task",
      dueDate: "2025-06-16",
      dueTime: "10:00",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(taskId, { difficulty: 50 });
    });

    const result = await asUser.mutation(api.tasks.completeTask, { id: taskId });
    await drainScheduled(t);

    expect(result.earned).toBe(6);
    expect(result.leveledUp).toBe(false);
    expect(result.progress.points).toBe(6);

    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", "user1"))
        .first();
      expect(row?.points).toBe(6);
    });
    vi.useRealTimers();
  });

  test("single level-up on task completion", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProgress", {
        userId: "user1",
        level: 1,
        points: 45,
        pointsToNextLevel: 50,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user1" });
    const taskId = await asUser.mutation(api.tasks.create, {
      title: "Hard task",
      dueDate: "2025-06-16",
      dueTime: "10:00",
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(taskId, { difficulty: 80 });
    });

    const result = await asUser.mutation(api.tasks.completeTask, { id: taskId });
    await drainScheduled(t);
    expect(result.leveledUp).toBe(true);
    expect(result.progress.level).toBe(2);
    vi.useRealTimers();
  });

  test("multi-level carry-over via survey reward", async () => {
    const t = convexTest(schema, modules);
    const campaignId = await t.run(async (ctx) => {
      return await ctx.db.insert("surveyCampaigns", {
        posthogSurveyId: "survey-1",
        title: "Feedback",
        description: "Tell us",
        rewardType: "points",
        rewardAmount: 200,
        status: "active",
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user1" });
    await asUser.mutation(api.surveys.completeSurvey, { campaignId });

    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", "user1"))
        .first();
      expect(row).toBeDefined();
      expect(row!.level).toBeGreaterThan(1);
    });
  });
});

describe("credits", () => {
  test("add, deduct, and balance", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.credits.addCredits, {
      userId: "user1",
      amount: 10,
    });
    let balance = await t.query(internal.credits.getBalance, { userId: "user1" });
    expect(balance).toBe(10);

    const deducted = await t.mutation(internal.credits.deductCredits, {
      userId: "user1",
      amount: 4,
    });
    expect(deducted).toBe(true);
    balance = await t.query(internal.credits.getBalance, { userId: "user1" });
    expect(balance).toBe(6);
  });

  test("survey ai_credits reward affects same balance as purchase path", async () => {
    const t = convexTest(schema, modules);
    const campaignId = await t.run(async (ctx) => {
      return await ctx.db.insert("surveyCampaigns", {
        posthogSurveyId: "survey-credits",
        title: "Credits survey",
        description: "Earn credits",
        rewardType: "ai_credits",
        rewardAmount: 3,
        status: "active",
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user1" });
    await asUser.mutation(api.surveys.completeSurvey, { campaignId });

    await t.mutation(internal.credits.addCredits, {
      userId: "user1",
      amount: 2,
    });

    const balance = await t.query(internal.credits.getBalance, {
      userId: "user1",
    });
    expect(balance).toBe(5);
  });
});

describe("streaks via updateOnCompletion", () => {
  test("continues streak from yesterday", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("streaks", {
        userId: "user1",
        currentStreak: 3,
        longestStreak: 3,
        lastCompletionDate: "2025-06-16",
        freezesUsedThisWeek: 0,
        weekStart: "2025-06-16",
      });
    });

    const result = await t.mutation(internal.streaks.updateOnCompletion, {
      userId: "user1",
      nowMs: TUESDAY_MS,
    });
    expect(result.currentStreak).toBe(4);
  });

  test("resets streak after a gap", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("streaks", {
        userId: "user1",
        currentStreak: 5,
        longestStreak: 5,
        lastCompletionDate: "2025-06-16",
        freezesUsedThisWeek: 0,
        weekStart: "2025-06-16",
      });
    });

    const result = await t.mutation(internal.streaks.updateOnCompletion, {
      userId: "user1",
      nowMs: THURSDAY_MS,
    });
    expect(result.currentStreak).toBe(1);
  });

  test("premium freeze consumes weekly allowance", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
      await ctx.db.insert("streaks", {
        userId: "user1",
        currentStreak: 4,
        longestStreak: 4,
        lastCompletionDate: "2025-06-16",
        freezesUsedThisWeek: 0,
        weekStart: "2025-06-16",
      });
    });

    const result = await t.mutation(internal.streaks.updateOnCompletion, {
      userId: "user1",
      nowMs: WEDNESDAY_MS,
    });
    expect(result.currentStreak).toBe(5);

    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("streaks")
        .withIndex("by_user", (q) => q.eq("userId", "user1"))
        .first();
      expect(row?.freezesUsedThisWeek).toBe(1);
    });
  });

  test("freeze counter resets on week start", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
      await ctx.db.insert("streaks", {
        userId: "user1",
        currentStreak: 6,
        longestStreak: 6,
        lastCompletionDate: "2025-06-20",
        freezesUsedThisWeek: 1,
        weekStart: "2025-06-16",
      });
    });

    await t.mutation(internal.streaks.updateOnCompletion, {
      userId: "user1",
      nowMs: NEXT_MONDAY_MS,
    });

    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("streaks")
        .withIndex("by_user", (q) => q.eq("userId", "user1"))
        .first();
      expect(row?.weekStart).toBe("2025-06-23");
      expect(row?.freezesUsedThisWeek).toBe(0);
    });
  });
});

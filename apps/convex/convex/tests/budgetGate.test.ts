import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal, api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const FIXED_NOW_MS = new Date("2025-06-15T12:00:00.000Z").getTime();
const MONTH_KEY = "2025-06";

async function seedUserSettings(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: {
    aiEnabled?: boolean;
    userAiEnabled?: boolean;
    deviceId?: string;
  } = {},
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userSettings", {
      userId,
      aiEnabled: overrides.aiEnabled ?? true,
      userAiEnabled: overrides.userAiEnabled ?? true,
      deviceId: overrides.deviceId,
    });
  });
}

describe("checkBudget", () => {
  test("blocks when admin kill-switch is off", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1", { aiEnabled: false });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.aiEnabled).toBe(false);
    expect(result.allowed).toBe(false);
  });

  test("blocks when user AI toggle is off", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1", { userAiEnabled: false });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.aiEnabled).toBe(false);
    expect(result.allowed).toBe(false);
  });

  test("blocks when rate limited", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");
    await t.run(async (ctx) => {
      const taskId = await ctx.db.insert("tasks", {
        userId: "user1",
        title: "t",
        difficulty: 0,
        completed: false,
        dueDate: "2025-06-15",
        dueTime: "10:00",
      });
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("aiScoringAudit", {
          taskId,
          userId: "user1",
          taskTitle: "t",
          score: 1,
          reason: "test",
        });
      }
    });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.rateLimited).toBe(true);
    expect(result.allowed).toBe(false);
  });

  test("allows when under monthly ceiling", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.atCeiling).toBe(false);
    expect(result.allowed).toBe(true);
    expect(result.monthKey).toBe(MONTH_KEY);
  });

  test("blocks at ceiling without credits", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");
    await t.run(async (ctx) => {
      await ctx.db.insert("monthlyAiCosts", {
        userId: "user1",
        month: MONTH_KEY,
        totalCost: 2.0,
      });
    });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.atCeiling).toBe(true);
    expect(result.creditsWillBeUsed).toBe(false);
    expect(result.allowed).toBe(false);
  });

  test("allows at ceiling when credits remain", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");
    await t.run(async (ctx) => {
      await ctx.db.insert("monthlyAiCosts", {
        userId: "user1",
        month: MONTH_KEY,
        totalCost: 2.0,
      });
      await ctx.db.insert("aiCredits", { userId: "user1", balance: 5 });
    });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.atCeiling).toBe(true);
    expect(result.creditsWillBeUsed).toBe(true);
    expect(result.allowed).toBe(true);
  });

  test("uses device monthly cost to enforce ceiling bypass protection", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1", { deviceId: "device-abc" });
    await t.run(async (ctx) => {
      await ctx.db.insert("monthlyAiCosts", {
        userId: "other-user",
        month: MONTH_KEY,
        totalCost: 2.0,
        deviceId: "device-abc",
      });
    });

    const result = await t.query(internal.ai.checkBudget, {
      userId: "user1",
      nowMs: FIXED_NOW_MS,
    });

    expect(result.monthlyCost).toBe(2.0);
    expect(result.deviceId).toBe("device-abc");
    expect(result.atCeiling).toBe(true);
    expect(result.allowed).toBe(false);
  });
});

describe("getCeilingStatus", () => {
  test("does not surface rate limiting in atCeiling", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");
    await t.run(async (ctx) => {
      const taskId = await ctx.db.insert("tasks", {
        userId: "user1",
        title: "t",
        difficulty: 0,
        completed: false,
        dueDate: "2025-06-15",
        dueTime: "10:00",
      });
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("aiScoringAudit", {
          taskId,
          userId: "user1",
          taskTitle: "t",
          score: 1,
          reason: "test",
        });
      }
    });

    const asUser = t.withIdentity({ name: "User", subject: "user1" });
    const status = await asUser.query(api.ai.getCeilingStatus, {
      nowMs: FIXED_NOW_MS,
    });
    expect(status).toEqual({ atCeiling: false });
  });

  test("reports at ceiling when over limit without credits", async () => {
    const t = convexTest(schema, modules);
    await seedUserSettings(t, "user1");
    await t.run(async (ctx) => {
      await ctx.db.insert("monthlyAiCosts", {
        userId: "user1",
        month: MONTH_KEY,
        totalCost: 2.0,
      });
    });

    const asUser = t.withIdentity({ name: "User", subject: "user1" });
    const status = await asUser.query(api.ai.getCeilingStatus, {
      nowMs: FIXED_NOW_MS,
    });
    expect(status).toEqual({
      atCeiling: true,
      reason: "Monthly AI scoring limit reached",
    });
  });
});

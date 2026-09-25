import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const TODAY = "2025-06-17";

type SeedUser = {
  userId: string;
  coach?: boolean;
  notifications?: boolean;
  pushToken?: boolean;
  premium?: boolean;
};

async function seed(t: ReturnType<typeof convexTest>, user: SeedUser) {
  await t.run(async (ctx) => {
    await ctx.db.insert("userSettings", {
      userId: user.userId,
      aiEnabled: true,
      notificationsEnabled: user.notifications ?? true,
      ...(user.coach === undefined ? {} : { coachNotificationsEnabled: user.coach }),
    });
    if (user.pushToken ?? true) {
      await ctx.db.insert("pushTokens", {
        userId: user.userId,
        token: `ExponentPushToken[${user.userId}]`,
        platform: "ios",
      });
    }
    if (user.premium) {
      await ctx.db.insert("subscriptions", {
        userId: user.userId,
        revenueCatId: `rc_${user.userId}`,
        entitlement: "premium",
        isActive: true,
      });
    }
    await ctx.db.insert("tasks", {
      userId: user.userId,
      title: "Open task",
      difficulty: 1,
      completed: false,
      dueDate: TODAY,
      dueTime: "09:00",
    });
  });
}

describe("listRecipientIds", () => {
  test("includes free users with coach and notifications on", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "free_on", coach: true });

    const ids = await t.query(internal.coachNotifications.listRecipientIds, {});
    expect(ids).toEqual(["free_on"]);
  });

  test("excludes Pro users who never turned coach on", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "pro_unset", premium: true });
    await seed(t, { userId: "pro_off", premium: true, coach: false });

    const ids = await t.query(internal.coachNotifications.listRecipientIds, {});
    expect(ids).toEqual([]);
  });

  test("excludes users with notifications off", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "muted", coach: true, notifications: false });

    const ids = await t.query(internal.coachNotifications.listRecipientIds, {});
    expect(ids).toEqual([]);
  });

  test("excludes users without a push token", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "no_token", coach: true, pushToken: false });

    const ids = await t.query(internal.coachNotifications.listRecipientIds, {});
    expect(ids).toEqual([]);
  });
});

describe("getUserCoachContext", () => {
  test("builds context when coach and notifications are on", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "u", coach: true });

    const ctx = await t.query(internal.coachNotifications.getUserCoachContext, {
      userId: "u",
      today: TODAY,
    });
    expect(ctx?.uncompletedTaskCount).toBe(1);
  });

  test("returns null when coach is off", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "u", coach: false, premium: true });

    const ctx = await t.query(internal.coachNotifications.getUserCoachContext, {
      userId: "u",
      today: TODAY,
    });
    expect(ctx).toBeNull();
  });

  test("returns null when notifications are off even if coach is on", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "u", coach: true, notifications: false });

    const ctx = await t.query(internal.coachNotifications.getUserCoachContext, {
      userId: "u",
      today: TODAY,
    });
    expect(ctx).toBeNull();
  });
});

describe("settings.setCoachNotificationsEnabled", () => {
  test("persists the switch and makes the user a recipient", async () => {
    const t = convexTest(schema, modules);
    await seed(t, { userId: "u" });
    const asUser = t.withIdentity({ name: "U", subject: "u" });

    await asUser.mutation(api.settings.setCoachNotificationsEnabled, { enabled: true });
    expect((await asUser.query(api.settings.get, {}))?.coachNotificationsEnabled).toBe(true);
    expect(await t.query(internal.coachNotifications.listRecipientIds, {})).toEqual(["u"]);

    await asUser.mutation(api.settings.setCoachNotificationsEnabled, { enabled: false });
    expect(await t.query(internal.coachNotifications.listRecipientIds, {})).toEqual([]);
  });
});

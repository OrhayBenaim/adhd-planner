import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CONTACT_RATE_LIMIT_MESSAGE } from "@adhd-planner/types";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const base = { topic: "bug" as const, message: "The timer froze", os: "ios 18.1", appVersion: "1.4.0" };

// The better-auth JWT carries the user record (minus id/image) as claims, so email and isAnonymous arrive on the identity.
function emailUser(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ subject: "user1", email: "ada@example.com", isAnonymous: false });
}

async function storedMessages(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) => ctx.db.query("contactMessages").collect());
}

describe("send a contact message", () => {
  // Fake timers keep the scheduled email action from running (and calling Resend) after the test.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("account with a real email replies to the account email and ignores a typed one", async () => {
    const t = convexTest(schema, modules);

    await emailUser(t).mutation(api.contactMessages.send, { ...base, email: "typed@example.com" });

    const rows = await storedMessages(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: "user1",
      topic: "bug",
      message: "The timer froze",
      replyAddress: "ada@example.com",
      os: "ios 18.1",
      appVersion: "1.4.0",
    });
  });

  test.each([
    ["guest", { subject: "guest1", email: "temp-abc@lullio.app", isAnonymous: true }],
    ["username account", { subject: "user2", email: "ada@internal.lullio.app", isAnonymous: false }],
  ])("%s replies to the typed email", async (_label, identity) => {
    const t = convexTest(schema, modules);

    await t.withIdentity(identity).mutation(api.contactMessages.send, { ...base, email: " typed@example.com " });

    const rows = await storedMessages(t);
    expect(rows.map((r) => r.replyAddress)).toEqual(["typed@example.com"]);
  });

  test.each([undefined, "", "not-an-email", "a@b", "two@@example.com", `${"a".repeat(243)}@example.com`])(
    "account without a real email rejects typed email %j",
    async (email) => {
      const t = convexTest(schema, modules);
      const asGuest = t.withIdentity({ subject: "guest1", isAnonymous: true });

      await expect(asGuest.mutation(api.contactMessages.send, { ...base, email })).rejects.toThrow(
        /valid email/,
      );
      expect(await storedMessages(t)).toHaveLength(0);
    },
  );

  test.each([
    ["an empty message", { message: "   " }],
    ["a message over 2,000 characters", { message: "x".repeat(2001) }],
    ["an unknown topic", { topic: "billing" }],
  ])("rejects %s", async (_label, override) => {
    const t = convexTest(schema, modules);

    await expect(
      emailUser(t).mutation(api.contactMessages.send, { ...base, ...override } as typeof base),
    ).rejects.toThrow();
    expect(await storedMessages(t)).toHaveLength(0);
  });

  test("accepts a message of exactly 2,000 characters once trimmed", async () => {
    const t = convexTest(schema, modules);

    await emailUser(t).mutation(api.contactMessages.send, { ...base, message: ` ${"x".repeat(2000)} ` });

    expect((await storedMessages(t))[0].message).toHaveLength(2000);
  });

  test("rejects the 4th message within 10 minutes and accepts one after the window", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    const t = convexTest(schema, modules);
    const asUser = emailUser(t);
    const asOtherUser = t.withIdentity({ subject: "user9", email: "bo@example.com", isAnonymous: false });

    for (let i = 0; i < 3; i++) await asUser.mutation(api.contactMessages.send, base);
    vi.setSystemTime(new Date("2026-01-01T12:09:59.000Z"));
    await expect(asUser.mutation(api.contactMessages.send, base)).rejects.toThrow(CONTACT_RATE_LIMIT_MESSAGE);
    await asOtherUser.mutation(api.contactMessages.send, base);

    vi.setSystemTime(new Date("2026-01-01T12:10:01.000Z"));
    await asUser.mutation(api.contactMessages.send, base);

    const rows = await storedMessages(t);
    expect(rows.filter((r) => r.userId === "user1")).toHaveLength(4);
  });

  test("a successful send schedules the email notification right away", async () => {
    const t = convexTest(schema, modules);

    await emailUser(t).mutation(api.contactMessages.send, base);

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      name: "contactMessages:notifyTeam",
      args: [{ userId: "user1", topic: "bug", message: "The timer froze", replyAddress: "ada@example.com" }],
    });
  });

  test("a rejected send schedules nothing", async () => {
    const t = convexTest(schema, modules);

    await expect(emailUser(t).mutation(api.contactMessages.send, { ...base, message: "" })).rejects.toThrow();

    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled).toHaveLength(0);
  });

  test("rejects callers without a session", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.contactMessages.send, { ...base, email: "a@example.com" })).rejects.toThrow(
      /Unauthenticated/,
    );
    expect(await storedMessages(t)).toHaveLength(0);
  });
});

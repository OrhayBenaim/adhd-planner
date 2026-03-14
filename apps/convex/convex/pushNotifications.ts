import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { sentryCaptureEvent } from "./lib/sentry";

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  sound: string;
  data?: unknown;
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error: string } };

async function callExpoPushApi(
  messages: ExpoMessage[],
): Promise<ExpoPushTicket[]> {
  const allTickets: ExpoPushTicket[] = [];
  // Expo accepts max 100 per request
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      throw new Error(`Expo API HTTP ${response.status}`);
    }
    const result = await response.json();
    allTickets.push(...(result.data ?? []));
  }
  return allTickets;
}

export const send = internalAction({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { userId, title, body, data }) => {
    const tokens = await ctx.runQuery(
      internal.pushNotifications.getTokensForUser,
      { userId },
    );
    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.token,
      title,
      body,
      sound: "default",
      ...(data ? { data } : {}),
    }));

    try {
      const tickets = await callExpoPushApi(messages);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          await ctx.runMutation(
            internal.pushNotifications.removeStaleToken,
            { token: messages[i].to },
          );
        }
      }
    } catch (error) {
      await sentryCaptureEvent(
        "error",
        `[Push] Failed to send: ${error instanceof Error ? error.message : String(error)}`,
        { userId },
      );
    }
  },
});

export const sendBatch = internalAction({
  args: {
    notifications: v.array(
      v.object({
        userId: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
      }),
    ),
  },
  handler: async (ctx, { notifications }) => {
    const messages: ExpoMessage[] = [];

    for (const n of notifications) {
      const tokens = await ctx.runQuery(
        internal.pushNotifications.getTokensForUser,
        { userId: n.userId },
      );
      for (const t of tokens) {
        messages.push({
          to: t.token,
          title: n.title,
          body: n.body,
          sound: "default",
          ...(n.data ? { data: n.data } : {}),
        });
      }
    }

    if (messages.length === 0) return;

    try {
      const tickets = await callExpoPushApi(messages);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          await ctx.runMutation(
            internal.pushNotifications.removeStaleToken,
            { token: messages[i].to },
          );
        }
      }
    } catch (error) {
      await sentryCaptureEvent(
        "error",
        `[Push] sendBatch failed: ${error instanceof Error ? error.message : String(error)}`,
        {},
      );
    }
  },
});

export const getTokensForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const removeStaleToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const existing = await ctx.db
      .query("pushTokens")
      .filter((q) => q.eq(q.field("token"), token))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

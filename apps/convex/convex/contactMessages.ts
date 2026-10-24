import { ConvexError, v } from "convex/values";
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_RATE_LIMIT_MESSAGE,
  CONTACT_TOPICS,
  hasRealEmail,
  isValidEmail,
} from "@adhd-planner/types";
import { internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { CONTACT_MAX_MESSAGES_PER_WINDOW, CONTACT_RATE_LIMIT_WINDOW_MS } from "./lib/constants";
import { sentryCaptureEvent } from "./lib/sentry";
import { assertMaxLength, MAX_NAME } from "./lib/validation";
import schema from "./schema";

export const send = mutation({
  args: {
    topic: schema.tables.contactMessages.validator.fields.topic,
    message: v.string(),
    email: v.optional(v.string()),
    os: v.string(),
    appVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { topic, message, email, os, appVersion }) => {
    const userId = await requireAuth(ctx);
    // The better-auth JWT carries the user record as claims, so email and isAnonymous are on the identity.
    const identity = (await ctx.auth.getUserIdentity())!;
    const text = message.trim();
    if (!text) throw new ConvexError("Message is required");
    assertMaxLength(text, CONTACT_MESSAGE_MAX_LENGTH, "Message");
    assertMaxLength(os, MAX_NAME, "OS");
    assertMaxLength(appVersion, MAX_NAME, "App version");

    let replyAddress: string;
    if (hasRealEmail({ email: identity.email, isAnonymous: identity.isAnonymous === true })) {
      replyAddress = identity.email!;
    } else {
      replyAddress = email?.trim() ?? "";
      if (replyAddress.length > CONTACT_EMAIL_MAX_LENGTH || !isValidEmail(replyAddress)) {
        throw new ConvexError("Enter a valid email address.");
      }
    }

    const windowStart = Date.now() - CONTACT_RATE_LIMIT_WINDOW_MS;
    const recent = await ctx.db
      .query("contactMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId).gte("_creationTime", windowStart))
      .take(CONTACT_MAX_MESSAGES_PER_WINDOW);
    if (recent.length >= CONTACT_MAX_MESSAGES_PER_WINDOW) {
      throw new ConvexError(CONTACT_RATE_LIMIT_MESSAGE);
    }

    const row = { userId, topic, message: text, replyAddress, os, appVersion };
    await ctx.db.insert("contactMessages", row);
    await ctx.scheduler.runAfter(0, internal.contactMessages.notifyTeam, row);
    return null;
  },
});

/** Emails the team's inbox via Resend. Failures go to Sentry; no retries. */
export const notifyTeam = internalAction({
  args: schema.tables.contactMessages.validator.fields,
  returns: v.null(),
  handler: async (_ctx, row) => {
    const label = CONTACT_TOPICS.find((t) => t.value === row.topic)!.label;
    const preview = row.message.replace(/\s+/g, " ").slice(0, 60);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // shortcut: Resend's test sender only delivers to the Resend account owner; switch to a verified domain to mail anyone else.
          from: "Lullio <onboarding@resend.dev>",
          to: [process.env.CONTACT_INBOX_EMAIL],
          reply_to: row.replyAddress,
          subject: `${label}: ${preview}`,
          text: [
            `Topic: ${label}`,
            `Reply address: ${row.replyAddress}`,
            `OS: ${row.os}`,
            `App version: ${row.appVersion}`,
            `User ID: ${row.userId}`,
            `Date: ${new Date().toISOString()}`,
            "",
            row.message,
          ].join("\n"),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    } catch (error) {
      await sentryCaptureEvent("error", "[contact] email notification failed", {
        userId: row.userId,
        error: String(error),
      });
    }
    return null;
  },
});

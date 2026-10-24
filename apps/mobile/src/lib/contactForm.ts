import { ConvexError } from "convex/values";
import { CONTACT_RATE_LIMIT_MESSAGE } from "@adhd-planner/types";

export type ContactTopic = "bug" | "idea" | "account" | "other";

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "bug", label: "Report a bug" },
  { value: "idea", label: "Suggest an idea" },
  { value: "account", label: "Account & subscription" },
  { value: "other", label: "Something else" },
];

interface ContactDraft {
  topic: ContactTopic | null;
  message: string;
  email: string;
  /** The account has no real email, so the user types a reply address. */
  needsEmail: boolean;
}

// Same rule the send endpoint checks (apps/convex/convex/contactMessages.ts).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function canSendContact({ topic, message, email, needsEmail }: ContactDraft): boolean {
  return topic !== null && message.trim().length > 0 && (!needsEmail || isValidEmail(email));
}

/** The error line shown above Send when a contact message fails to send. */
export function contactSendError(error: unknown): string {
  return error instanceof ConvexError && error.data === CONTACT_RATE_LIMIT_MESSAGE
    ? CONTACT_RATE_LIMIT_MESSAGE
    : "Couldn't send your message. Check your connection and try again.";
}

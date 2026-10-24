import { ConvexError } from "convex/values";
import { CONTACT_RATE_LIMIT_MESSAGE, isValidEmail, type ContactTopic } from "@adhd-planner/types";

interface ContactDraft {
  topic: ContactTopic | null;
  message: string;
  email: string;
  /** The account has no real email, so the user types a reply address. */
  needsEmail: boolean;
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

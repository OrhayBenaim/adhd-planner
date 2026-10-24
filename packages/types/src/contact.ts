// Contact us rules the app and the send endpoint share.

export const CONTACT_TOPICS = [
  { value: "bug", label: "Report a bug" },
  { value: "idea", label: "Suggest an idea" },
  { value: "account", label: "Account & subscription" },
  { value: "other", label: "Something else" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_EMAIL_MAX_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

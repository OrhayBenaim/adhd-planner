const INTERNAL_EMAIL_DOMAIN = "internal.lullio.app";
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const RESERVED_USERNAMES = new Set(["admin", "support", "lullio", "help"]);

export function usernameToInternalEmail(username: string): string {
  return `${username.toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalAuthEmail(email: string | null | undefined): boolean {
  return !!email?.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) return "Please enter a username.";
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 30) return "Username must be at most 30 characters.";
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username can only contain letters, numbers, underscores, and dots.";
  }
  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
    return "This username is not available.";
  }
  return null;
}

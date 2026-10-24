// Username accounts sign up with a made-up email on this domain, so it is never a real inbox.
const INTERNAL_EMAIL_DOMAIN = "internal.lullio.app";

export function usernameToInternalEmail(username: string): string {
  return `${username.toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalAuthEmail(email: string | null | undefined): boolean {
  return !!email?.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

/** The account's email reaches a real person: not a guest, not a username account. */
export function hasRealEmail(
  user: { email?: string | null; isAnonymous?: boolean | null } | null | undefined,
): boolean {
  return !!user?.email && user.isAnonymous !== true && !isInternalAuthEmail(user.email);
}

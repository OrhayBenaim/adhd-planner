export interface SubscriptionRecord {
  isActive: boolean;
  expiresAt?: string;
}

/**
 * Whether a subscription row grants premium access at the given instant.
 */
export function isSubscriptionActive(
  sub: SubscriptionRecord | null | undefined,
  nowMs: number,
): boolean {
  if (!sub?.isActive) return false;
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() <= nowMs) {
    return false;
  }
  return true;
}

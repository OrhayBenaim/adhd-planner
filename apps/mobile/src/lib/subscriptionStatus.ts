export interface BackendSubscriptionStatus {
  isActive: boolean;
  expiresAt: string | null;
}

/**
 * Evaluate whether raw backend subscription status grants premium access.
 * Mirrors backend isSubscriptionActive logic.
 */
export function evaluateBackendPremium(
  status: BackendSubscriptionStatus | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!status?.isActive) return false;
  if (status.expiresAt && new Date(status.expiresAt).getTime() <= nowMs) {
    return false;
  }
  return true;
}

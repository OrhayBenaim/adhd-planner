/** One day in milliseconds */
export const DAY_MS = 86_400_000;

/** RevenueCat event types that indicate an active subscription */
export const RC_ACTIVE_EVENTS = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
] as const;

/** RevenueCat event types that indicate an inactive subscription */
export const RC_INACTIVE_EVENTS = [
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
] as const;

/** AI credit multipliers by product tier */
export const CREDIT_MULTIPLIERS: Record<string, number> = {
  small: 1,
  medium: 3,
  large: 5,
};

/** AI scoring rate limit */
export const AI_RATE_LIMIT_WINDOW_MS = 60_000;
export const AI_MAX_SCORES_PER_WINDOW = 10;

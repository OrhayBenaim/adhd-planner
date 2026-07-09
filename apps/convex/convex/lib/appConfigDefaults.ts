/** Default app config values when no row exists in the dashboard. */
export const APP_CONFIG_DEFAULTS: Record<string, number> = {
  freeTierCostCeiling: 1.0,
  premiumTierCostCeiling: 10.0,
  aiCreditValue: 0.5,
  maxCoachNotificationsPerDay: 3,
  aiPickDaysAhead: 7,
};

export function appConfigDefault(key: string): number {
  return APP_CONFIG_DEFAULTS[key] ?? 0;
}

# Profile Unsubscribe Button — Design

## Goal

Add a subscription management row to the profile screen so premium users can see their subscription details and cancel.

## Layout

A new row in `AuthenticatedProfile`, between Achievements and Sign Out, visible only when `isPremium`:

```
┌──────────────────────────────────────────────┐
│  💳  Subscription              [ Cancel ]    │
│       Renews Mar 28, 2026                    │
└──────────────────────────────────────────────┘
```

- **Left:** `#ffafcc` circle with `card-outline` Ionicon + "Subscription" title + subtitle
- **Right:** "Cancel" button (red text) — hidden if subscription is already cancelled (willRenew = false)
- Same card style as other profile rows: `bg-[#f5f7fa] rounded-3xl px-4 py-4`

## Subtitle Logic

- If `willRenew` is true: "Renews {formatted date}"
- If `willRenew` is false: "Expires {formatted date}"
- Date formatted as "MMM DD, YYYY" (e.g., "Mar 28, 2026")

## Cancel Flow

1. User taps "Cancel" button
2. Confirmation alert: title "Cancel Subscription", message "You'll be redirected to your device's subscription settings to manage your subscription."
3. Buttons: "Not now" (cancel) / "Continue" (destructive)
4. On "Continue": `Linking.openURL(managementURL)` using `CustomerInfo.managementURL` from RevenueCat (auto-points to correct store). Fallback to platform-specific URLs if null.

## Data Changes

### `usePremium` hook (`apps/mobile/src/hooks/usePremium.tsx`)

Add to state and context:
- `expiresAt: string | null` — from `CustomerInfo.entitlements.active["Lullio Pro"].expirationDate`
- `willRenew: boolean` — from `CustomerInfo.entitlements.active["Lullio Pro"].willRenew`
- `managementURL: string | null` — from `CustomerInfo.managementURL`

Extract these in both `INIT_DONE` and `PREMIUM_CHANGED` actions.

### `AuthenticatedProfile` (`apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx`)

- Import `{ Linking, Platform, Alert }` from react-native
- Consume `expiresAt`, `willRenew`, `managementURL` from `usePremium()`
- Add subscription row JSX between achievements and sign out
- Add `handleCancelSubscription` callback with alert + Linking

## No Backend Changes

All data sourced from RevenueCat SDK on the client. No Convex changes needed.

## Files Modified

1. `apps/mobile/src/hooks/usePremium.tsx` — add `expiresAt`, `willRenew`, `managementURL` to state/context
2. `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx` — add subscription row + cancel handler

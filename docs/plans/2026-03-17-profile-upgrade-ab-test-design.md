# Profile Upgrade CTA — A/B Test Design

## Problem

Non-subscribed users have no proactive way to discover or start a subscription. The paywall screen is only reachable by attempting a paid feature.

## Solution

Add an upgrade CTA to the **Profile sheet** for all non-premium users (including anonymous). A/B test two variants using PostHog experiments to measure which drives higher conversion.

## Experiment Setup

- **Feature flag:** `profile-upgrade-variant`
- **Type:** Multivariate experiment
- **Variants:** `feature-card` (50%) / `locked-teasers` (50%)
- **Audience:** All non-premium users (including anonymous)
- **Primary metric:** `subscription_purchased` conversion rate
- **Secondary metric:** `paywall_opened` rate

### Events

| Event | When | Properties |
|-------|------|-----------|
| `upgrade_cta_viewed` | Profile sheet opens + user is non-premium | `variant` |
| `paywall_opened` | User taps any upgrade CTA | `variant`, `source` |
| `subscription_purchased` | RevenueCat purchase succeeds | `variant` |

### PostHog Insight

Funnel insight: `upgrade_cta_viewed` → `paywall_opened` → `subscription_purchased`, broken down by `variant`.

## Variant A — Feature-Focused Card

A single card in the profile sheet (where Achievements/Subscription cards sit for premium users).

- Rounded card (`bg-[#cdb4db]/20`, `rounded-3xl`) matching existing card style
- Headline: "Unlock Lullio Pro"
- 4 benefit rows with icons: AI Coach, Home Widgets, Achievements, Insights
- CTA button: gradient `#a2d2ff` → `#cdb4db`, text "Try Lullio Pro"
- Tapping CTA → fires `paywall_opened` → navigates to `/sign-in-gate` (anonymous) or `/paywall` (authenticated)

## Variant C — Locked Teasers

4 individual feature rows in existing card style (`bg-[#f5f7fa] rounded-3xl`), each showing:

- Feature icon (left) + feature name + short description
- Lock icon (right) instead of chevron
- Slight reduced opacity (`opacity-70`)
- Tapping any row → fires `paywall_opened` with `source: "teaser_<feature>"` → navigates to sign-in gate / paywall

| Feature | Icon | Description |
|---------|------|-------------|
| AI Coach | `sparkles-outline` | Smart notifications to keep you on track |
| Home Widgets | `grid-outline` | Quick access from your home screen |
| Achievements | `trophy-outline` | Earn badges for your progress |
| Insights | `bar-chart-outline` | See your 7-day completion trends |

## Navigation Flow

- **Authenticated non-premium:** CTA → `/paywall` (RevenueCat UI)
- **Anonymous:** CTA → `/sign-in-gate` → `/paywall` (existing flow)

## Implementation

### New Files

- `apps/mobile/src/components/sheets/profile/UpgradeFeatureCard.tsx` — Variant A
- `apps/mobile/src/components/sheets/profile/UpgradeLockedTeasers.tsx` — Variant C

### Modified Files

- `apps/mobile/src/components/sheets/profile/AuthenticatedProfile.tsx` — Read PostHog flag, render variant, fire `upgrade_cta_viewed`
- `apps/mobile/src/hooks/usePremium.tsx` — Fire `subscription_purchased` with `variant` property

### Flag Reading

```typescript
useFeatureFlag('profile-upgrade-variant') // → 'feature-card' | 'locked-teasers'
```

PostHog React Native SDK already provides `useFeatureFlag` — no new dependencies.

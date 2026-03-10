# Android Play Store Launch — Design

**Date:** 2026-03-10
**Target:** Android first, Play Store, ASAP (1-2 weeks)
**Goal:** Market validation test before iOS launch

## Decisions

| Area | Decision |
|------|----------|
| Analytics | PostHog (free, 1M events/month) |
| Crash reporting | Sentry (free, 5K errors/month) |
| AI model | Keep OpenRouter auto-routing; admin override per user via Convex dashboard |
| AI cost tracking | Actual cost per call, accumulated per user, Sentry alert at configurable threshold |
| Database | Convex free tier (1M calls/month) |
| Privacy policy | Self-generated, hosted on Convex site URL |
| Push notifications | Register device token now, sending logic in v1.0.1 |

## Blocking Items

### 1. Google Play Developer Account
- $25 one-time fee
- 24-48hr identity verification
- Manual step — owner must complete

### 2. EAS Build & Submit Setup
- Create `eas.json` with production profile for Android
- Generate Android signing keystore
- Configure EAS Submit for Play Store (service account JSON)
- Test a production build locally before submitting

### 3. OAuth Secrets (Google & Apple)
- **Google:** Create OAuth 2.0 credentials in Google Cloud Console, add client ID + secret to Convex env
- **Apple:** Create Sign in with Apple service ID + key in Apple Developer portal, add to Convex env
- Both are referenced in `apps/convex/convex/auth.ts` but currently missing secrets

### 4. Privacy Policy
- Draft covering: task data, user preferences, AI difficulty scoring (OpenRouter), anonymous auth, data retention, third-party services (Convex, OpenRouter, PostHog, Sentry)
- Host as static HTML at Convex HTTP route (`/privacy`)
- Link from: app settings screen + Play Store listing

### 5. Play Store Listing Assets
- Short description (80 chars max)
- Long description (4000 chars max)
- Feature graphic (1024x500 PNG)
- At least 4 phone screenshots
- Content rating questionnaire (IARC)
- Data safety form (declare data collection practices)
- App category: Productivity

### 6. PostHog Integration
- Install `posthog-react-native` SDK
- Initialize in `_layout.tsx` at app root
- Identify users (anonymous + authenticated)
- Track events:
  - `session_start`
  - `onboarding_completed`
  - `task_created`
  - `task_completed`
  - `voice_input_used`
  - `ai_score_received`
- Configure week 1 retention dashboard in PostHog

### 7. Sentry Integration
- Install `@sentry/react-native`
- Initialize in `_layout.tsx` at app root
- Configure source map uploads in EAS build
- Set up Sentry project for `com.orhaybenaim.adhdplanner`
- Wire user context (userId) for error correlation

### 8. AI Cost Management
- Keep OpenRouter auto-routing as default (no model change)
- Add `modelOverride` optional field to user settings schema (admin sets via Convex dashboard)
- When `modelOverride` is set, pass it to OpenRouter instead of letting it auto-route
- Store actual cost per call in `aiScoringAudit` table (new `cost` and `model` fields, from OpenRouter response)
- New `userCosts` table: `{ userId, totalCost }` — updated on each scoring call
- Sentry alert when user's `totalCost` crosses threshold
- Threshold from Convex env var `COST_ALERT_THRESHOLD` (default: $20)

### 9. Critical Security Fixes
- **H1:** Migrate user settings from AsyncStorage to SecureStore
- **H3:** Add `v.string()` length validation on Convex schema string fields (task titles, descriptions, etc.)
- **H4:** Consistent auth error handling — all queries/mutations use shared auth check helper

### 10. Push Notification Token Registration
- On app launch (after notification permission granted), get Expo push token
- New `pushTokens` table in Convex: `{ userId, token, platform, createdAt }`
- Store/update token on each app launch
- No sending logic yet — that comes in v1.0.1

## Non-Blocking (v1.0.1+)

Each item has a detailed backlog doc in `docs/backlog/`:

- iOS launch (`ios-launch.md`)
- Push notification sending (`push-notification-sending.md`)
- Client-side input validation (`client-input-validation.md`)
- Medium/Low security issues (`security-medium-low.md`)
- Tech debt refactoring (`tech-debt-refactoring.md`)
- Integration & E2E tests (`integration-e2e-tests.md`)
- Terms of Service (`terms-of-service.md`)

## Architecture Notes

- PostHog + Sentry both initialize in `_layout.tsx` before any screens render
- Cost tracking reuses existing `aiScoringAudit` table (add `cost` + `model` fields) plus new `userCosts` accumulator
- Privacy policy served as static HTML from Convex HTTP route in `http.ts`
- EAS handles signing, building, and submitting to Play Store
- Push token registration hooks into existing notification permission flow in onboarding

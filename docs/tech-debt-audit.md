# Tech Debt & Gaps Audit

**Date:** 2026-03-13

---

## Table of Contents

1. [Security Issues](#1-security-issues)
2. [Missing Middleware (Auth & Premium)](#2-missing-middleware-auth--premium)
3. [Multiple API Calls That Should Be Consolidated](#3-multiple-api-calls-that-should-be-consolidated)
4. [Hardcoded Values & Magic Numbers](#4-hardcoded-values--magic-numbers)
5. [Duplicate Tables & Data Redundancy](#5-duplicate-tables--data-redundancy)
6. [Duplicate Code](#6-duplicate-code)
7. [Large Files That Need Breaking Down](#7-large-files-that-need-breaking-down)
8. [Components & Screens to Break Down](#8-components--screens-to-break-down)
9. [State Management Problems](#9-state-management-problems)
10. [useEffect Issues](#10-useeffect-issues)
11. [Workarounds Instead of Proper Code](#11-workarounds-instead-of-proper-code)
12. [Type Safety Issues](#12-type-safety-issues)
13. [Performance Concerns](#13-performance-concerns)
14. [Priority Matrix](#14-priority-matrix)

---

## 1. Security Issues

### 1.1 Webhook Verification Vulnerability (Critical)

**File:** `apps/convex/convex/http.ts:14-19`

If `REVENUECAT_WEBHOOK_SECRET` is unset, the check `!expectedToken` passes but the bearer comparison fails — however the logic is fragile. There's also no rate limiting, replay protection, or logging of rejected attempts. An attacker could forge subscription events.

**Fix:** Fail closed if env var is missing. Add request logging. Consider HMAC signature verification instead of bearer token.

### 1.2 No Input Validation on Webhook Payloads (Critical)

**File:** `apps/convex/convex/http.ts:56-85`

The webhook handler passes `appUserId` and `productId` directly to internal mutations without validating format or existence. Could create bogus subscription/credit entries.

**Fix:** Validate `appUserId` exists as a real user, validate `productId` against known product IDs.

### 1.3 Premium Features Gated Client-Side Only (High)

Several premium features are only gated in the mobile app UI, with no server-side enforcement:

| Feature | Client gate | Server gate |
|---------|------------|-------------|
| Coach notifications toggle | `usePremium` → paywall | None |
| Insights sheet access | `isPremium ? openSheet : undefined` | None |
| Streak freeze | N/A | `streaks.ts:55-59` |
| AI cost ceiling | N/A | `ai.ts:203-208` |

**Fix:** Server must always enforce premium checks. Client gates are UX only.

### 1.4 Premium Expiration Not Checked (High)

**File:** `apps/convex/convex/subscriptions.ts:11`

`isPremium` only checks `isActive` boolean, but the webhook also stores `expiresAt`. If `isActive=true` but `expiresAt` is in the past, users incorrectly get premium.

**Fix:**
```ts
return (sub?.isActive ?? false) && (!sub.expiresAt || new Date(sub.expiresAt) > new Date());
```

### 1.5 Console Logging in Production

**Files:** `apps/convex/convex/auth.ts:68-70`, `migration.ts` (10+ instances)

`console.log()` in production can leak sensitive data. Should use structured logging (Sentry).

---

## 2. Missing Middleware (Auth & Premium)

### 2.1 No Centralized Auth Middleware (High)

The pattern `const identity = await ctx.auth.getUserIdentity()` appears **71+ times** across the Convex backend with no shared middleware. Only `tasks.ts` has a local `requireAuth()` helper (lines 17-21) that isn't reused.

**Affected files:** `tasks.ts`, `preferences.ts`, `settings.ts`, `insights.ts`, `pushTokens.ts`, `achievementDefs.ts`, `streaks.ts`, `progress.ts`, `account.ts`

**Fix:** Create authenticated wrappers:
```ts
// convex/lib/middleware.ts
export function authenticatedQuery(config, handler) {
  return query(config, async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    return handler({ ...ctx, userId: identity.subject }, args);
  });
}

export function authenticatedMutation(config, handler) { /* same pattern */ }
```

### 2.2 No Premium Check Middleware (Medium)

Premium checks are scattered and inconsistent:
- `ai.ts:203-208` — queries `isPremium` internal query
- `streaks.ts:55-59` — inlines the same DB query directly instead of calling `subscriptions.isPremium`

**Fix:** Create `requirePremium(ctx, userId)` helper, or add premium flag to auth middleware context.

---

## 3. Multiple API Calls That Should Be Consolidated

### 3.1 HomeProvider — 4 Separate Queries (High)

**File:** `apps/mobile/src/components/home/HomeProvider.tsx:74-81`

```tsx
const tasks = useTasks();                          // Query 1: api.tasks.list
const { progress } = useUserProgress();            // Query 2: api.progress.get
const { settings } = useSettings();                // Query 3: api.settings.get
const streakData = useQuery(api.streaks.get);      // Query 4: api.streaks.get
```

**Fix:** Create `api.dashboard.get` that returns `{ tasks, progress, settings, streakData }` in one round-trip.

### 3.2 InsightsSheet — 2 Overlapping Queries (Medium)

**File:** `apps/mobile/src/components/sheets/InsightsSheet.tsx`

```tsx
const report = useQuery(api.insights.getWeeklyReport);
const trends = useQuery(api.insights.getCompletionTrends, { days: 7 });
```

Both fetch and filter the same `tasks` table by userId with overlapping date ranges.

**Fix:** Combine into `api.insights.getDashboard` returning `{ report, trends }`.

### 3.3 Sequential Queries in `needsOnboarding` (Medium)

**File:** `apps/convex/convex/preferences.ts:24-55`

Three sequential DB queries that early-exit. These are independent and can run in parallel:
```ts
const [prefs, hasTask, hasProgress] = await Promise.all([
  ctx.db.query("userPreferences")...,
  ctx.db.query("tasks")...,
  ctx.db.query("userProgress")...,
]);
```

### 3.4 `scoreTaskDifficulty` — 7+ Internal Queries (Medium)

**File:** `apps/convex/convex/ai.ts:158-364`

Makes separate queries for: user model override, monthly AI cost (by user), monthly AI cost (by device), device ID, premium status, preferences, credit balance.

**Fix:** Create `getUserAiContext(userId)` that bundles all needed data.

### 3.5 `deleteAccount` — 11 Sequential Deletions (Low)

**File:** `apps/convex/convex/account.ts:13-113`

Each table queried and deleted sequentially. Could use `Promise.all()` for the fetch phase.

---

## 4. Hardcoded Values & Magic Numbers

### 4.1 Convex Backend

| Value | Location | Description |
|-------|----------|-------------|
| `86400000` | `insights.ts:12-13`, `streaks.ts:28,62,109` | Day in milliseconds, repeated 5+ times |
| `"small"/"medium"/"large"` | `http.ts:76-78` | Product ID string matching with hardcoded multipliers (1x, 3x, 5x) |
| `"INITIAL_PURCHASE"`, `"RENEWAL"`, etc. | `http.ts:32-44` | RevenueCat event types |
| `maxCoachNotificationsPerDay: 3` | `appConfig.ts:9` | Default in code, not configurable without redeploy |
| `RATE_LIMIT_WINDOW_MS = 60_000` | `ai.ts:7-8` | Rate limit config hardcoded, not in appConfig |
| `freeTierCostCeiling: 1.0` | `appConfig.ts:5` | Pricing defaults in code |

### 4.2 Mobile App

| Value | Location | Description |
|-------|----------|-------------|
| `"#a2d2ff"`, `"#cdb4db"` | `AddTaskSheet.tsx:231,261` | Colors not from theme/design system |
| `154, 154` | `MainContent.tsx:158` | AI button dimensions |
| `BAR_W=3, BAR_GAP=1.5` | `ScrollingWaveform.tsx:4-8` | Waveform magic numbers |
| `"lullio"` | `authClient.ts:13` | Hardcoded app scheme |
| `"https://eu.i.posthog.com"` | `posthog.ts:4` | Hardcoded analytics host |
| `maxDaysAhead = 3` | `MainContent.tsx:54` | Hardcoded date range |
| `0.92` | `AddTaskSheet.tsx:227` | Animation scale value |

**Fix:** Create `constants.ts` files for both packages. Move configurable values to `appConfig` table.

---

## 5. Duplicate Tables & Data Redundancy

### 5.1 User Cost Tracking (High)

Two tables tracking the same data:
- `userCosts` — lifetime total cost per user
- `monthlyAiCosts` — monthly breakdown per user

`monthlyAiCosts` is authoritative for cost ceiling checks, but `userCosts` is accumulated separately. If they drift, cost controls break.

**Fix:** Remove `userCosts` table, derive lifetime total from `monthlyAiCosts` aggregation.

### 5.2 Settings Scattered Across Tables (Medium)

- `userSettings` — device ID, AI toggles, notifications
- `userPreferences` — name, work times, difficulties, strengths

Both have a `notificationsEnabled`-related concept. Settings are split without clear domain boundaries.

**Fix:** Consolidate into a single `userProfile` table with nested objects, or at minimum ensure no field overlap.

### 5.3 Premium Status — Dual Source of Truth (Medium)

- RevenueCat SDK on client (mobile) — real-time status
- `subscriptions` table in Convex — updated via webhook

No mechanism to reconcile if they diverge.

---

## 6. Duplicate Code

### 6.1 Account Deletion & Migration Cleanup (High)

**Files:** `account.ts:12-114` and `migration.ts:206-272`

Nearly identical loops deleting the same tables for a user: tasks, userPreferences, userSettings, userProgress, subscriptions, aiCredits, streaks, achievements, coachNotificationLog.

**Fix:** Extract `deleteAllUserData(ctx, userId)` as a shared internal mutation.

### 6.2 Settings Upsert Pattern — 3x Repetition (Medium)

**File:** `settings.ts:23-71`

Three mutations (`setUserAiEnabled`, `registerDeviceId`, `setNotificationsEnabled`) all follow identical get-or-create:
1. Get identity
2. Query `userSettings` by userId
3. If exists → patch; else → insert with defaults

**Fix:** Extract `upsertUserSetting(ctx, userId, field, value)`.

### 6.3 SubView Navigation Pattern — 3x Repetition (Low)

**Files:** `welcome.tsx`, `sign-in.tsx`, `ProfileSheet.tsx`

All use `const [subView, setSubView] = useState<SubView>(...)` with similar switching logic.

**Fix:** Extract `useSubView<T>()` hook.

### 6.4 Premium Check Inlined vs. Internal Query (Low)

`streaks.ts:55-59` inlines the premium DB query instead of calling `subscriptions.isPremium`.

**Fix:** Always call `subscriptions.isPremium`.

---

## 7. Large Files That Need Breaking Down

### 7.1 Convex Backend

| File | Lines | Problem |
|------|-------|---------|
| `ai.ts` | 365 | `scoreTaskDifficulty` alone is 207 lines mixing cost tracking, rate limiting, AI calls, error handling |
| `migration.ts` | 273 | `migrateUserData` is 198 lines of repetitive per-table copy logic |
| `account.ts` | 115 | Single `deleteAccount` mutation is 110 lines of sequential table deletions |

### 7.2 Mobile App

| File | Lines | Problem |
|------|-------|---------|
| `AddTaskSheet.tsx` | 283 | Text input, voice recording, animations, state all in one |
| `SheetFlowProvider.tsx` | 224 | Complex state machine with 60-line switch in `next()` |
| `PreferencesSheet.tsx` | 210 | Preference UI, local state, auto-save all combined |
| `HomeProvider.tsx` | 188 | Tasks, progress, settings, sheets, toasts all in one context |

---

## 8. Components & Screens to Break Down

### 8.1 AddTaskSheet.tsx → 3 Components

- `TextInputMode.tsx` — text input UI
- `RecordingMode.tsx` — recording UI with waveform
- `useAddTaskAnimations()` — shared animation/state hook

### 8.2 HomeProvider.tsx → 3 Hooks

- `useTaskData()` — task queries/mutations
- `useSheetNavigation()` — sheet state management
- `useToastQueue()` — toast notifications

### 8.3 SheetFlowProvider.tsx → Separate Step Handlers

Extract each step's logic (addTask → selectDay → selectTime → taskSummary) into individual handler functions instead of a monolithic `next()` switch.

### 8.4 PreferencesSheet.tsx → Tab Components + Hook

- `PreferenceTab.tsx` — individual tab component
- `useAutoSavePreferences()` — state management and auto-save

---

## 9. State Management Problems

### 9.1 SheetFlowProvider — stateRef Workaround (Medium)

**File:** `SheetFlowProvider.tsx:109-115`

Uses `stateRef` to synchronously access state after dispatch — a workaround for closure issues:
```tsx
const stateRef = useRef(state);
stateRef.current = state;
const syncDispatch = useCallback((action) => {
  dispatch(action);
  stateRef.current = flowReducer(stateRef.current, action); // Manual sync
}, []);
```

This indicates the state model is too complex for the current architecture.

### 9.2 HomeProvider — Too Many Concerns (Medium)

**File:** `HomeProvider.tsx`

Single context manages: tasks, progress, settings, sheet navigation, toast notifications. Should be split into focused providers/hooks.

### 9.3 Toast State — Manual Visibility (Low)

**File:** `HomeProvider.tsx:69-72, 122-128`

Toast uses `useState` with manual visibility toggling. Should use a queue-based approach.

---

## 10. useEffect Issues

### 10.1 PreferencesSheet — Unstable `base` Object (High)

**File:** `PreferencesSheet.tsx:91-96`

`base` object is recreated every render but used in `useCallback` dependencies:
```tsx
const base = {
  bestWorkTimes: preferences?.bestWorkTimes ?? [],
  difficulties: preferences?.difficulties ?? [],
  strengths: preferences?.strengths ?? [],
};

const toggleWorkTime = useCallback((label) => {
  dispatch({ field: "bestWorkTimes", label, base }); // base changes every render!
}, [ensureSaved, base]);
```

**Fix:** Wrap `base` in `useMemo`.

### 10.2 usePremium — 3 Separate Effects (Medium)

**File:** `usePremium.tsx:66-120`

Three separate useEffects for RevenueCat:
- Lines 66-95: Initial setup
- Lines 98-103: Device ID registration
- Lines 105-120: Customer info listener

All depend on `session.data?.user?.id`. Could be consolidated or extracted into a custom hook.

### 10.3 Widget Sync — Too Frequent (Low)

**File:** `HomeProvider.tsx:84-92`

Writes to AsyncStorage on ANY change to `progress`, `selectedTask`, or `streakData`. Should debounce.

### 10.4 HomeScreen Analytics — Mount Only (Low)

**File:** `HomeScreen.tsx:14-16`

```tsx
useEffect(() => { posthog.capture("Home page loaded"); }, []);
```

Only fires on mount, not on screen focus. Consider using `useFocusEffect` if tracking screen views.

---

## 11. Workarounds Instead of Proper Code

### 11.1 Migration Race Condition Hack (High)

**File:** `migration.ts:56-61`

Deliberately duplicates user data during migration to avoid JWT staleness race condition:
```
// Strategy: COPY to new user but keep old record intact.
// The client's Convex JWT may still reference the old userId during the
// session transition after account linking.
```

Requires a scheduled cleanup 30 seconds later. Leaves orphaned data temporarily accessible.

### 11.2 Coach Notifications — Skeleton Cron (Medium)

**File:** `coachNotifications.ts:28-40`

Cron job runs hourly but the handler is a skeleton (commented-out pseudocode). Wastes compute.

**Fix:** Implement or disable the cron.

### 11.3 Widget Sync — One-Way Only (Low)

**File:** `widgetSync.ts:15-17`

```tsx
// TODO: Once native widget extensions are added:
// iOS: WidgetKit.reloadAllTimelines()
// Android: requestWidgetUpdate()
```

Writes to AsyncStorage but native widget never reads it.

### 11.4 boxShadow as any (Low)

**File:** `SocialAuthButtons.tsx:54`

```tsx
{ boxShadow: "0px 1px 3px rgba(0,0,0,0.1)" as any }
```

React Native doesn't support CSS `boxShadow`. Should use `elevation` (Android) and `shadow*` props (iOS).

---

## 12. Type Safety Issues

### 12.1 `as any` Casts (Medium)

| File | Line | Cast |
|------|------|------|
| `SocialAuthButtons.tsx` | 54 | `boxShadow` as any |
| `ProfileSheet.tsx` | 72 | `(session?.user as any)?.isAnonymous` |
| `ProfileSheet.tsx` | 108, 118 | `BottomSheetTextInput as any` |
| `XPBar.tsx` | 71 | Width percentage as any |
| `AchievementsSheet.tsx` | 128 | Icon name as any |
| `achievementDefs.ts` | 40 | `ctx: { db: any }` |

**Fix for `isAnonymous`:** Add TypeScript module augmentation:
```ts
declare module "better-auth" {
  interface User { isAnonymous?: boolean; }
}
```

### 12.2 Missing Error Handling in Flow Logic (Medium)

**File:** `SheetFlowProvider.tsx:170-179`

When editing existing task, sheet closes and resets before confirming `updateTask` succeeded:
```tsx
if (s.editingExistingTaskId) {
  closeSheet();
  await updateTask({...});  // What if this fails?
  syncDispatch({ type: "RESET" });
}
```

---

## 13. Performance Concerns

### 13.1 `.collect()` on All User Tasks (High)

| File | Query |
|------|-------|
| `tasks.ts:39-42` | `list` query collects ALL user tasks |
| `insights.ts:15-18` | Collects ALL tasks for weekly report |
| `achievementDefs.ts:123-132` | Collects ALL tasks for weekly warrior |

Heavy users with thousands of tasks will face slow loads and potential timeouts.

**Fix:** Add pagination for list view. Use date-filtered indexes for reports.

### 13.2 Missing Database Indexes (Medium)

**Current:** All tables have `by_user` index only.

**Missing:**
| Table | Needed Index | Reason |
|-------|-------------|--------|
| `tasks` | `(userId, completed)` | Filter uncompleted tasks without full scan |
| `tasks` | `(userId, _creationTime)` | Week/month date range queries |
| `coachNotificationLog` | `(userId, date)` | Daily limit checks |

### 13.3 Incomplete Env Var Validation (Low)

**File:** `auth.ts:14-27`

Only validates some env vars at startup. Others (`OPENROUTER_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `SENTRY_DSN`) are checked at runtime. Should fail fast on deploy.

---

## 14. Priority Matrix

### Critical — Fix Now
| # | Issue | Section |
|---|-------|---------|
| 1 | Webhook verification vulnerability | 1.1 |
| 2 | No input validation on webhook payloads | 1.2 |
| 3 | Premium features gated client-side only | 1.3 |
| 4 | Premium expiration not checked | 1.4 |

### High — Fix Soon
| # | Issue | Section |
|---|-------|---------|
| 5 | No centralized auth middleware (71+ repetitions) | 2.1 |
| 6 | HomeProvider 4 separate queries | 3.1 |
| 7 | `.collect()` on all user tasks (no pagination) | 13.1 |
| 8 | Duplicate account deletion / migration cleanup | 6.1 |
| 9 | `userCosts` / `monthlyAiCosts` dual tracking | 5.1 |
| 10 | Hardcoded day-in-ms, product IDs, rate limits | 4.1 |
| 11 | useEffect unstable `base` in PreferencesSheet | 10.1 |

### Medium — Plan for Next Sprint
| # | Issue | Section |
|---|-------|---------|
| 12 | InsightsSheet 2 overlapping queries | 3.2 |
| 13 | Settings upsert 3x duplication | 6.2 |
| 14 | Missing database indexes | 13.2 |
| 15 | Premium check middleware | 2.2 |
| 16 | `as any` type casts (6 instances) | 12.1 |
| 17 | Break down AddTaskSheet, SheetFlowProvider | 7.2 / 8.1 |
| 18 | HomeProvider manages too many concerns | 9.2 |
| 19 | Coach notifications skeleton cron | 11.2 |
| 20 | Migration race condition workaround | 11.1 |
| 21 | ai.ts 365 lines, scoreTaskDifficulty 207 lines | 7.1 |

### Low — Backlog
| # | Issue | Section |
|---|-------|---------|
| 22 | SubView navigation pattern duplication | 6.3 |
| 23 | Widget sync one-way only | 11.3 |
| 24 | boxShadow as any | 11.4 |
| 25 | Console logging in production | 1.5 |
| 26 | Toast state manual visibility | 9.3 |
| 27 | HomeScreen analytics mount-only | 10.4 |
| 28 | Widget sync too frequent (debounce) | 10.3 |

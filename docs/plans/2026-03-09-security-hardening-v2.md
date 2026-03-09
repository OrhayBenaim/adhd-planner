# Security Hardening v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all High and Medium severity issues from the follow-up security audit (`docs/security-audit.md`), covering prompt injection gaps, unbounded error storage, production console leaks, silent mutation failures, and env var validation.

**Architecture:** Fixes are scoped to exact locations identified in the audit. Backend changes are in Convex mutations/actions. Mobile changes gate console output behind `__DEV__`. No new files are created — all changes modify existing files. Rate limiting uses a simple per-user timestamp check in the Convex DB.

**Tech Stack:** Convex (backend mutations/actions), React Native / Expo (mobile), TypeScript

---

## Task 1: Fix sanitizeForPrompt to strip newlines (H1)

**Files:**
- Modify: `apps/convex/convex/lib/validation.ts:53-57`

**Step 1: Add newline stripping to sanitizeForPrompt**

In `apps/convex/convex/lib/validation.ts`, replace the `sanitizeForPrompt` function body:

```typescript
export function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/[\r\n]+/g, " ") // collapse newlines to spaces
    .slice(0, MAX_PREF_ITEM);
}
```

The key change: adding `.replace(/[\r\n]+/g, " ")` between the control char strip and the truncation. This prevents prompt injection via `\n\nIgnore previous instructions...` patterns embedded in user preferences or task titles.

**Step 2: Commit**

```bash
git add apps/convex/convex/lib/validation.ts
git commit -m "fix: strip newlines in sanitizeForPrompt to prevent prompt injection"
```

---

## Task 2: Truncate AI audit reason field and non-auth error responses (H2 + L2)

**Files:**
- Modify: `apps/convex/convex/ai.ts:117,150,160`

**Step 1: Truncate non-auth error response body**

In `apps/convex/convex/ai.ts`, replace line 117:

```typescript
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
```

With:

```typescript
        throw new Error(`OpenRouter HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
```

**Step 2: Truncate the reason field in the error audit log**

In the catch block (around line 160), replace:

```typescript
        reason: `Error: ${error instanceof Error ? error.message : String(error)}`,
```

With:

```typescript
        reason: `Error: ${(error instanceof Error ? error.message : String(error)).slice(0, 1000)}`,
```

**Step 3: Truncate the reason field in the success audit log**

Around line 150, replace:

```typescript
        reason,
```

With:

```typescript
        reason: reason.slice(0, 1000),
```

**Step 4: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "fix: truncate AI audit reason field and non-auth error responses"
```

---

## Task 3: Gate console.error behind \_\_DEV\_\_ in mobile (H4 + M6)

**Files:**
- Modify: `apps/mobile/src/lib/convexClient.ts:50`
- Modify: `apps/mobile/src/components/onboarding/OnboardingProvider.tsx:71`
- Modify: `apps/mobile/app/index.tsx:16`

**Step 1: Gate fetchAccessToken error logging**

In `apps/mobile/src/lib/convexClient.ts`, replace line 50:

```typescript
        console.error("[fetchAccessToken] error:", e);
```

With:

```typescript
        if (__DEV__) console.error("[fetchAccessToken] error:", e);
```

**Step 2: Gate onboarding save error logging**

In `apps/mobile/src/components/onboarding/OnboardingProvider.tsx`, replace line 71:

```typescript
      console.error("[onboarding] save failed:", error);
```

With:

```typescript
      if (__DEV__) console.error("[onboarding] save failed:", error);
```

**Step 3: Gate anonymous sign-in error logging**

In `apps/mobile/app/index.tsx`, replace line 15-17:

```typescript
      authClient.signIn.anonymous().catch((e) =>
        console.error("[index] sign-in error:", e)
      );
```

With:

```typescript
      authClient.signIn.anonymous().catch((e) => {
        if (__DEV__) console.error("[index] sign-in error:", e);
      });
```

**Step 4: Commit**

```bash
git add apps/mobile/src/lib/convexClient.ts apps/mobile/src/components/onboarding/OnboardingProvider.tsx apps/mobile/app/index.tsx
git commit -m "fix: gate console.error behind __DEV__ to prevent production log leaks"
```

---

## Task 4: Fix setNotificationsEnabled silent failure (M5)

**Files:**
- Modify: `apps/convex/convex/preferences.ts:57-72`

**Step 1: Create default preferences record when none exists**

In `apps/convex/convex/preferences.ts`, replace the `setNotificationsEnabled` handler (lines 57-73):

```typescript
export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { notificationsEnabled: enabled });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        name: "",
        bestWorkTimes: [],
        difficulties: [],
        strengths: [],
        notificationsEnabled: enabled,
        onboardingCompleted: false,
      });
    }
  },
});
```

The key change: when no preferences record exists, we create one with sensible defaults instead of silently doing nothing. `onboardingCompleted` is set to `false` so the user still gets the full onboarding flow.

**Step 2: Verify type correctness**

Run: `cd apps/convex && npx convex dev --once --typecheck=enable`

Expected: No type errors.

**Step 3: Commit**

```bash
git add apps/convex/convex/preferences.ts
git commit -m "fix: create default preferences when toggling notifications pre-onboarding"
```

---

## Task 5: Add env var startup validation (M4)

**Files:**
- Modify: `apps/convex/convex/auth.ts:12-64`

**Step 1: Add env var validation before creating the auth instance**

In `apps/convex/convex/auth.ts`, add a validation block at the start of `createAuth`:

```typescript
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const required = [
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "APPLE_CLIENT_ID",
    "APPLE_CLIENT_SECRET",
    "CONVEX_SITE_URL",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return betterAuth({
```

Remove the closing of the existing `return betterAuth({` line — the `return` is now inside the function after the validation loop.

The full function should look like:

```typescript
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const required = [
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "APPLE_CLIENT_ID",
    "APPLE_CLIENT_SECRET",
    "CONVEX_SITE_URL",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: ["adhd-planner://"],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      expo(),
      convex({
        authConfig: {
          providers: [
            {
              type: "customJwt",
              issuer: process.env.CONVEX_SITE_URL!,
              applicationID: "convex",
              algorithm: "RS256",
              jwks: `${process.env.CONVEX_SITE_URL!}/api/auth/convex/jwks`,
            },
          ],
        },
      }),
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          console.log(
            `[auth] onLinkAccount: migrating data from ${anonymousUser.user.id} to ${newUser.user.id}`,
          );
          if ("runMutation" in ctx) {
            await ctx.runMutation(internal.migration.migrateUserData, {
              oldUserId: anonymousUser.user.id,
              newUserId: newUser.user.id,
            });
          } else {
            console.error(
              "[auth] onLinkAccount: ctx missing runMutation, migration skipped",
            );
          }
        },
      }),
    ],
  });
};
```

**Step 2: Commit**

```bash
git add apps/convex/convex/auth.ts
git commit -m "fix: validate required env vars at auth startup with descriptive errors"
```

---

## Task 6: Add per-user rate limiting on AI scoring (M1)

**Files:**
- Modify: `apps/convex/convex/ai.ts:44-57`

**Step 1: Add rate limit check at the start of scoreTaskDifficulty**

In `apps/convex/convex/ai.ts`, add a rate limit constant and check. First, add this import at the top:

```typescript
import { internal } from "./_generated/api";
```

(This import already exists — no action needed.)

Add a new `internalQuery` before `scoreTaskDifficulty` to count recent scoring requests:

```typescript
export const countRecentScores = internalQuery({
  args: { userId: v.string(), since: v.number() },
  handler: async (ctx, { userId, since }) => {
    const recent = await ctx.db
      .query("aiScoringAudit")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("_creationTime"), since),
        ),
      )
      .collect();
    return recent.length;
  },
});
```

Then, in the `scoreTaskDifficulty` handler, add the rate limit check after the kill switch check (after line 57):

```typescript
    // Per-user rate limit: max 10 AI scores per minute
    const oneMinuteAgo = Date.now() - 60_000;
    const recentCount = await ctx.runQuery(internal.ai.countRecentScores, {
      userId,
      since: oneMinuteAgo,
    });
    if (recentCount >= 10) {
      await ctx.runMutation(internal.ai.updateTaskDifficulty, { taskId, difficulty: 0 });
      console.warn(`[AI] rate limit exceeded for user ${userId}, task ${taskId} set to 0`);
      return;
    }
```

**Step 2: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat: add per-user rate limiting on AI scoring (max 10/min)"
```

---

## Task 7: Final verification

**Step 1: Run the Convex type checker**

```bash
cd apps/convex && npx convex dev --once --typecheck=enable
```

Expected: No type errors, deployment succeeds.

**Step 2: Run the mobile app type checker**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No type errors.

**Step 3: Create a fix commit if any type errors were found and fixed**

```bash
git add -A
git commit -m "fix: address type errors from security hardening v2"
```

---

## Findings NOT addressed in this plan (with rationale)

| Finding | Reason skipped |
|---------|---------------|
| **H3** — AsyncStorage for settings | Large refactor; settings data (STT model, locale) is non-sensitive. Accept risk and document. |
| **H5** — Deep link validation | No deep link parameters exist today. Address when parameters are introduced. |
| **M2** — Email verification | UX decision with onboarding implications. Requires product discussion. |
| **M3** — Anonymous account rate limiting | Requires device fingerprinting or IP-based limiting outside Convex scope. |
| **M7** — Migration transactional rollback | Convex mutations are already atomic/transactional. A partial failure rolls back the entire mutation. The idempotency guard from v1 handles re-runs. |
| **L1-L8** — All Low items | Low risk; some are debug-only, some are documentation items. |

---

## Summary of changes by finding

| Finding | Task | Fix |
|---------|------|-----|
| H1 — Prompt injection via newlines | Task 1 | Strip `\r\n` in `sanitizeForPrompt` |
| H2 — Unbounded audit reason | Task 2 | Truncate to 1000 chars |
| H4 — Console leaks auth details | Task 3 | Gate behind `__DEV__` |
| L2 — Raw error response body | Task 2 | Truncate to 200 chars |
| M1 — No AI rate limiting | Task 6 | 10 scores/min per user |
| M4 — Missing env var validation | Task 5 | Startup validation with descriptive errors |
| M5 — Silent notification toggle | Task 4 | Create default preferences record |
| M6 — Console logging in production | Task 3 | Gate all `console.error` behind `__DEV__` |

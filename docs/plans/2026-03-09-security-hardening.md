# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all Critical/High/Medium security issues from the security audit: input validation, prompt injection protection, error redaction, stale closure bug, auth error standardization, date validation, and gitignore hardening.

**Architecture:** All validation happens at the Convex mutation boundary (args validation + handler guards). A shared `sanitizeForPrompt` helper strips prompt-injection patterns before embedding user strings in AI prompts. Error responses are redacted on auth failures. The PointsToast stale closure is fixed by adding `onDone` to the useEffect dependency array.

**Tech Stack:** Convex (backend mutations/queries), React Native + Reanimated (PointsToast), TypeScript

---

## Task 1: Add input validation helpers

**Files:**
- Create: `apps/convex/convex/lib/validation.ts`

**Step 1: Create the validation helpers file**

```typescript
// apps/convex/convex/lib/validation.ts

/** Max lengths for string fields */
export const MAX_TITLE = 500;
export const MAX_DESCRIPTION = 5000;
export const MAX_NAME = 200;
export const MAX_PREF_ITEM = 100;
export const MAX_PREF_ARRAY = 20;
export const MAX_STT_MODEL = 50;
export const MAX_STT_LOCALE = 10;

/** Date format: YYYY-MM-DD */
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** Time format: HH:mm */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function assertMaxLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length of ${max}`);
  }
}

export function assertArrayLimits(
  arr: string[],
  maxItems: number,
  maxItemLength: number,
  field: string,
): void {
  if (arr.length > maxItems) {
    throw new Error(`${field} exceeds maximum of ${maxItems} items`);
  }
  for (const item of arr) {
    if (item.length > maxItemLength) {
      throw new Error(`${field} item exceeds maximum length of ${maxItemLength}`);
    }
  }
}

export function assertDateFormat(value: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`Invalid date format, expected YYYY-MM-DD`);
  }
}

export function assertTimeFormat(value: string): void {
  if (!TIME_RE.test(value)) {
    throw new Error(`Invalid time format, expected HH:mm`);
  }
}

/**
 * Sanitize user-provided strings before embedding in AI prompts.
 * Strips characters/patterns that could be used for prompt injection.
 */
export function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .slice(0, MAX_PREF_ITEM);
}
```

**Step 2: Commit**

```bash
git add apps/convex/convex/lib/validation.ts
git commit -m "feat: add input validation and prompt sanitization helpers"
```

---

## Task 2: Add input validation to tasks.ts

**Files:**
- Modify: `apps/convex/convex/tasks.ts:1-61`

**Step 1: Add imports and validation to the create mutation**

At the top of `apps/convex/convex/tasks.ts`, add the import:

```typescript
import {
  assertMaxLength,
  assertDateFormat,
  assertTimeFormat,
  MAX_TITLE,
  MAX_DESCRIPTION,
} from "./lib/validation";
```

In the `create` handler, add validation before the `ctx.db.insert`:

```typescript
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    assertMaxLength(args.title, MAX_TITLE, "title");
    if (args.description) {
      assertMaxLength(args.description, MAX_DESCRIPTION, "description");
    }
    assertDateFormat(args.dueDate);
    assertTimeFormat(args.dueTime);

    const taskId = await ctx.db.insert("tasks", {
```

**Step 2: Test manually**

Run: `cd apps/convex && npx convex dev` (verify no type errors on startup)

**Step 3: Commit**

```bash
git add apps/convex/convex/tasks.ts
git commit -m "feat: add input validation to task creation"
```

---

## Task 3: Add input validation to preferences.ts

**Files:**
- Modify: `apps/convex/convex/preferences.ts:1-5, 78-109`

**Step 1: Add imports**

At the top of `apps/convex/convex/preferences.ts`, add:

```typescript
import { ConvexError } from "convex/values";
import {
  assertMaxLength,
  assertArrayLimits,
  MAX_NAME,
  MAX_PREF_ITEM,
  MAX_PREF_ARRAY,
} from "./lib/validation";
```

**Step 2: Add validation to the save mutation handler**

In the `save` handler, add validation before the DB query:

```typescript
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    assertMaxLength(args.name, MAX_NAME, "name");
    assertArrayLimits(args.difficulties, MAX_PREF_ARRAY, MAX_PREF_ITEM, "difficulties");
    assertArrayLimits(args.strengths, MAX_PREF_ARRAY, MAX_PREF_ITEM, "strengths");
    assertArrayLimits(args.bestWorkTimes, MAX_PREF_ARRAY, MAX_PREF_ITEM, "bestWorkTimes");

    const userId = identity.subject;
```

**Step 3: Standardize auth errors — replace `throw new Error("Not authenticated")` with `throw new ConvexError("Unauthenticated")`**

In `setNotificationsEnabled` handler (line 54), change:
```typescript
    if (!identity) throw new ConvexError("Unauthenticated");
```

In `save` handler (line 88), change:
```typescript
    if (!identity) throw new ConvexError("Unauthenticated");
```

**Step 4: Commit**

```bash
git add apps/convex/convex/preferences.ts
git commit -m "feat: add input validation and standardize auth errors in preferences"
```

---

## Task 4: Add input validation to settings.ts and standardize auth errors

**Files:**
- Modify: `apps/convex/convex/settings.ts:1-70`

**Step 1: Add imports**

At the top of `apps/convex/convex/settings.ts`, add:

```typescript
import { ConvexError } from "convex/values";
import {
  assertMaxLength,
  MAX_STT_MODEL,
  MAX_STT_LOCALE,
} from "./lib/validation";
```

**Step 2: Add validation to setSttSettings handler**

In the `setSttSettings` handler, after the auth check, add:

```typescript
    if (!identity) throw new ConvexError("Unauthenticated");

    if (args.sttModel !== undefined) {
      assertMaxLength(args.sttModel, MAX_STT_MODEL, "sttModel");
    }
    if (args.sttLocale !== undefined) {
      assertMaxLength(args.sttLocale, MAX_STT_LOCALE, "sttLocale");
    }
```

**Step 3: Standardize auth errors**

Replace all `throw new Error("Not authenticated")` with `throw new ConvexError("Unauthenticated")` in both `setUserAiEnabled` (line 22) and `setSttSettings` (line 48).

Add `ConvexError` to the import from `"convex/values"`:
```typescript
import { v, ConvexError } from "convex/values";
```

Wait — `ConvexError` is already imported separately in the plan. The actual import should be:
```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";
```
Or combine them:
```typescript
import { v, ConvexError } from "convex/values";
```

**Step 4: Commit**

```bash
git add apps/convex/convex/settings.ts
git commit -m "feat: add input validation and standardize auth errors in settings"
```

---

## Task 5: Sanitize user data in AI prompts and redact error responses

**Files:**
- Modify: `apps/convex/convex/ai.ts:74-83, 106-108`

**Step 1: Add import**

At the top of `apps/convex/convex/ai.ts`, add:

```typescript
import { sanitizeForPrompt } from "./lib/validation";
```

**Step 2: Sanitize preference values before embedding in prompt**

Replace lines 74-82 with:

```typescript
    if (prefs) {
      const difficulties = prefs.difficulties.map(sanitizeForPrompt).join(", ");
      const strengths = prefs.strengths.map(sanitizeForPrompt).join(", ");
      const bestWorkTimes = prefs.bestWorkTimes.map(sanitizeForPrompt).join(", ");

      systemPrompt +=
        "\n\nUser context:" +
        `\n- Finds these challenging: ${difficulties}` +
        `\n- Enjoys and is good at: ${strengths}` +
        `\n- Most productive during: ${bestWorkTimes}` +
        "\n\nUse this context to personalize the difficulty score. " +
        "Tasks related to their challenges should score higher. " +
        "Tasks aligned with their strengths should score lower.";
    }
```

**Step 3: Sanitize the task title before sending to AI**

Before the `fetch` call (around line 86), add:

```typescript
    const sanitizedTitle = sanitizeForPrompt(title).slice(0, 500);
```

Then use `sanitizedTitle` instead of `title` in the messages array:

```typescript
            {
              role: "user",
              content: sanitizedTitle,
            },
```

**Step 4: Redact API error responses on auth failures**

Replace line 107:
```typescript
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
```

With:
```typescript
        if (response.status === 401 || response.status === 403) {
          throw new Error(`OpenRouter HTTP ${response.status}: [response redacted]`);
        }
        throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
```

**Step 5: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "fix: sanitize user data in AI prompts and redact auth error responses"
```

---

## Task 6: Fix PointsToast stale closure bug

**Files:**
- Modify: `apps/mobile/src/components/PointsToast.tsx:17-32`

**Step 1: Store onDone in a ref to avoid re-triggering the animation**

Replace the component body (lines 17-32) with:

```typescript
export function PointsToast({ points, visible, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible) return;
    translateY.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(() => onDoneRef.current())();
      })
    );
    translateY.value = withTiming(-40, { duration: 1100 });
  }, [visible]);
```

Add `useRef` to the React import:
```typescript
import { useEffect, useRef } from "react";
```

**Step 2: Verify the app builds**

Run: `cd apps/mobile && npx expo start` (verify no TypeScript/build errors)

**Step 3: Commit**

```bash
git add apps/mobile/src/components/PointsToast.tsx
git commit -m "fix: PointsToast stale closure by using ref for onDone callback"
```

---

## Task 7: Add migration idempotency guard

**Files:**
- Modify: `apps/convex/convex/migration.ts:4-9`

**Step 1: Add an early-exit check to prevent double-migration**

In the `migrateUserData` handler, add a guard at the top of the handler (after the console.log):

```typescript
  handler: async (ctx, { oldUserId, newUserId }) => {
    console.log(`[migration] migrating user data: ${oldUserId} → ${newUserId}`);

    // Idempotency guard: if oldUser has no data, migration already ran
    const oldPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    const oldTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .collect();
    const oldSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();
    const oldProgress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", oldUserId))
      .first();

    if (!oldPrefs && oldTasks.length === 0 && !oldSettings && !oldProgress) {
      console.log(`[migration] no data found for ${oldUserId}, skipping (already migrated?)`);
      return;
    }
```

Then continue with the existing migration logic (but reuse `oldPrefs`, `oldTasks`, `oldSettings`, `oldProgress` instead of re-querying). The `prefs` variable becomes `oldPrefs`, `tasks` becomes `oldTasks`, etc.

**Step 2: Refactor existing code to use the pre-fetched data**

Replace the existing preference migration block:
```typescript
    // Migrate userPreferences
    if (oldPrefs) {
      console.log(`[migration] found preferences for old user, migrating`);
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldPrefs._id);
      } else {
        await ctx.db.patch(oldPrefs._id, { userId: newUserId });
      }
    }
```

Replace tasks block:
```typescript
    // Migrate tasks
    console.log(`[migration] migrating ${oldTasks.length} tasks`);
    for (const task of oldTasks) {
      await ctx.db.patch(task._id, { userId: newUserId });
    }
```

Replace settings block:
```typescript
    // Migrate userSettings
    if (oldSettings) {
      const existing = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldSettings._id);
      } else {
        await ctx.db.patch(oldSettings._id, { userId: newUserId });
      }
    }
```

Replace progress block:
```typescript
    // Migrate userProgress
    if (oldProgress) {
      const existing = await ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", newUserId))
        .first();
      if (existing) {
        await ctx.db.delete(oldProgress._id);
      } else {
        await ctx.db.patch(oldProgress._id, { userId: newUserId });
      }
    }
```

**Step 3: Commit**

```bash
git add apps/convex/convex/migration.ts
git commit -m "fix: add idempotency guard to user migration to prevent data loss"
```

---

## Task 8: Move hardcoded Convex URLs to environment variables

**Files:**
- Modify: `apps/convex/convex/auth.ts:38,41`
- Modify: `apps/convex/convex/auth.config.ts:6,9`

**Step 1: Update auth.ts**

Replace the hardcoded URLs (lines 36-42):

```typescript
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
```

**Step 2: Update auth.config.ts**

Replace the entire file:

```typescript
// apps/convex/convex/auth.config.ts
export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
      algorithm: "RS256",
      jwks: `${process.env.CONVEX_SITE_URL!}/api/auth/convex/jwks`,
    },
  ],
};
```

**Step 3: Ensure CONVEX_SITE_URL is set in `.env.local`**

Verify that the environment variable is configured in the Convex dashboard or `.env.local`:

```
CONVEX_SITE_URL=https://affable-tiger-74.eu-west-1.convex.site
```

> **Important:** Convex environment variables need to be set via `npx convex env set CONVEX_SITE_URL https://affable-tiger-74.eu-west-1.convex.site` for the deployed environment. Check the Convex dashboard to confirm.

**Step 4: Commit**

```bash
git add apps/convex/convex/auth.ts apps/convex/convex/auth.config.ts
git commit -m "fix: move hardcoded Convex URLs to CONVEX_SITE_URL env variable"
```

---

## Task 9: Harden .gitignore

**Files:**
- Modify: `apps/convex/.gitignore`

**Step 1: Expand the gitignore**

Replace the contents of `apps/convex/.gitignore` with:

```
.env
.env.local
.env.*.local
```

**Step 2: Commit**

```bash
git add apps/convex/.gitignore
git commit -m "fix: expand .gitignore to cover additional .env patterns"
```

---

## Task 10: Final verification

**Step 1: Run the Convex type checker**

```bash
cd apps/convex && npx convex dev --once
```

Expected: No type errors, deployment succeeds.

**Step 2: Run the mobile app type checker**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No type errors.

**Step 3: Create a final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address type errors from security hardening"
```

---

## Summary of changes by severity

| Severity | Issue | Task |
|----------|-------|------|
| Critical | Hardcoded Convex URLs | Task 8 |
| High | Prompt injection via preferences | Task 5 |
| High | Prompt injection via task titles | Task 5 |
| High | API error leaking sensitive data | Task 5 |
| High | Race condition in migration | Task 7 |
| Medium | No input length validation | Tasks 2, 3, 4 |
| Medium | No array size validation | Task 3 |
| Medium | No date/time format validation | Task 2 |
| Medium | Inconsistent auth errors | Tasks 3, 4 |
| Medium | PointsToast stale closure | Task 6 |
| Low | Incomplete .gitignore | Task 9 |

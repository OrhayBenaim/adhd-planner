# Tech Debt: Critical & High Priority Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all Critical (4) and High (7) priority issues from `docs/tech-debt-audit.md`, plus 2 easy-win Medium items.

**Architecture:** Backend-first approach. Start with test infrastructure, then security fixes, then refactor shared helpers, then performance. Frontend fixes last. Each task is a single commit. All backend changes are in `apps/convex/convex/`. All mobile changes are in `apps/mobile/src/`.

**Tech Stack:** Convex 1.32.0, better-auth 1.4.9, React Native / Expo, TypeScript, vitest + convex-test (new)

**Reference:** `docs/tech-debt-audit.md` — Priority Matrix (Section 14)

---

## Phase 1: Foundation

### Task 1: Set Up Convex Backend Test Infrastructure

**Audit items:** Prerequisite for all subsequent tasks

**Files:**
- Create: `apps/convex/vitest.config.ts`
- Create: `apps/convex/convex/tests/subscriptions.test.ts` (smoke test)
- Modify: `apps/convex/package.json`

**Step 1: Install test dependencies**

Run: `cd apps/convex && npm install --save-dev convex-test vitest @edge-runtime/vm`
Expected: packages installed, package.json updated

**Step 2: Create vitest config**

Create `apps/convex/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

**Step 3: Add test script to package.json**

In `apps/convex/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Create smoke test**

Create `apps/convex/convex/tests/subscriptions.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("isPremium returns false when no subscription exists", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(internal.subscriptions.isPremium, {
    userId: "nonexistent",
  });
  expect(result).toBe(false);
});
```

**Step 5: Run test to verify setup works**

Run: `cd apps/convex && npx vitest run`
Expected: 1 test PASS

**Step 6: Commit**

```bash
git add apps/convex/vitest.config.ts apps/convex/convex/tests/subscriptions.test.ts apps/convex/package.json apps/convex/package-lock.json
git commit -m "test: set up convex-test infrastructure with vitest"
```

---

### Task 2: Create Shared Constants File for Backend

**Audit items:** 4.1 — Hardcoded values & magic numbers

**Files:**
- Create: `apps/convex/convex/lib/constants.ts`
- Modify: `apps/convex/convex/streaks.ts:28,62,109`
- Modify: `apps/convex/convex/insights.ts:12-13,74`
- Modify: `apps/convex/convex/http.ts:32-44,76-78`
- Modify: `apps/convex/convex/ai.ts:7-8`

**Step 1: Create constants file**

Create `apps/convex/convex/lib/constants.ts`:

```typescript
/** One day in milliseconds */
export const DAY_MS = 86_400_000;

/** RevenueCat event types that indicate an active subscription */
export const RC_ACTIVE_EVENTS = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "SUBSCRIPTION_EXTENDED",
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
```

**Step 2: Replace hardcoded values in streaks.ts**

In `apps/convex/convex/streaks.ts`, add import and replace all `86400000` occurrences:

```typescript
import { DAY_MS } from "./lib/constants";
```

- Line 28: `new Date(Date.now() - 86400000)` → `new Date(Date.now() - DAY_MS)`
- Line 62: Same replacement
- Line 109: `/ 86400000` → `/ DAY_MS`

**Step 3: Replace hardcoded values in insights.ts**

In `apps/convex/convex/insights.ts`, add import and replace:

```typescript
import { DAY_MS } from "./lib/constants";
```

- Line 12: `7 * 86400000` → `7 * DAY_MS`
- Line 13: `14 * 86400000` → `14 * DAY_MS`
- Line 74: `days * 86400000` → `days * DAY_MS`

**Step 4: Replace hardcoded values in http.ts**

In `apps/convex/convex/http.ts`, add import and replace event type arrays and credit logic:

```typescript
import { RC_ACTIVE_EVENTS, RC_INACTIVE_EVENTS, CREDIT_MULTIPLIERS } from "./lib/constants";
```

Replace lines 32-44 (the local `activeTypes`/`inactiveTypes` arrays) with the imported constants.

Replace lines 75-78 (credit amount calculation):
```typescript
const tier = Object.keys(CREDIT_MULTIPLIERS).find((t) => productId.includes(t));
const creditAmount = tier ? creditValue * CREDIT_MULTIPLIERS[tier] : 0;
```

**Step 5: Replace rate limit constants in ai.ts**

In `apps/convex/convex/ai.ts`, replace lines 7-8:

```typescript
import { AI_RATE_LIMIT_WINDOW_MS, AI_MAX_SCORES_PER_WINDOW } from "./lib/constants";
```

Remove the local `RATE_LIMIT_WINDOW_MS` and `MAX_SCORES_PER_WINDOW` constants. Update references at lines 174 and 179.

**Step 6: Run type check and commit**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

```bash
git add apps/convex/convex/lib/constants.ts apps/convex/convex/streaks.ts apps/convex/convex/insights.ts apps/convex/convex/http.ts apps/convex/convex/ai.ts
git commit -m "refactor: extract hardcoded values into shared constants"
```

---

## Phase 2: Critical Security

### Task 3: Harden Webhook Verification & Add Payload Validation

**Audit items:** 1.1 — Webhook verification vulnerability, 1.2 — No input validation

**Files:**
- Create: `apps/convex/convex/lib/webhook.ts`
- Create: `apps/convex/convex/tests/webhook.test.ts`
- Modify: `apps/convex/convex/http.ts`

**Step 1: Create webhook validation helpers**

Create `apps/convex/convex/lib/webhook.ts`:

```typescript
import { RC_ACTIVE_EVENTS, RC_INACTIVE_EVENTS } from "./constants";

/**
 * Classify a RevenueCat event type as active, inactive, or unknown.
 */
export function classifyEventType(
  eventType: string,
): "active" | "inactive" | null {
  if ((RC_ACTIVE_EVENTS as readonly string[]).includes(eventType))
    return "active";
  if ((RC_INACTIVE_EVENTS as readonly string[]).includes(eventType))
    return "inactive";
  return null;
}

export interface ValidatedSubscriptionEvent {
  appUserId: string;
  rcId: string;
  eventType: string;
  classification: "active" | "inactive";
  expirationAtMs?: number;
  productId?: string;
  periodType?: string;
}

export interface ValidatedCreditEvent {
  appUserId: string;
  eventType: "NON_RENEWING_PURCHASE";
  productId: string;
}

export type ValidatedEvent =
  | { kind: "subscription"; data: ValidatedSubscriptionEvent }
  | { kind: "credit"; data: ValidatedCreditEvent }
  | { kind: "ignored" };

/**
 * Validate and extract fields from a RevenueCat webhook body.
 * Returns null if the payload is malformed.
 */
export function validateWebhookPayload(body: unknown): ValidatedEvent | null {
  if (!body || typeof body !== "object") return null;

  const event = (body as Record<string, unknown>).event;
  if (!event || typeof event !== "object") return null;

  const e = event as Record<string, unknown>;
  const eventType = e.type;
  const appUserId = e.app_user_id;

  if (typeof eventType !== "string" || !eventType) return null;
  if (typeof appUserId !== "string" || !appUserId) return null;

  // Credit purchase
  if (eventType === "NON_RENEWING_PURCHASE") {
    const productId = e.product_id;
    if (typeof productId !== "string" || !productId) return null;
    return {
      kind: "credit",
      data: { appUserId, eventType, productId },
    };
  }

  // Subscription event
  const classification = classifyEventType(eventType);
  if (!classification) {
    return { kind: "ignored" };
  }

  const rcId = e.id ?? e.original_transaction_id ?? appUserId;
  if (typeof rcId !== "string") return null;

  return {
    kind: "subscription",
    data: {
      appUserId,
      rcId,
      eventType,
      classification,
      expirationAtMs:
        typeof e.expiration_at_ms === "number"
          ? e.expiration_at_ms
          : undefined,
      productId: typeof e.product_id === "string" ? e.product_id : undefined,
      periodType:
        typeof e.period_type === "string" ? e.period_type : undefined,
    },
  };
}
```

**Step 2: Write tests for webhook validation**

Create `apps/convex/convex/tests/webhook.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import {
  classifyEventType,
  validateWebhookPayload,
} from "../lib/webhook";

describe("classifyEventType", () => {
  test("returns 'active' for INITIAL_PURCHASE", () => {
    expect(classifyEventType("INITIAL_PURCHASE")).toBe("active");
  });

  test("returns 'inactive' for CANCELLATION", () => {
    expect(classifyEventType("CANCELLATION")).toBe("inactive");
  });

  test("returns null for unknown event type", () => {
    expect(classifyEventType("UNKNOWN_EVENT")).toBeNull();
  });
});

describe("validateWebhookPayload", () => {
  test("returns null for non-object body", () => {
    expect(validateWebhookPayload(null)).toBeNull();
    expect(validateWebhookPayload("string")).toBeNull();
  });

  test("returns null when event is missing", () => {
    expect(validateWebhookPayload({})).toBeNull();
  });

  test("returns null when app_user_id is missing", () => {
    expect(
      validateWebhookPayload({ event: { type: "RENEWAL" } }),
    ).toBeNull();
  });

  test("returns subscription event for valid RENEWAL", () => {
    const result = validateWebhookPayload({
      event: {
        type: "RENEWAL",
        app_user_id: "user123",
        id: "txn_abc",
        product_id: "premium_monthly",
        period_type: "NORMAL",
        expiration_at_ms: 1700000000000,
      },
    });
    expect(result).toEqual({
      kind: "subscription",
      data: {
        appUserId: "user123",
        rcId: "txn_abc",
        eventType: "RENEWAL",
        classification: "active",
        expirationAtMs: 1700000000000,
        productId: "premium_monthly",
        periodType: "NORMAL",
      },
    });
  });

  test("returns credit event for NON_RENEWING_PURCHASE", () => {
    const result = validateWebhookPayload({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "user123",
        product_id: "credits_small",
      },
    });
    expect(result).toEqual({
      kind: "credit",
      data: {
        appUserId: "user123",
        eventType: "NON_RENEWING_PURCHASE",
        productId: "credits_small",
      },
    });
  });

  test("returns ignored for unrecognized event type", () => {
    const result = validateWebhookPayload({
      event: {
        type: "TRANSFER",
        app_user_id: "user123",
      },
    });
    expect(result).toEqual({ kind: "ignored" });
  });

  test("returns null for NON_RENEWING_PURCHASE without product_id", () => {
    const result = validateWebhookPayload({
      event: {
        type: "NON_RENEWING_PURCHASE",
        app_user_id: "user123",
      },
    });
    expect(result).toBeNull();
  });
});
```

**Step 3: Run tests to verify they pass**

Run: `cd apps/convex && npx vitest run`
Expected: All webhook tests PASS

**Step 4: Rewrite http.ts to use validation helpers**

Replace the entire `apps/convex/convex/http.ts` with:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { validateWebhookPayload } from "./lib/webhook";
import { CREDIT_MULTIPLIERS } from "./lib/constants";
import { sentryCaptureEvent } from "./lib/sentry";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Fail closed: reject if secret is not configured
    const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedToken) {
      await sentryCaptureEvent(
        "error",
        "[Webhook] REVENUECAT_WEBHOOK_SECRET is not configured",
        {},
      );
      return new Response("Server misconfigured", { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${expectedToken}`) {
      await sentryCaptureEvent("warning", "[Webhook] Unauthorized request", {
        ip: request.headers.get("x-forwarded-for"),
      });
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const validated = validateWebhookPayload(body);
    if (validated === null) {
      await sentryCaptureEvent("warning", "[Webhook] Invalid payload", {
        body: JSON.stringify(body).slice(0, 500),
      });
      return new Response("Invalid payload", { status: 400 });
    }

    if (validated.kind === "ignored") {
      return new Response("OK", { status: 200 });
    }

    if (validated.kind === "subscription") {
      const d = validated.data;
      await ctx.runMutation(internal.subscriptions.upsertFromWebhook, {
        userId: d.appUserId,
        revenueCatId: d.rcId,
        entitlement: "premium",
        isActive: d.classification === "active",
        expiresAt: d.expirationAtMs
          ? new Date(d.expirationAtMs).toISOString()
          : undefined,
        productId: d.productId,
        periodType: d.periodType,
      });
    }

    if (validated.kind === "credit") {
      const d = validated.data;
      const creditValue = await ctx.runQuery(internal.appConfig.get, {
        key: "aiCreditValue",
      });
      const tier = Object.keys(CREDIT_MULTIPLIERS).find((t) =>
        d.productId.includes(t),
      );
      const creditAmount = tier ? creditValue * CREDIT_MULTIPLIERS[tier] : 0;

      if (creditAmount > 0) {
        await ctx.runMutation(internal.credits.addCredits, {
          userId: d.appUserId,
          amount: creditAmount,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

**Step 5: Run type check**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/convex/convex/lib/webhook.ts apps/convex/convex/tests/webhook.test.ts apps/convex/convex/http.ts
git commit -m "security: harden webhook auth (fail-closed) and add payload validation"
```

---

### Task 4: Fix Premium Expiration Check

**Audit items:** 1.4 — Premium expiration not checked

**Files:**
- Modify: `apps/convex/convex/subscriptions.ts:4-12`
- Modify: `apps/convex/convex/tests/subscriptions.test.ts`

**Step 1: Write failing tests**

Add to `apps/convex/convex/tests/subscriptions.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("isPremium", () => {
  test("returns false when no subscription exists", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "nonexistent",
    });
    expect(result).toBe(false);
  });

  test("returns true for active subscription without expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
    });
    expect(result).toBe(true);
  });

  test("returns false for inactive subscription", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: false,
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
    });
    expect(result).toBe(false);
  });

  test("returns false for active subscription with past expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2020-01-01T00:00:00.000Z", // expired
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
    });
    expect(result).toBe(false);
  });

  test("returns true for active subscription with future expiration", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "user1",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
        expiresAt: "2099-01-01T00:00:00.000Z", // far future
      });
    });
    const result = await t.query(internal.subscriptions.isPremium, {
      userId: "user1",
    });
    expect(result).toBe(true);
  });
});
```

**Step 2: Run tests — expect failure on expiration test**

Run: `cd apps/convex && npx vitest run`
Expected: "returns false for active subscription with past expiration" FAILS (current code returns `true`)

**Step 3: Fix isPremium to check expiration**

In `apps/convex/convex/subscriptions.ts`, replace the `isPremium` handler (lines 6-12):

```typescript
export const isPremium = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!sub?.isActive) return false;
    if (sub.expiresAt && new Date(sub.expiresAt) <= new Date()) return false;
    return true;
  },
});
```

**Step 4: Run tests — all should pass**

Run: `cd apps/convex && npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/convex/convex/subscriptions.ts apps/convex/convex/tests/subscriptions.test.ts
git commit -m "security: check subscription expiration in isPremium"
```

---

## Phase 3: Auth & Premium Middleware

### Task 5: Create Shared `requireAuth` Helper

**Audit items:** 2.1 — No centralized auth middleware (71+ repetitions)

**Files:**
- Create: `apps/convex/convex/lib/auth.ts`
- Modify: `apps/convex/convex/tasks.ts:17-21` (remove local `requireAuth`)
- Modify: `apps/convex/convex/settings.ts` (replace inline auth checks)
- Modify: `apps/convex/convex/streaks.ts` (replace inline auth check)
- Modify: `apps/convex/convex/insights.ts` (replace inline auth checks)
- Modify: `apps/convex/convex/preferences.ts` (replace inline auth checks)
- Modify: `apps/convex/convex/account.ts` (replace inline auth check)
- Modify: `apps/convex/convex/progress.ts` (replace inline auth check)
- Modify: `apps/convex/convex/pushTokens.ts` (replace inline auth check)

**Step 1: Create shared auth helper**

Create `apps/convex/convex/lib/auth.ts`:

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Require authenticated user identity. Throws ConvexError if unauthenticated.
 * Returns the userId (identity.subject).
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}
```

**Step 2: Migrate tasks.ts**

In `apps/convex/convex/tasks.ts`:

1. Add import: `import { requireAuth } from "./lib/auth";`
2. Remove local `requireAuth` function (lines 17-21)
3. Remove the `ConvexError` import from `"convex/values"` (if no other usages) — actually `ConvexError` is still used at line 88 and 140 and 156, so keep it.

No other changes — `requireAuth(ctx)` call signature is identical.

**Step 3: Migrate settings.ts**

In `apps/convex/convex/settings.ts`:

1. Add import: `import { requireAuth } from "./lib/auth";`
2. Replace every inline auth pattern. There are 4 occurrences (lines 13-14, 26-27, 50-51, 87-88):

Before (repeated 4 times):
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Unauthenticated");
// then uses identity.subject
```

After (each occurrence):
```typescript
const userId = await requireAuth(ctx);
```

Remove `ConvexError` from the import if no other usages remain.

**Step 4: Migrate remaining files**

Apply the same pattern to each file. In each:
1. Add `import { requireAuth } from "./lib/auth";`
2. Replace `const identity = await ctx.auth.getUserIdentity(); if (!identity) throw ...` with `const userId = await requireAuth(ctx);`
3. Replace subsequent `identity.subject` with `userId`

Files and occurrences:
- `streaks.ts`: 1 occurrence (line 15-16)
- `insights.ts`: 2 occurrences (lines 7-8, 70-71)
- `preferences.ts`: 3 occurrences (lines 13-14, 27-28, lines in `save` and `update` mutations)
- `account.ts`: 1 occurrence (lines 7-8)
- `progress.ts`: 1 occurrence
- `pushTokens.ts`: 1 occurrence

**Step 5: Run type check and tests**

Run: `cd apps/convex && npx tsc --noEmit && npx vitest run`
Expected: No type errors, all tests pass

**Step 6: Commit**

```bash
git add apps/convex/convex/lib/auth.ts apps/convex/convex/tasks.ts apps/convex/convex/settings.ts apps/convex/convex/streaks.ts apps/convex/convex/insights.ts apps/convex/convex/preferences.ts apps/convex/convex/account.ts apps/convex/convex/progress.ts apps/convex/convex/pushTokens.ts
git commit -m "refactor: centralize auth into shared requireAuth helper"
```

---

### Task 6: Add Server-Side Premium Enforcement

**Audit items:** 1.3 — Premium features gated client-side only, 2.2 — No premium check middleware

**Files:**
- Modify: `apps/convex/convex/lib/auth.ts` (add `checkPremium`)
- Modify: `apps/convex/convex/insights.ts` (add premium gate)
- Modify: `apps/convex/convex/streaks.ts:55-59` (use shared helper)
- Create: `apps/convex/convex/tests/auth.test.ts`

**Step 1: Write failing test for premium check**

Create `apps/convex/convex/tests/auth.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("premium gated queries", () => {
  test("insights getWeeklyReport requires premium", async () => {
    const t = convexTest(schema, modules);
    // Create user without premium subscription
    const asUser = t.withIdentity({ name: "Free", subject: "free_user" });

    // Should throw because user is not premium
    const { api } = await import("../_generated/api");
    await expect(
      asUser.query(api.insights.getWeeklyReport),
    ).rejects.toThrow(/[Pp]remium/);
  });

  test("insights getWeeklyReport works for premium users", async () => {
    const t = convexTest(schema, modules);
    // Create premium subscription
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: "premium_user",
        revenueCatId: "rc_1",
        entitlement: "premium",
        isActive: true,
      });
    });

    const asUser = t.withIdentity({ name: "Pro", subject: "premium_user" });
    const { api } = await import("../_generated/api");
    const result = await asUser.query(api.insights.getWeeklyReport);
    expect(result).toBeDefined();
  });
});
```

**Step 2: Run tests — expect failure**

Run: `cd apps/convex && npx vitest run`
Expected: "insights getWeeklyReport requires premium" FAILS (no premium gate exists)

**Step 3: Add `checkPremium` helper to auth.ts**

Append to `apps/convex/convex/lib/auth.ts`:

```typescript
/**
 * Check if user has active premium subscription.
 * For use in mutations that can't call runQuery (direct DB access).
 */
export async function checkPremium(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<boolean> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!sub?.isActive) return false;
  if (sub.expiresAt && new Date(sub.expiresAt) <= new Date()) return false;
  return true;
}

/**
 * Require active premium subscription. Throws ConvexError if not premium.
 * For use in queries/mutations that gate premium features.
 */
export async function requirePremium(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<void> {
  const isPremium = await checkPremium(ctx, userId);
  if (!isPremium) {
    throw new ConvexError("Premium subscription required");
  }
}
```

**Step 4: Add premium gate to insights.ts**

In `apps/convex/convex/insights.ts`:

1. Add import: `import { requireAuth, requirePremium } from "./lib/auth";`
2. In `getWeeklyReport` handler, after `requireAuth`:

```typescript
handler: async (ctx) => {
  const userId = await requireAuth(ctx);
  await requirePremium(ctx, userId);
  // ... rest unchanged
},
```

3. In `getCompletionTrends` handler, same pattern:

```typescript
handler: async (ctx, { days = 30 }) => {
  const userId = await requireAuth(ctx);
  await requirePremium(ctx, userId);
  // ... rest unchanged
},
```

**Step 5: Replace inline premium check in streaks.ts**

In `apps/convex/convex/streaks.ts`, replace lines 55-59 in `updateOnCompletion`:

Before:
```typescript
const sub = await ctx.db
  .query("subscriptions")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .first();
const isPremium = sub?.isActive ?? false;
```

After:
```typescript
import { checkPremium } from "./lib/auth";
// ...
const isPremium = await checkPremium(ctx, userId);
```

**Step 6: Run tests — all should pass**

Run: `cd apps/convex && npx vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add apps/convex/convex/lib/auth.ts apps/convex/convex/insights.ts apps/convex/convex/streaks.ts apps/convex/convex/tests/auth.test.ts
git commit -m "security: add server-side premium enforcement for insights and streaks"
```

---

## Phase 4: Code Deduplication

### Task 7: Extract Shared `deleteAllUserData` Helper

**Audit items:** 6.1 — Duplicate account deletion & migration cleanup

**Files:**
- Create: `apps/convex/convex/lib/deleteUserData.ts`
- Modify: `apps/convex/convex/account.ts:4-115` (simplify to use helper)
- Modify: `apps/convex/convex/migration.ts:206-273` (simplify to use helper)
- Create: `apps/convex/convex/tests/deleteUserData.test.ts`

**Step 1: Create the shared helper**

Create `apps/convex/convex/lib/deleteUserData.ts`:

```typescript
import { MutationCtx } from "../_generated/server";

/** Tables with single record per user (query .first()) */
const SINGLE_TABLES = [
  "userSettings",
  "userProgress",
  "userPreferences",
  "userCosts",
  "subscriptions",
  "aiCredits",
  "streaks",
] as const;

/** Tables with multiple records per user (query .collect()) */
const MULTI_TABLES = [
  "tasks",
  "aiScoringAudit",
  "pushTokens",
  "achievements",
  "coachNotificationLog",
] as const;

/**
 * Delete all data for a user across all tables.
 * Used by both account deletion and migration cleanup.
 */
export async function deleteAllUserData(
  ctx: MutationCtx,
  userId: string,
): Promise<void> {
  // Delete single-record tables
  for (const table of SINGLE_TABLES) {
    const record = await ctx.db
      .query(table)
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    if (record) await ctx.db.delete(record._id);
  }

  // Delete multi-record tables
  for (const table of MULTI_TABLES) {
    const records = await ctx.db
      .query(table)
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const record of records) {
      await ctx.db.delete(record._id);
    }
  }

  // monthlyAiCosts uses a different index
  const monthlyCosts = await ctx.db
    .query("monthlyAiCosts")
    .withIndex("by_user_month", (q: any) => q.eq("userId", userId))
    .collect();
  for (const mc of monthlyCosts) {
    await ctx.db.delete(mc._id);
  }
}
```

**Step 2: Write test for the helper**

Create `apps/convex/convex/tests/deleteUserData.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("deleteAccount removes all user data", async () => {
  const t = convexTest(schema, modules);

  // Seed data for user
  await t.run(async (ctx) => {
    await ctx.db.insert("tasks", {
      userId: "user1",
      title: "Test",
      difficulty: 50,
      completed: false,
      dueDate: "2026-03-13",
      dueTime: "10:00",
    });
    await ctx.db.insert("userSettings", {
      userId: "user1",
      aiEnabled: true,
    });
    await ctx.db.insert("userProgress", {
      userId: "user1",
      level: 1,
      points: 0,
      pointsToNextLevel: 50,
    });
    await ctx.db.insert("streaks", {
      userId: "user1",
      currentStreak: 5,
      longestStreak: 5,
      lastCompletionDate: "2026-03-13",
      freezesUsedThisWeek: 0,
      weekStart: "2026-03-10",
    });
  });

  // Delete account
  const asUser = t.withIdentity({ name: "Test", subject: "user1" });
  const { api } = await import("../_generated/api");
  await asUser.mutation(api.account.deleteAccount);

  // Verify all data is gone
  await t.run(async (ctx) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .collect();
    expect(tasks).toHaveLength(0);

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .first();
    expect(settings).toBeNull();

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", "user1"))
      .first();
    expect(streak).toBeNull();
  });
});
```

**Step 3: Simplify account.ts**

Replace `apps/convex/convex/account.ts`:

```typescript
import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { deleteAllUserData } from "./lib/deleteUserData";

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    await deleteAllUserData(ctx, userId);
  },
});
```

**Step 4: Simplify migration.ts cleanupOldUserData**

In `apps/convex/convex/migration.ts`, replace the `cleanupOldUserData` handler (lines 206-273):

```typescript
import { deleteAllUserData } from "./lib/deleteUserData";

export const cleanupOldUserData = internalMutation({
  args: { oldUserId: v.string() },
  handler: async (ctx, { oldUserId }) => {
    await deleteAllUserData(ctx, oldUserId);
  },
});
```

Remove the `console.log` calls (audit item 1.5).

**Step 5: Run tests**

Run: `cd apps/convex && npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add apps/convex/convex/lib/deleteUserData.ts apps/convex/convex/tests/deleteUserData.test.ts apps/convex/convex/account.ts apps/convex/convex/migration.ts
git commit -m "refactor: extract shared deleteAllUserData helper, deduplicate account deletion"
```

---

### Task 8: Consolidate Settings Upsert Pattern

**Audit items:** 6.2 — Settings upsert 3x repetition

**Files:**
- Create: `apps/convex/convex/lib/upsert.ts`
- Modify: `apps/convex/convex/settings.ts:23-106`

**Step 1: Create upsert helper**

Create `apps/convex/convex/lib/upsert.ts`:

```typescript
import { MutationCtx } from "../_generated/server";

const SETTINGS_DEFAULTS = {
  aiEnabled: true,
  userAiEnabled: true,
  notificationsEnabled: false,
} as const;

/**
 * Get-or-create userSettings, then patch the given fields.
 */
export async function upsertUserSetting(
  ctx: MutationCtx,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const existing = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, patch);
  } else {
    await ctx.db.insert("userSettings", {
      userId,
      ...SETTINGS_DEFAULTS,
      ...patch,
    });
  }
}
```

**Step 2: Simplify settings.ts mutations**

In `apps/convex/convex/settings.ts`, replace the three mutation handlers:

```typescript
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { upsertUserSetting } from "./lib/upsert";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const setUserAiEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    await upsertUserSetting(ctx, userId, { userAiEnabled: enabled });
  },
});

export const registerDeviceId = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    // Skip patch if deviceId unchanged
    if (existing?.deviceId === deviceId) return;
    await upsertUserSetting(ctx, userId, { deviceId });
  },
});

export const setNotificationsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await requireAuth(ctx);
    await upsertUserSetting(ctx, userId, { notificationsEnabled: enabled });
  },
});

export const getDeviceId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.deviceId ?? null;
  },
});
```

**Step 3: Run type check and tests**

Run: `cd apps/convex && npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

**Step 4: Commit**

```bash
git add apps/convex/convex/lib/upsert.ts apps/convex/convex/settings.ts
git commit -m "refactor: consolidate settings upsert into shared helper"
```

---

## Phase 5: Data Model Cleanup

### Task 9: Stop Using `userCosts` Table

**Audit items:** 5.1 — userCosts / monthlyAiCosts dual tracking

**Files:**
- Modify: `apps/convex/convex/ai.ts:46-64,339-341` (stop using `accumulateUserCost`)
- Create: `apps/convex/convex/tests/aiCosts.test.ts`

The `userCosts` table is redundant with `monthlyAiCosts`. We stop writing to it and derive lifetime cost from monthly aggregation. The table definition stays in schema temporarily (safe to remove later after data cleanup).

**Step 1: Write test for lifetime cost aggregation**

Create `apps/convex/convex/tests/aiCosts.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

test("getLifetimeCost aggregates all monthly costs for a user", async () => {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("monthlyAiCosts", {
      userId: "user1",
      month: "2026-01",
      totalCost: 0.5,
    });
    await ctx.db.insert("monthlyAiCosts", {
      userId: "user1",
      month: "2026-02",
      totalCost: 0.3,
    });
  });

  const result = await t.query(internal.ai.getLifetimeCost, {
    userId: "user1",
  });
  expect(result).toBeCloseTo(0.8);
});

test("getLifetimeCost returns 0 for new user", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(internal.ai.getLifetimeCost, {
    userId: "nobody",
  });
  expect(result).toBe(0);
});
```

**Step 2: Run tests — expect failure**

Run: `cd apps/convex && npx vitest run`
Expected: FAIL — `getLifetimeCost` doesn't exist yet

**Step 3: Add getLifetimeCost and remove accumulateUserCost usage**

In `apps/convex/convex/ai.ts`:

1. Add `getLifetimeCost` query (replaces `accumulateUserCost` for reads):

```typescript
export const getLifetimeCost = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_user_month", (q) => q.eq("userId", userId))
      .collect();
    return rows.reduce((sum, r) => sum + r.totalCost, 0);
  },
});
```

2. In `scoreTaskDifficulty`, replace lines 339-341 (the `accumulateUserCost` call and cost alert):

Before:
```typescript
const newTotal = await ctx.runMutation(internal.ai.accumulateUserCost, {
  userId, cost: costFromResponse,
});
```

After:
```typescript
const newTotal = await ctx.runQuery(internal.ai.getLifetimeCost, {
  userId,
});
```

3. Keep the `accumulateUserCost` mutation for now (don't delete yet — other consumers might exist), but add a deprecation comment:

```typescript
/** @deprecated Use getLifetimeCost instead. Kept for backward compat until userCosts table cleanup. */
export const accumulateUserCost = internalMutation({ ... });
```

**Step 4: Run tests**

Run: `cd apps/convex && npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/convex/convex/ai.ts apps/convex/convex/tests/aiCosts.test.ts
git commit -m "refactor: derive lifetime cost from monthlyAiCosts, deprecate userCosts"
```

---

## Phase 6: Performance

### Task 10: Add Missing Database Indexes

**Audit items:** 13.2 — Missing database indexes

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Add compound indexes**

In `apps/convex/convex/schema.ts`:

For `tasks` table (line 13), add a second index:
```typescript
tasks: defineTable({
  userId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  difficulty: v.number(),
  completed: v.boolean(),
  dueDate: v.string(),
  dueTime: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_user_completed", ["userId", "completed"]),
```

For `coachNotificationLog` table (line 115), add a second index:
```typescript
coachNotificationLog: defineTable({
  userId: v.string(),
  date: v.string(),
  type: v.string(),
  message: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "date"]),
```

**Step 2: Run type check**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors. Note: indexes are created automatically on next `convex deploy`.

**Step 3: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "perf: add compound indexes for tasks and coachNotificationLog"
```

---

### Task 11: Add Task List Filtering & Limit Insights Queries

**Audit items:** 13.1 — `.collect()` on all user tasks (no pagination)

**Files:**
- Modify: `apps/convex/convex/tasks.ts:35-44` (use new index)
- Modify: `apps/convex/convex/insights.ts:15-18` (filter by date, not collect all)

**Step 1: Update tasks.list to use compound index**

In `apps/convex/convex/tasks.ts`, replace the `list` handler (lines 37-44):

```typescript
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("by_user_completed", (q) =>
        q.eq("userId", userId).eq("completed", false),
      )
      .collect();
  },
});
```

This eliminates the full table scan + in-memory filter.

**Step 2: Update insights getWeeklyReport to filter by date**

In `apps/convex/convex/insights.ts`, replace the `.collect()` + filter pattern in `getWeeklyReport` (lines 15-28):

```typescript
handler: async (ctx) => {
  const userId = await requireAuth(ctx);
  await requirePremium(ctx, userId);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

  // Only fetch completed tasks from last 2 weeks (not ALL tasks ever)
  const recentTasks = await ctx.db
    .query("tasks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("completed"), true),
        q.gte(q.field("_creationTime"), twoWeeksAgo.getTime()),
      ),
    )
    .collect();

  const completedThisWeek = recentTasks.filter(
    (t) => t._creationTime >= weekAgo.getTime(),
  );
  const completedLastWeek = recentTasks.filter(
    (t) => t._creationTime < weekAgo.getTime(),
  );

  // ... rest unchanged
},
```

**Step 3: Run type check and tests**

Run: `cd apps/convex && npx tsc --noEmit && npx vitest run`
Expected: No errors, all tests pass

**Step 4: Commit**

```bash
git add apps/convex/convex/tasks.ts apps/convex/convex/insights.ts
git commit -m "perf: use compound index for task list, limit insights to 2-week window"
```

---

### Task 12: Parallelize `needsOnboarding` Queries

**Audit items:** 3.3 — Sequential queries in needsOnboarding

**Files:**
- Modify: `apps/convex/convex/preferences.ts:24-55`

**Step 1: Replace sequential queries with Promise.all**

In `apps/convex/convex/preferences.ts`, replace the `needsOnboarding` handler:

```typescript
export const needsOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const userId = identity.subject;

    const [prefs, hasTask, hasProgress] = await Promise.all([
      ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db
        .query("userProgress")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
    ]);

    if (prefs?.onboardingCompleted) return false;
    if (hasTask) return false;
    if (hasProgress) return false;

    return true;
  },
});
```

Note: This doesn't use `requireAuth` because `needsOnboarding` intentionally returns `false` (not throw) for unauthenticated users.

**Step 2: Run type check**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/convex/convex/preferences.ts
git commit -m "perf: parallelize needsOnboarding database queries"
```

---

## Phase 7: Frontend Fixes

### Task 13: Fix PreferencesSheet Unstable `base` Object

**Audit items:** 10.1 — Unstable `base` object causes useCallback to re-create every render

**Files:**
- Modify: `apps/mobile/src/components/sheets/PreferencesSheet.tsx:105-124`

**Step 1: Wrap `base` in useMemo**

In `apps/mobile/src/components/sheets/PreferencesSheet.tsx`, replace lines 105-109:

Before:
```tsx
const base: PrefsFields = {
  bestWorkTimes: preferences?.bestWorkTimes ?? [],
  difficulties: preferences?.difficulties ?? [],
  strengths: preferences?.strengths ?? [],
};
```

After:
```tsx
const base: PrefsFields = useMemo(
  () => ({
    bestWorkTimes: preferences?.bestWorkTimes ?? [],
    difficulties: preferences?.difficulties ?? [],
    strengths: preferences?.strengths ?? [],
  }),
  [preferences?.bestWorkTimes, preferences?.difficulties, preferences?.strengths],
);
```

Make sure `useMemo` is imported from React at the top of the file.

**Step 2: Verify no type errors**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/PreferencesSheet.tsx
git commit -m "fix: wrap PreferencesSheet base object in useMemo to stabilize useCallback deps"
```

---

## Skipped Items (with reasoning)

### Audit 3.1 — HomeProvider 4 Separate Queries

**Recommendation: Do not consolidate.**

Convex uses WebSocket-based reactive subscriptions, not HTTP round-trips. Each `useQuery` subscribes independently over a single WebSocket connection. Combining into one query would:
- Lose granular reactivity (any change to tasks, progress, settings, OR streaks triggers a full re-render of everything)
- Fight Convex's intended usage pattern
- Add complexity for marginal latency improvement

The 4-query pattern is correct for Convex. No action needed.

### Audit 3.4 — scoreTaskDifficulty 7+ Internal Queries

This is an `internalAction` (not user-facing) that runs asynchronously in the background. The sequential queries are necessary because later queries depend on earlier results (e.g., cost ceiling depends on premium status). The function is already optimized with early returns. Not worth the complexity of bundling.

---

## Summary

| Task | Audit Items | Type |
|------|-------------|------|
| 1 | Prerequisite | Test infrastructure |
| 2 | 4.1, 4.2 | Constants |
| 3 | 1.1, 1.2 | **Critical security** |
| 4 | 1.4 | **Critical security** |
| 5 | 2.1 | High refactor |
| 6 | 1.3, 2.2 | **Critical security** |
| 7 | 6.1 | High refactor |
| 8 | 6.2 | Medium refactor |
| 9 | 5.1 | High data model |
| 10 | 13.2 | High performance |
| 11 | 13.1 | High performance |
| 12 | 3.3 | Medium performance |
| 13 | 10.1 | High frontend |

**Estimated commits:** 13

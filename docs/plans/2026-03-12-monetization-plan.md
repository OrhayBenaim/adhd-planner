# Monetization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement freemium monetization with RevenueCat — configurable AI cost ceilings, premium features (coach notifications, insights, achievements, streaks, widgets), and AI credit packs.

**Architecture:** RevenueCat manages subscriptions and IAP on mobile. Convex stores subscription status via webhook sync, enforces AI cost ceilings, and gates premium features server-side. Mobile shows Pro badges and a paywall screen — UI gating is cosmetic only, backend is source of truth.

**Tech Stack:** react-native-purchases (RevenueCat SDK), Convex (backend), Expo (widgets), expo-notifications (coach notifications)

**Design Doc:** `docs/plans/2026-03-12-monetization-design.md`

---

## Phase 1: Backend Foundation

### Task 1: Schema — Add Subscription, Config, Streaks, and Achievements Tables

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Add new tables to schema**

Add these tables to the existing `defineSchema({...})`:

```typescript
// Add to schema.ts inside defineSchema({...})

subscriptions: defineTable({
  userId: v.string(),
  revenueCatId: v.string(),
  entitlement: v.string(), // "premium"
  isActive: v.boolean(),
  expiresAt: v.optional(v.string()), // ISO date
  productId: v.optional(v.string()), // e.g. "pro_monthly", "pro_annual"
  periodType: v.optional(v.string()), // "monthly" | "annual"
}).index("by_user", ["userId"]).index("by_rc_id", ["revenueCatId"]),

monthlyAiCosts: defineTable({
  userId: v.string(),
  month: v.string(), // "YYYY-MM"
  totalCost: v.number(),
}).index("by_user_month", ["userId", "month"]),

appConfig: defineTable({
  key: v.string(),
  value: v.number(),
}).index("by_key", ["key"]),

streaks: defineTable({
  userId: v.string(),
  currentStreak: v.number(),
  longestStreak: v.number(),
  lastCompletionDate: v.string(), // "YYYY-MM-DD"
  freezesUsedThisWeek: v.number(),
  weekStart: v.string(), // "YYYY-MM-DD" — Monday of current week
}).index("by_user", ["userId"]),

achievements: defineTable({
  userId: v.string(),
  achievementId: v.string(), // e.g. "first_step", "on_a_roll"
  unlockedAt: v.number(), // timestamp
}).index("by_user", ["userId"]).index("by_user_achievement", ["userId", "achievementId"]),
```

**Step 2: Run Convex dev to validate schema**

Run: `cd apps/convex && npx convex dev --once`
Expected: Schema pushed successfully

**Step 3: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "feat: add schema tables for subscriptions, costs, streaks, achievements, config"
```

---

### Task 2: App Config System — Backend-Configurable Settings

**Files:**
- Create: `apps/convex/convex/appConfig.ts`

**Step 1: Create appConfig module with getters and admin setter**

```typescript
// apps/convex/convex/appConfig.ts
import { v, ConvexError } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

// Default values — used when no config row exists
const DEFAULTS: Record<string, number> = {
  freeTierCostCeiling: 1.0,      // $1/month for free users
  premiumTierCostCeiling: 10.0,  // $10/month for premium users
  aiCreditValue: 0.5,            // $0.50 of AI usage per credit
  maxCoachNotificationsPerDay: 3,
};

export const get = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    return row?.value ?? DEFAULTS[key] ?? 0;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const rows = await ctx.db.query("appConfig").collect();
    const config: Record<string, number> = { ...DEFAULTS };
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.number() },
  handler: async (ctx, { key, value }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    // TODO: Add admin check when admin roles are implemented

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("appConfig", { key, value });
    }
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/appConfig.ts
git commit -m "feat: add configurable appConfig system for cost ceilings"
```

---

### Task 3: Subscription Management — Backend Queries & Mutations

**Files:**
- Create: `apps/convex/convex/subscriptions.ts`

**Step 1: Create subscription module**

```typescript
// apps/convex/convex/subscriptions.ts
import { v, ConvexError } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

export const getByUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return sub ? { isActive: sub.isActive, productId: sub.productId, periodType: sub.periodType, expiresAt: sub.expiresAt } : null;
  },
});

export const isPremium = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return sub?.isActive ?? false;
  },
});

export const upsertFromWebhook = internalMutation({
  args: {
    userId: v.string(),
    revenueCatId: v.string(),
    entitlement: v.string(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),
    productId: v.optional(v.string()),
    periodType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find by RevenueCat ID first, then by userId
    let existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_rc_id", (q) => q.eq("revenueCatId", args.revenueCatId))
      .first();

    if (!existing) {
      existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        expiresAt: args.expiresAt,
        productId: args.productId,
        periodType: args.periodType,
      });
    } else {
      await ctx.db.insert("subscriptions", args);
    }
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/subscriptions.ts
git commit -m "feat: add subscription management queries and mutations"
```

---

### Task 4: Monthly AI Cost Tracking

**Files:**
- Modify: `apps/convex/convex/ai.ts`

**Step 1: Add monthly cost tracking mutation and query**

Add to `ai.ts` after the existing `accumulateUserCost`:

```typescript
export const getMonthlyAiCost = internalQuery({
  args: { userId: v.string(), month: v.string() },
  handler: async (ctx, { userId, month }) => {
    const row = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_user_month", (q) => q.eq("userId", userId).eq("month", month))
      .first();
    return row?.totalCost ?? 0;
  },
});

export const accumulateMonthlyAiCost = internalMutation({
  args: { userId: v.string(), month: v.string(), cost: v.number() },
  handler: async (ctx, { userId, month, cost }) => {
    const existing = await ctx.db
      .query("monthlyAiCosts")
      .withIndex("by_user_month", (q) => q.eq("userId", userId).eq("month", month))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { totalCost: existing.totalCost + cost });
      return existing.totalCost + cost;
    } else {
      await ctx.db.insert("monthlyAiCosts", { userId, month, totalCost: cost });
      return cost;
    }
  },
});
```

**Step 2: Modify `scoreTaskDifficulty` to check cost ceiling before scoring**

In the `scoreTaskDifficulty` handler, after the rate limit check and before the API call, add a cost ceiling check:

```typescript
// After rate limit check, before API key check:
const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
const monthlyCost = await ctx.runQuery(internal.ai.getMonthlyAiCost, { userId, month: currentMonth });
const premium = await ctx.runQuery(internal.subscriptions.isPremium, { userId });
const ceilingKey = premium ? "premiumTierCostCeiling" : "freeTierCostCeiling";
const ceiling = await ctx.runQuery(internal.appConfig.get, { key: ceilingKey });

if (monthlyCost >= ceiling) {
  // Don't score — user hit their ceiling. Leave difficulty at -1 (unscored).
  return;
}
```

Remove the line that sets difficulty to 0 on ceiling hit — we leave it at -1 so the mobile app can detect "unscored due to ceiling" vs "scored as 0".

**Step 3: After successful scoring, accumulate monthly cost alongside existing cumulative cost**

In the cost tracking section (after `accumulateUserCost`), add:

```typescript
if (costFromResponse > 0) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  await ctx.runMutation(internal.ai.accumulateMonthlyAiCost, {
    userId, month: currentMonth, cost: costFromResponse,
  });
  // ... existing cumulative cost + alert code
}
```

**Step 4: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat: add monthly AI cost tracking and cost ceiling enforcement"
```

---

### Task 5: AI Credits System

**Files:**
- Create: `apps/convex/convex/credits.ts`
- Modify: `apps/convex/convex/schema.ts` (add `aiCredits` table)

**Step 1: Add aiCredits table to schema**

```typescript
// Add to schema.ts
aiCredits: defineTable({
  userId: v.string(),
  balance: v.number(), // remaining credit balance in dollars
}).index("by_user", ["userId"]),
```

**Step 2: Create credits module**

```typescript
// apps/convex/convex/credits.ts
import { v, ConvexError } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";

export const getBalance = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return row?.balance ?? 0;
  },
});

export const addCredits = internalMutation({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const existing = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { balance: existing.balance + amount });
    } else {
      await ctx.db.insert("aiCredits", { userId, balance: amount });
    }
  },
});

export const deductCredits = internalMutation({
  args: { userId: v.string(), amount: v.number() },
  handler: async (ctx, { userId, amount }) => {
    const existing = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing || existing.balance < amount) {
      return false; // insufficient credits
    }

    await ctx.db.patch(existing._id, { balance: existing.balance - amount });
    return true;
  },
});

// Public query for mobile app
export const getMyBalance = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const row = await ctx.db
      .query("aiCredits")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    return row?.balance ?? 0;
  },
});
```

**Step 3: Modify AI scoring to check credits when ceiling is hit**

Update the cost ceiling check in `scoreTaskDifficulty` (from Task 4) to also check credits:

```typescript
if (monthlyCost >= ceiling) {
  // Check if user has AI credits
  const creditBalance = await ctx.runQuery(internal.credits.getBalance, { userId });
  if (creditBalance <= 0) {
    // No credits, don't score — leave difficulty at -1
    return;
  }
  // Has credits — continue scoring, will deduct after
}
```

After scoring succeeds and cost is known, deduct from credits if user was over ceiling:

```typescript
if (costFromResponse > 0 && monthlyCost >= ceiling) {
  // Deduct from credits
  await ctx.runMutation(internal.credits.deductCredits, {
    userId, amount: costFromResponse,
  });
}
```

**Step 4: Commit**

```bash
git add apps/convex/convex/schema.ts apps/convex/convex/credits.ts apps/convex/convex/ai.ts
git commit -m "feat: add AI credits system with purchase and deduction"
```

---

### Task 6: RevenueCat Webhook Endpoint

**Files:**
- Modify: `apps/convex/convex/http.ts`

**Step 1: Add RevenueCat webhook route**

RevenueCat sends POST requests with subscription events. Add a handler to `http.ts`:

```typescript
// Add to http.ts
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// After existing auth route registration:
http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify webhook authorization
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const event = body.event;

    if (!event) {
      return new Response("No event", { status: 400 });
    }

    const appUserId = event.app_user_id;
    const rcId = event.id ?? event.original_transaction_id ?? appUserId;

    // Handle subscription events
    const activeTypes = [
      "INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE",
      "UNCANCELLATION", "SUBSCRIPTION_EXTENDED",
    ];
    const inactiveTypes = [
      "CANCELLATION", "EXPIRATION", "BILLING_ISSUE",
      "SUBSCRIPTION_PAUSED",
    ];

    const eventType = event.type;
    let isActive: boolean | null = null;

    if (activeTypes.includes(eventType)) {
      isActive = true;
    } else if (inactiveTypes.includes(eventType)) {
      isActive = false;
    }

    if (isActive !== null && appUserId) {
      await ctx.runMutation(internal.subscriptions.upsertFromWebhook, {
        userId: appUserId,
        revenueCatId: rcId,
        entitlement: "premium",
        isActive,
        expiresAt: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : undefined,
        productId: event.product_id,
        periodType: event.period_type,
      });
    }

    // Handle consumable (AI credits) purchases
    if (eventType === "NON_RENEWING_PURCHASE" && appUserId) {
      const productId = event.product_id ?? "";
      // Map product IDs to credit values — configured via appConfig
      const creditValue = await ctx.runQuery(internal.appConfig.get, { key: "aiCreditValue" });
      let creditAmount = 0;
      if (productId.includes("small")) creditAmount = creditValue;
      else if (productId.includes("medium")) creditAmount = creditValue * 3;
      else if (productId.includes("large")) creditAmount = creditValue * 5;

      if (creditAmount > 0) {
        await ctx.runMutation(internal.credits.addCredits, {
          userId: appUserId,
          amount: creditAmount,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});
```

**Step 2: Add `REVENUECAT_WEBHOOK_SECRET` to Convex environment variables**

Run: `npx convex env set REVENUECAT_WEBHOOK_SECRET <your-secret>`
(User will need to generate this in RevenueCat dashboard and set it)

**Step 3: Commit**

```bash
git add apps/convex/convex/http.ts
git commit -m "feat: add RevenueCat webhook endpoint for subscription sync"
```

---

### Task 7: Update Account Deletion & Migration for New Tables

**Files:**
- Modify: `apps/convex/convex/account.ts`
- Modify: `apps/convex/convex/migration.ts`

**Step 1: Add cleanup of new tables to `deleteAccount`**

Add deletion of `subscriptions`, `monthlyAiCosts`, `aiCredits`, `streaks`, `achievements` to `account.ts`:

```typescript
// After existing deletions in deleteAccount handler:

// Delete subscriptions
const subs = await ctx.db
  .query("subscriptions")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .first();
if (subs) await ctx.db.delete(subs._id);

// Delete monthlyAiCosts
const monthlyCosts = await ctx.db
  .query("monthlyAiCosts")
  .filter((q) => q.eq(q.field("userId"), userId))
  .collect();
for (const mc of monthlyCosts) {
  await ctx.db.delete(mc._id);
}

// Delete aiCredits
const credits = await ctx.db
  .query("aiCredits")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .first();
if (credits) await ctx.db.delete(credits._id);

// Delete streaks
const streak = await ctx.db
  .query("streaks")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .first();
if (streak) await ctx.db.delete(streak._id);

// Delete achievements
const userAchievements = await ctx.db
  .query("achievements")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();
for (const a of userAchievements) {
  await ctx.db.delete(a._id);
}
```

**Step 2: Add migration of new tables in `migrateUserData`**

Add migration of `subscriptions`, `aiCredits`, `streaks`, `achievements` in `migration.ts`:

```typescript
// After existing migrations in migrateUserData handler:

// Migrate subscriptions
const oldSub = await ctx.db
  .query("subscriptions")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldSub) {
  const existingSub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", newUserId))
    .first();
  if (!existingSub) {
    const { _id, _creationTime, userId: _oldUid, ...subData } = oldSub;
    await ctx.db.insert("subscriptions", { ...subData, userId: newUserId });
  }
}

// Migrate aiCredits
const oldCredits = await ctx.db
  .query("aiCredits")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldCredits) {
  const existingCredits = await ctx.db
    .query("aiCredits")
    .withIndex("by_user", (q) => q.eq("userId", newUserId))
    .first();
  if (!existingCredits) {
    const { _id, _creationTime, userId: _oldUid, ...creditData } = oldCredits;
    await ctx.db.insert("aiCredits", { ...creditData, userId: newUserId });
  }
}

// Migrate streaks
const oldStreak = await ctx.db
  .query("streaks")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldStreak) {
  const existingStreak = await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", newUserId))
    .first();
  if (!existingStreak) {
    const { _id, _creationTime, userId: _oldUid, ...streakData } = oldStreak;
    await ctx.db.insert("streaks", { ...streakData, userId: newUserId });
  }
}

// Migrate achievements
const oldAchievements = await ctx.db
  .query("achievements")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .collect();
for (const ach of oldAchievements) {
  const exists = await ctx.db
    .query("achievements")
    .withIndex("by_user_achievement", (q) =>
      q.eq("userId", newUserId).eq("achievementId", ach.achievementId))
    .first();
  if (!exists) {
    const { _id, _creationTime, userId: _oldUid, ...achData } = ach;
    await ctx.db.insert("achievements", { ...achData, userId: newUserId });
  }
}
```

**Step 3: Add cleanup of new tables in `cleanupOldUserData`**

```typescript
// After existing cleanups in cleanupOldUserData handler:

const oldSub = await ctx.db
  .query("subscriptions")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldSub) await ctx.db.delete(oldSub._id);

const oldCredits = await ctx.db
  .query("aiCredits")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldCredits) await ctx.db.delete(oldCredits._id);

const oldStreak = await ctx.db
  .query("streaks")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .first();
if (oldStreak) await ctx.db.delete(oldStreak._id);

const oldAchievements = await ctx.db
  .query("achievements")
  .withIndex("by_user", (q) => q.eq("userId", oldUserId))
  .collect();
for (const a of oldAchievements) {
  await ctx.db.delete(a._id);
}
```

**Step 4: Commit**

```bash
git add apps/convex/convex/account.ts apps/convex/convex/migration.ts
git commit -m "feat: update account deletion and migration for monetization tables"
```

---

## Phase 2: Mobile — RevenueCat Integration

### Task 8: Install RevenueCat SDK & Configure

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`

**Step 1: Install react-native-purchases**

Run: `cd apps/mobile && npx expo install react-native-purchases`

**Step 2: Add RevenueCat API keys to environment**

Add to `.env` (or EAS environment):
- `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` — from RevenueCat dashboard
- `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` — from RevenueCat dashboard

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat: install react-native-purchases (RevenueCat SDK)"
```

---

### Task 9: Premium Context Provider

**Files:**
- Create: `apps/mobile/src/hooks/usePremium.ts`
- Modify: `app/_layout.tsx`

**Step 1: Create usePremium hook**

```typescript
// apps/mobile/src/hooks/usePremium.ts
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { authClient } from "../lib/authClient";

const ENTITLEMENT_ID = "premium";

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  offerings: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);

  // Also check backend subscription status as fallback
  const backendSub = useQuery(api.subscriptions.getByUserId);
  const session = authClient.useSession();

  useEffect(() => {
    async function init() {
      const apiKey = Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY!
        : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY!;

      await Purchases.configure({ apiKey });

      // Identify user with their auth ID
      const userId = session.data?.user?.id;
      if (userId) {
        await Purchases.logIn(userId);
      }

      // Check entitlements
      const info = await Purchases.getCustomerInfo();
      setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);

      // Load offerings
      const offeringsResult = await Purchases.getOfferings();
      const current = offeringsResult.current;
      if (current) {
        setOfferings(current.availablePackages);
      }

      setIsLoading(false);
    }

    init().catch(() => setIsLoading(false));
  }, [session.data?.user?.id]);

  // Listen for subscription changes
  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  }, []);

  // Fallback: if backend says premium but RC hasn't synced yet
  useEffect(() => {
    if (backendSub?.isActive && !isPremium) {
      setIsPremium(true);
    }
  }, [backendSub, isPremium]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);
      return active;
    } catch {
      return false;
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      const active = !!info.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);
      return active;
    } catch {
      return false;
    }
  }, []);

  return (
    <PremiumContext value={{ isPremium, isLoading, offerings, purchase, restore }}>
      {children}
    </PremiumContext>
  );
}
```

**Step 2: Wrap app with PremiumProvider**

In `app/_layout.tsx`, wrap the existing providers with `PremiumProvider` inside the auth provider:

```typescript
import { PremiumProvider } from "./src/hooks/usePremium";

// In the JSX, inside ConvexBetterAuthProvider:
<ConvexBetterAuthProvider client={convex} authClient={authClient}>
  <PremiumProvider>
    <PostHogProvider client={posthog}>
      <Stack screenOptions={{ headerShown: false }} />
    </PostHogProvider>
  </PremiumProvider>
</ConvexBetterAuthProvider>
```

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/usePremium.ts app/_layout.tsx
git commit -m "feat: add PremiumProvider with RevenueCat integration"
```

---

### Task 10: Paywall Screen

**Files:**
- Create: `apps/mobile/src/components/sheets/PaywallSheet.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Create PaywallSheet component**

Build a bottom sheet that shows:
- "Unlock Pro" header with feature list
- Monthly ($4.99/mo) and Annual ($39.99/yr — "Save 33%") plan cards
- "Restore Purchases" link at bottom
- Close button

Use the existing design system:
- Background: `#f5f7fa`, cards: white with `rounded-3xl`
- Gradient accents: `#a2d2ff` → `#cdb4db`
- Font colors: `#1e2939` primary, `#6a7282` secondary
- Feature list items with `Ionicons` checkmark icons in `#a2d2ff`

Features to list:
- "AI Coach — Personalized encouragement notifications"
- "Progress Insights — Weekly reports & trends"
- "Achievements — Badges, streaks & streak freeze"
- "Home Widgets — Quick access from your home screen"
- "More AI Scoring — Higher monthly AI limit"

Use `usePremium()` hook for `offerings`, `purchase()`, and `restore()`.

The sheet should:
- Show loading state while offerings load
- Call `purchase(pkg)` on plan tap
- Call `restore()` on restore tap
- Close on successful purchase
- Handle errors gracefully

**Step 2: Register PaywallSheet in SheetManager**

Add `paywall` to the `ActiveSheet` type in `HomeProvider.tsx`:

```typescript
type ActiveSheet =
  | "none"
  | "addTask"
  // ... existing
  | "paywall";
```

Add to `SheetManager.tsx`:
```typescript
import { PaywallSheet } from "../sheets/PaywallSheet";
// Add ref:
const paywallSheetRef = useRef<BottomSheet>(null);
// Register:
registerSheet({ name: "paywall", ref: paywallSheetRef });
// Render:
<PaywallSheet ref={paywallSheetRef} onClose={onSheetClose} />
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/PaywallSheet.tsx apps/mobile/src/components/home/SheetManager.tsx apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: add PaywallSheet with subscription plans and restore"
```

---

### Task 11: Pro Badge Component & Premium Feature Gating

**Files:**
- Create: `apps/mobile/src/components/ProBadge.tsx`
- Modify: `apps/mobile/src/components/sheets/SettingsSheet.tsx`

**Step 1: Create reusable ProBadge component**

```typescript
// apps/mobile/src/components/ProBadge.tsx
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ProBadgeProps {
  size?: "sm" | "md";
}

export function ProBadge({ size = "sm" }: ProBadgeProps) {
  const textSize = size === "sm" ? "text-[9px]" : "text-[11px]";
  const px = size === "sm" ? "px-[6px]" : "px-2";
  const py = size === "sm" ? "py-[2px]" : "py-1";

  return (
    <LinearGradient
      colors={["#a2d2ff", "#cdb4db"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 100 }}
    >
      <View className={`${px} ${py}`}>
        <Text className={`${textSize} font-semibold text-white`}>PRO</Text>
      </View>
    </LinearGradient>
  );
}
```

**Step 2: Add Pro badges to SettingsSheet premium features**

Modify `SettingRow` to accept an optional `isPro` prop:

```typescript
interface SettingRowProps {
  // ... existing props
  isPro?: boolean;
}

function SettingRow({ icon, color, title, subtitle, value, onChange, disabled, isPro }: SettingRowProps) {
  return (
    <View ...>
      <View className="flex-row items-center gap-3">
        {/* existing icon + text */}
        <View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-medium text-[#1e2939]">{title}</Text>
            {isPro && <ProBadge />}
          </View>
          <Text className="text-xs text-[#6a7282]">{subtitle}</Text>
        </View>
      </View>
      {/* existing switch */}
    </View>
  );
}
```

For now, no premium-only settings exist in the settings sheet yet. The Pro badges will be added when we implement each premium feature's UI (coach notifications toggle, etc.) in later tasks.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/ProBadge.tsx apps/mobile/src/components/sheets/SettingsSheet.tsx
git commit -m "feat: add ProBadge component and premium indicator support to settings"
```

---

## Phase 3: Streaks & Achievements

### Task 12: Backend Streak Tracking

**Files:**
- Create: `apps/convex/convex/streaks.ts`
- Modify: `apps/convex/convex/tasks.ts`

**Step 1: Create streaks module**

```typescript
// apps/convex/convex/streaks.ts
import { v, ConvexError } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!streak) {
      return { currentStreak: 0, longestStreak: 0, lastCompletionDate: null };
    }

    // Check if streak is still alive (completed yesterday or today)
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (streak.lastCompletionDate !== today && streak.lastCompletionDate !== yesterday) {
      // Streak broken (unless freeze applies — checked in updateStreak)
      return { currentStreak: 0, longestStreak: streak.longestStreak, lastCompletionDate: streak.lastCompletionDate };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletionDate: streak.lastCompletionDate,
    };
  },
});

export const updateOnCompletion = internalMutation({
  args: { userId: v.string(), isPremium: v.boolean() },
  handler: async (ctx, { userId, isPremium }) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const mondayOfThisWeek = getMonday(today);

    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      // First ever completion
      await ctx.db.insert("streaks", {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastCompletionDate: today,
        freezesUsedThisWeek: 0,
        weekStart: mondayOfThisWeek,
      });
      return { currentStreak: 1, isNewStreak: true };
    }

    // Already completed today — no change
    if (existing.lastCompletionDate === today) {
      return { currentStreak: existing.currentStreak, isNewStreak: false };
    }

    let newStreak = existing.currentStreak;
    let freezesUsed = existing.freezesUsedThisWeek;
    let weekStart = existing.weekStart;

    // Reset weekly freeze counter if new week
    if (mondayOfThisWeek !== weekStart) {
      freezesUsed = 0;
      weekStart = mondayOfThisWeek;
    }

    if (existing.lastCompletionDate === yesterday) {
      // Continuing streak
      newStreak += 1;
    } else {
      // Missed at least one day
      const missedDate = new Date(existing.lastCompletionDate + "T00:00:00Z");
      const todayDate = new Date(today + "T00:00:00Z");
      const daysMissed = Math.floor((todayDate.getTime() - missedDate.getTime()) / 86400000) - 1;

      if (isPremium && daysMissed === 1 && freezesUsed < 1) {
        // Premium streak freeze — forgive one missed day per week
        newStreak += 1; // Continue as if no miss
        freezesUsed += 1;
      } else {
        // Streak broken — restart
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(existing.longestStreak, newStreak);

    await ctx.db.patch(existing._id, {
      currentStreak: newStreak,
      longestStreak,
      lastCompletionDate: today,
      freezesUsedThisWeek: freezesUsed,
      weekStart,
    });

    return { currentStreak: newStreak, isNewStreak: newStreak === 1 && existing.currentStreak > 1 };
  },
});
```

**Step 2: Call streak update from `completeTask`**

In `tasks.ts`, in the `completeTask` handler, after awarding points:

```typescript
// After point/level logic, before the return:
const premium = await ctx.runQuery(internal.subscriptions.isPremium, { userId });
await ctx.runMutation(internal.streaks.updateOnCompletion, { userId, isPremium: premium });
```

Add the import:
```typescript
import { internal } from "./_generated/api";
```

Note: `completeTask` is a `mutation`, not an `action`, so we need to change the streak update to also be callable from a mutation context. Since `internal.streaks.updateOnCompletion` is an `internalMutation`, we call it with `ctx.scheduler.runAfter(0, ...)` or restructure.

Actually, mutations can't call other mutations directly. We have two options:
1. Inline the streak logic in `completeTask`
2. Schedule via `ctx.scheduler.runAfter(0, ...)`

Use option 2 to keep it clean:

```typescript
await ctx.scheduler.runAfter(0, internal.streaks.updateOnCompletion, { userId, isPremium: premium });
```

Wait — mutations can't call `ctx.runQuery` for internal queries from other modules either. But they CAN use `ctx.scheduler.runAfter` to schedule internal mutations/actions. However, to get `isPremium` we need to query within the mutation.

Simplest approach: inline the premium check in the streak mutation itself (it already has ctx). Change `updateOnCompletion` to query subscriptions internally:

```typescript
export const updateOnCompletion = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check premium status
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const isPremium = sub?.isActive ?? false;
    // ... rest of logic
  },
});
```

Then in `tasks.ts`:
```typescript
await ctx.scheduler.runAfter(0, internal.streaks.updateOnCompletion, { userId });
```

**Step 3: Commit**

```bash
git add apps/convex/convex/streaks.ts apps/convex/convex/tasks.ts
git commit -m "feat: add streak tracking with premium freeze support"
```

---

### Task 13: Backend Achievement System

**Files:**
- Create: `apps/convex/convex/achievementDefs.ts`
- Modify: `apps/convex/convex/tasks.ts`

**Step 1: Create achievement definitions and unlock logic**

```typescript
// apps/convex/convex/achievementDefs.ts
import { v, ConvexError } from "convex/values";
import { query, internalMutation } from "./_generated/server";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_step", name: "First Step", description: "Complete your first task", icon: "footsteps-outline" },
  { id: "on_a_roll_3", name: "On a Roll", description: "3-day streak", icon: "flame-outline" },
  { id: "unstoppable_7", name: "Unstoppable", description: "7-day streak", icon: "rocket-outline" },
  { id: "hard_mode", name: "Hard Mode", description: "Complete a task with difficulty 80+", icon: "diamond-outline" },
  { id: "voice_commander", name: "Voice Commander", description: "Create 10 tasks via voice", icon: "mic-outline" },
  { id: "weekly_warrior", name: "Weekly Warrior", description: "Complete 15+ tasks in a week", icon: "shield-outline" },
  { id: "level_5", name: "Rising Star", description: "Reach level 5", icon: "star-outline" },
  { id: "level_10", name: "Veteran", description: "Reach level 10", icon: "star-half-outline" },
  { id: "level_25", name: "Legend", description: "Reach level 25", icon: "star" },
];

export const listDefinitions = query({
  args: {},
  handler: async () => {
    return ACHIEVEMENT_DEFS;
  },
});

export const listUnlocked = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const tryUnlock = internalMutation({
  args: { userId: v.string(), achievementId: v.string() },
  handler: async (ctx, { userId, achievementId }) => {
    // Check if already unlocked
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", userId).eq("achievementId", achievementId))
      .first();

    if (existing) return null; // Already unlocked

    await ctx.db.insert("achievements", {
      userId,
      achievementId,
      unlockedAt: Date.now(),
    });

    return achievementId;
  },
});

// Called after task completion to check all achievement conditions
export const checkOnTaskComplete = internalMutation({
  args: {
    userId: v.string(),
    taskDifficulty: v.number(),
    newLevel: v.number(),
    currentStreak: v.number(),
  },
  handler: async (ctx, { userId, taskDifficulty, newLevel, currentStreak }) => {
    const unlocked: string[] = [];

    // First Step — any completion
    const firstStep = await ctx.db
      .query("achievements")
      .withIndex("by_user_achievement", (q) =>
        q.eq("userId", userId).eq("achievementId", "first_step"))
      .first();
    if (!firstStep) {
      await ctx.db.insert("achievements", { userId, achievementId: "first_step", unlockedAt: Date.now() });
      unlocked.push("first_step");
    }

    // Hard Mode
    if (taskDifficulty >= 80) {
      const r = await ctx.db.query("achievements")
        .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", "hard_mode")).first();
      if (!r) {
        await ctx.db.insert("achievements", { userId, achievementId: "hard_mode", unlockedAt: Date.now() });
        unlocked.push("hard_mode");
      }
    }

    // Streak achievements
    if (currentStreak >= 3) {
      const r = await ctx.db.query("achievements")
        .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", "on_a_roll_3")).first();
      if (!r) {
        await ctx.db.insert("achievements", { userId, achievementId: "on_a_roll_3", unlockedAt: Date.now() });
        unlocked.push("on_a_roll_3");
      }
    }
    if (currentStreak >= 7) {
      const r = await ctx.db.query("achievements")
        .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", "unstoppable_7")).first();
      if (!r) {
        await ctx.db.insert("achievements", { userId, achievementId: "unstoppable_7", unlockedAt: Date.now() });
        unlocked.push("unstoppable_7");
      }
    }

    // Level achievements
    const levelAchievements = [
      { level: 5, id: "level_5" },
      { level: 10, id: "level_10" },
      { level: 25, id: "level_25" },
    ];
    for (const la of levelAchievements) {
      if (newLevel >= la.level) {
        const r = await ctx.db.query("achievements")
          .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", la.id)).first();
        if (!r) {
          await ctx.db.insert("achievements", { userId, achievementId: la.id, unlockedAt: Date.now() });
          unlocked.push(la.id);
        }
      }
    }

    // Weekly warrior — count completions this week
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + mondayOffset);
    monday.setUTCHours(0, 0, 0, 0);
    const weekTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("completed"), true),
        q.gte(q.field("_creationTime"), monday.getTime()),
      ))
      .collect();
    if (weekTasks.length >= 15) {
      const r = await ctx.db.query("achievements")
        .withIndex("by_user_achievement", (q) => q.eq("userId", userId).eq("achievementId", "weekly_warrior")).first();
      if (!r) {
        await ctx.db.insert("achievements", { userId, achievementId: "weekly_warrior", unlockedAt: Date.now() });
        unlocked.push("weekly_warrior");
      }
    }

    return unlocked;
  },
});
```

**Step 2: Wire achievement checks into `completeTask`**

In `tasks.ts`, in the `completeTask` handler, schedule achievement check after streak update:

```typescript
await ctx.scheduler.runAfter(0, internal.achievementDefs.checkOnTaskComplete, {
  userId,
  taskDifficulty: task.difficulty,
  newLevel: level,
  currentStreak: 0, // Will be fetched inside the mutation
});
```

Note: Since we can't easily pass the streak value from one scheduled mutation to another (they run independently), modify `checkOnTaskComplete` to query the streaks table directly:

```typescript
// In checkOnTaskComplete, replace the currentStreak arg with a query:
const streakRow = await ctx.db
  .query("streaks")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .first();
const currentStreak = streakRow?.currentStreak ?? 0;
```

And simplify the args to just `{ userId, taskDifficulty, newLevel }`.

**Step 3: Commit**

```bash
git add apps/convex/convex/achievementDefs.ts apps/convex/convex/tasks.ts
git commit -m "feat: add achievement system with completion-based unlock checks"
```

---

### Task 14: Streaks UI on Home Screen (Premium)

**Files:**
- Create: `apps/mobile/src/components/StreakBadge.tsx`
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Create StreakBadge component**

Display streak count with flame icon. Shows on home screen between XP bar and mood slider.

```typescript
// apps/mobile/src/components/StreakBadge.tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <View className="flex-row items-center justify-center gap-1.5 py-2">
      <Ionicons name="flame" size={20} color="#ff9f43" />
      <Text className="text-sm font-semibold text-[#1e2939]">
        {streak} day streak
      </Text>
    </View>
  );
}
```

**Step 2: Add to MainContent**

Import `StreakBadge` and `useQuery` for streaks in `MainContent.tsx`:

```typescript
import { StreakBadge } from "../StreakBadge";
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { usePremium } from "../../hooks/usePremium";

// Inside MainContent:
const { isPremium } = usePremium();
const streakData = useQuery(api.streaks.get);

// In JSX, after XP bar section, before mood slider:
{isPremium && streakData && (
  <StreakBadge streak={streakData.currentStreak} />
)}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/StreakBadge.tsx apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: add streak badge to home screen for premium users"
```

---

### Task 15: Achievements Gallery Sheet (Premium)

**Files:**
- Create: `apps/mobile/src/components/sheets/AchievementsSheet.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Create AchievementsSheet**

A bottom sheet showing a grid of achievement badges. Unlocked ones are colorful, locked ones are greyed out. Uses `useQuery(api.achievementDefs.listDefinitions)` and `useQuery(api.achievementDefs.listUnlocked)`.

Layout:
- Header: "Achievements" + close button
- Grid of achievement cards (2 columns)
- Each card: icon (in circle), name, description
- Unlocked: gradient background `#a2d2ff` → `#cdb4db`, white icon
- Locked: grey background `#e5e7eb`, grey icon, `opacity: 0.5`
- Show unlock date for unlocked achievements

**Step 2: Register in SheetManager**

Add `"achievements"` to `ActiveSheet` type and register the sheet.

**Step 3: Add navigation**

Add a button to the BottomNav or Profile sheet that opens achievements (gated behind premium with Pro badge). When non-premium user taps, open paywall instead.

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/AchievementsSheet.tsx apps/mobile/src/components/home/SheetManager.tsx apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: add achievements gallery sheet with premium gating"
```

---

## Phase 4: Progress Insights

### Task 16: Backend Progress Insights Queries

**Files:**
- Create: `apps/convex/convex/insights.ts`

**Step 1: Create insights module**

```typescript
// apps/convex/convex/insights.ts
import { v, ConvexError } from "convex/values";
import { query, internalQuery } from "./_generated/server";

export const getWeeklyReport = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const userId = identity.subject;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const completedThisWeek = allTasks.filter(
      (t) => t.completed && t._creationTime >= weekAgo.getTime()
    );
    const completedLastWeek = allTasks.filter(
      (t) => t.completed && t._creationTime >= twoWeeksAgo.getTime() && t._creationTime < weekAgo.getTime()
    );

    // Most productive day
    const dayMap: Record<string, number> = {};
    for (const t of completedThisWeek) {
      const day = new Date(t._creationTime).toLocaleDateString("en-US", { weekday: "long" });
      dayMap[day] = (dayMap[day] ?? 0) + 1;
    }
    const mostProductiveDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Average difficulty
    const scoredTasks = completedThisWeek.filter((t) => t.difficulty > 0);
    const avgDifficulty = scoredTasks.length
      ? Math.round(scoredTasks.reduce((sum, t) => sum + t.difficulty, 0) / scoredTasks.length)
      : 0;

    // Streak
    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      tasksCompletedThisWeek: completedThisWeek.length,
      tasksCompletedLastWeek: completedLastWeek.length,
      mostProductiveDay,
      avgDifficulty,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
    };
  },
});

export const getCompletionTrends = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const userId = identity.subject;

    const since = Date.now() - days * 86400000;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("completed"), true),
        q.gte(q.field("_creationTime"), since),
      ))
      .collect();

    // Group by date
    const byDate: Record<string, number> = {};
    for (const t of tasks) {
      const date = new Date(t._creationTime).toISOString().slice(0, 10);
      byDate[date] = (byDate[date] ?? 0) + 1;
    }

    return byDate;
  },
});
```

**Step 2: Commit**

```bash
git add apps/convex/convex/insights.ts
git commit -m "feat: add progress insights queries for weekly report and trends"
```

---

### Task 17: Insights Dashboard Sheet (Premium)

**Files:**
- Create: `apps/mobile/src/components/sheets/InsightsSheet.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Create InsightsSheet**

A bottom sheet showing the weekly report and completion trends:

Layout:
- Header: "Progress Insights" + Pro badge + close button
- Stats cards row: "This Week" count, "Last Week" count, "Best Day"
- Average difficulty indicator
- Streak display (current + longest)
- Simple bar chart of daily completions (last 7 days)

Use `useQuery(api.insights.getWeeklyReport)` and `useQuery(api.insights.getCompletionTrends)`.

Build the bar chart as simple `View` bars with animated heights — no charting library needed:

```typescript
// Simple bar chart component
function MiniBarChart({ data }: { data: Record<string, number> }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const max = Math.max(...last7.map((d) => data[d] ?? 0), 1);

  return (
    <View className="flex-row items-end justify-between gap-1 h-[100px] px-4">
      {last7.map((date) => {
        const count = data[date] ?? 0;
        const height = (count / max) * 80 + 4;
        const dayLabel = new Date(date + "T00:00:00Z")
          .toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
        return (
          <View key={date} className="items-center flex-1">
            <View
              style={{ height, backgroundColor: "#a2d2ff", borderRadius: 6, width: "100%" }}
            />
            <Text className="text-[10px] text-[#6a7282] mt-1">{dayLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}
```

**Step 2: Register InsightsSheet in SheetManager**

Add `"insights"` to `ActiveSheet` type. Register sheet and render.

**Step 3: Add navigation to insights**

Add a stats/chart icon button to BottomNav or add it as a tappable section in the home screen XP bar area. Gated behind premium with Pro badge — opens paywall if not premium.

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/InsightsSheet.tsx apps/mobile/src/components/home/SheetManager.tsx apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: add insights dashboard sheet with weekly report and trends"
```

---

## Phase 5: AI Coach Notifications

### Task 18: Backend Coach Notification Engine

**Files:**
- Create: `apps/convex/convex/coachNotifications.ts`
- Create: `apps/convex/convex/crons.ts`

**Step 1: Create coach notification module**

```typescript
// apps/convex/convex/coachNotifications.ts
import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { sanitizeForPrompt } from "./lib/validation";
import { sentryCaptureEvent } from "./lib/sentry";

// Track sent notifications to enforce daily limit
export const countTodayNotifications = internalQuery({
  args: { userId: v.string(), today: v.string() },
  handler: async (ctx, { userId, today }) => {
    // Count from coachNotificationLog for today
    const logs = await ctx.db
      .query("coachNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("date"), today))
      .collect();
    return logs.length;
  },
});

export const logNotification = internalMutation({
  args: { userId: v.string(), date: v.string(), type: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("coachNotificationLog", args);
  },
});

export const processAllUsers = internalAction({
  handler: async (ctx) => {
    // This runs on a cron schedule (e.g., every hour)
    // Query all premium users with notifications enabled
    // For each, check if they should receive a notification based on:
    // - Their bestWorkTimes preferences
    // - Current time
    // - Daily notification limit
    // - Task state (overdue tasks, streak status, completion patterns)
    // Then generate and send a personalized notification via push

    // Implementation:
    // 1. Query all subscriptions where isActive = true
    // 2. For each, check userPreferences.bestWorkTimes against current hour
    // 3. Check daily limit from coachNotificationLog
    // 4. Gather context (tasks, streak, recent completions)
    // 5. Call LLM to generate personalized message
    // 6. Send push notification via expo push service

    // This is a heavy task — see detailed implementation in the design doc.
    // Skeleton for now — full implementation when push sending infrastructure is built.
  },
});
```

**Step 2: Add coachNotificationLog table to schema**

```typescript
// Add to schema.ts
coachNotificationLog: defineTable({
  userId: v.string(),
  date: v.string(), // "YYYY-MM-DD"
  type: v.string(), // "nudge" | "energy" | "win" | "streak" | "overdue"
  message: v.string(),
}).index("by_user", ["userId"]),
```

**Step 3: Create crons.ts for scheduled jobs**

```typescript
// apps/convex/convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run coach notification processor every hour
crons.interval(
  "coach-notifications",
  { hours: 1 },
  internal.coachNotifications.processAllUsers,
);

export default crons;
```

**Step 4: Commit**

```bash
git add apps/convex/convex/coachNotifications.ts apps/convex/convex/crons.ts apps/convex/convex/schema.ts
git commit -m "feat: add AI coach notification engine with cron scheduler"
```

---

### Task 19: Coach Notification Settings UI (Premium)

**Files:**
- Modify: `apps/mobile/src/components/sheets/SettingsSheet.tsx`

**Step 1: Add coach notifications toggle to SettingsSheet**

Add a new `SettingRow` for AI Coach Notifications, gated behind premium:

```typescript
// In SettingsSheet header, after Smart Scheduling row:
<SettingRow
  icon="chatbubble-ellipses-outline"
  color="#cdb4db"
  title="AI Coach"
  subtitle="Personalized encouragement"
  value={settings.coachNotifications}
  onChange={(v) => {
    if (!isPremium) {
      openSheet("paywall");
      return;
    }
    updateSetting("coachNotifications", v);
  }}
  isPro={true}
  disabled={!isPremium}
/>
```

This requires:
- Adding `coachNotifications` to the `Settings` interface in `useSettings.ts`
- Adding a backend mutation to toggle coach notification preference
- Adding `isPremium` and `openSheet` to the SettingsSheet's dependencies

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/SettingsSheet.tsx apps/mobile/src/hooks/useSettings.ts
git commit -m "feat: add AI coach notification toggle to settings with premium gating"
```

---

## Phase 6: Home Screen Widgets

### Task 20: Expo Widget Setup

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/widgets/` directory

**Step 1: Install expo-widgets (or react-native-widget-extension)**

Note: Expo widgets are still emerging. The recommended approach for Expo is `react-native-widget-extension` for iOS and Android widget support.

Run: `cd apps/mobile && npx expo install react-native-android-widget` (Android)

For iOS widgets, you'll need a native widget extension. This is the highest-effort mobile feature.

**Step 2: Plan widget implementation**

Widgets need to:
- Read data from shared storage (app group on iOS, SharedPreferences on Android)
- The app writes current streak, suggested task, and XP to shared storage on each update
- Widgets read from shared storage and render natively

Create a utility that syncs data to shared storage:

```typescript
// apps/mobile/src/lib/widgetSync.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
// On iOS: use app group shared defaults
// On Android: use SharedPreferences via react-native-android-widget

export async function syncWidgetData(data: {
  streak: number;
  suggestedTask: string | null;
  level: number;
  points: number;
  pointsToNextLevel: number;
}) {
  await AsyncStorage.setItem("@widget_data", JSON.stringify(data));
  // Trigger widget refresh
  // iOS: WidgetKit.reloadAllTimelines()
  // Android: requestWidgetUpdate()
}
```

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/lib/widgetSync.ts
git commit -m "feat: add widget data sync utility for home screen widgets"
```

---

### Task 21: Widget Data Sync on State Changes

**Files:**
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Sync widget data whenever key state changes**

In `HomeProvider`, add an effect that syncs data to shared storage:

```typescript
import { syncWidgetData } from "../../lib/widgetSync";

// Inside HomeProvider, after state declarations:
useEffect(() => {
  const streakData = /* from useQuery */;
  syncWidgetData({
    streak: streakData?.currentStreak ?? 0,
    suggestedTask: selectedTask?.title ?? null,
    level: progress.level,
    points: progress.points,
    pointsToNextLevel: progress.pointsToNextLevel,
  });
}, [progress, selectedTask /* , streakData */]);
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: sync widget data on state changes"
```

---

## Phase 7: Cost Ceiling UI Feedback

### Task 22: Show Cost Ceiling Message in UI

**Files:**
- Modify: `apps/mobile/src/components/TaskCard.tsx`
- Create: `apps/mobile/src/components/AiCeilingBanner.tsx`

**Step 1: Create AiCeilingBanner**

When a task has `difficulty === -1` (unscored), show a banner explaining the AI scoring limit was hit:

```typescript
// apps/mobile/src/components/AiCeilingBanner.tsx
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { useHome } from "./home/HomeProvider";

interface AiCeilingBannerProps {
  onUpgrade: () => void;
}

export function AiCeilingBanner({ onUpgrade }: AiCeilingBannerProps) {
  return (
    <View className="bg-[#fff3cd] rounded-2xl px-4 py-3 mb-3 flex-row items-center gap-3">
      <Ionicons name="sparkles-outline" size={20} color="#856404" />
      <View className="flex-1">
        <Text className="text-xs text-[#856404]">
          AI scoring limit reached this month
        </Text>
      </View>
      <Pressable onPress={onUpgrade}>
        <View className="bg-[#a2d2ff] rounded-full px-3 py-1">
          <Text className="text-xs font-medium text-white">Upgrade</Text>
        </View>
      </Pressable>
    </View>
  );
}
```

**Step 2: Show banner when any visible task has difficulty === -1**

In `MainContent.tsx`, check if any task is unscored due to ceiling:

```typescript
const hasUnscoredTasks = tasks.some((t) => t.difficulty === -1);

// In JSX, before the task card:
{hasUnscoredTasks && (
  <View className="px-6 pb-2">
    <AiCeilingBanner onUpgrade={() => openSheet("paywall")} />
  </View>
)}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/AiCeilingBanner.tsx apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: show AI ceiling banner when scoring limit is reached"
```

---

## Phase 8: Final Integration & Cleanup

### Task 23: Update Types Package

**Files:**
- Modify: `packages/types/index.ts` (or wherever shared types live)

**Step 1: Add subscription and premium types**

Add TypeScript types for the new data structures so they're shared between mobile and backend:

```typescript
export interface Subscription {
  isActive: boolean;
  productId?: string;
  periodType?: string;
  expiresAt?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
}

export interface Achievement {
  achievementId: string;
  unlockedAt: number;
}

export interface WeeklyReport {
  tasksCompletedThisWeek: number;
  tasksCompletedLastWeek: number;
  mostProductiveDay: string | null;
  avgDifficulty: number;
  currentStreak: number;
  longestStreak: number;
}
```

**Step 2: Commit**

```bash
git add packages/types/
git commit -m "feat: add shared types for subscriptions, streaks, achievements, insights"
```

---

### Task 24: RevenueCat Dashboard Configuration

**No code changes — configuration steps:**

1. **RevenueCat Dashboard:**
   - Create app for iOS and Android
   - Create entitlement: `premium`
   - Create products:
     - `pro_monthly` — $4.99/month
     - `pro_annual` — $39.99/year
     - `ai_credits_small` — $0.99 (consumable)
     - `ai_credits_medium` — $2.99 (consumable)
     - `ai_credits_large` — $4.99 (consumable)
   - Create offering with monthly + annual packages
   - Configure webhook URL: `<CONVEX_SITE_URL>/webhooks/revenuecat`
   - Set webhook authorization header

2. **App Store Connect / Google Play Console:**
   - Create subscription products matching RevenueCat product IDs
   - Create consumable IAP products for credit packs

3. **Convex Environment:**
   - Set `REVENUECAT_WEBHOOK_SECRET` env var

---

### Task 25: End-to-End Testing Checklist

**Manual testing steps:**

1. **Free tier flow:**
   - Create account → verify no subscription
   - Create tasks → verify AI scoring works
   - Create many tasks → verify cost ceiling blocks scoring
   - Verify unscored tasks show ceiling banner
   - Verify tapping "Upgrade" opens paywall

2. **Purchase flow:**
   - Open paywall → verify plans display correctly
   - Purchase monthly → verify premium activates
   - Verify Pro badges appear on premium features
   - Verify streak freeze works
   - Verify achievements unlock
   - Verify insights dashboard loads

3. **Credit flow:**
   - Hit AI ceiling → buy credit pack
   - Verify AI scoring resumes after credit purchase

4. **Webhook flow:**
   - Verify RevenueCat webhook updates subscription status
   - Verify subscription expiration deactivates premium
   - Verify renewal reactivates premium

5. **Account operations:**
   - Link anonymous account → verify subscription migrates
   - Delete account → verify all monetization data cleaned up

---

## Implementation Priority Order

If time-constrained, implement in this order:

1. **Tasks 1-6** (Backend foundation) — Required for everything else
2. **Tasks 8-11** (RevenueCat + Paywall + Pro badge) — Core monetization
3. **Task 22** (Cost ceiling UI) — User feedback loop
4. **Tasks 12-13** (Streaks & achievements backend) — Key premium value
5. **Tasks 14-15** (Streaks & achievements UI) — Visible premium value
6. **Tasks 16-17** (Progress insights) — Medium priority
7. **Tasks 18-19** (Coach notifications) — Can ship after launch
8. **Tasks 20-21** (Widgets) — Can ship after launch
9. **Tasks 23-25** (Cleanup & testing) — Before release

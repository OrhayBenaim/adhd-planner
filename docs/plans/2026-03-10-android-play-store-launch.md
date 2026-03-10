# Android Play Store Launch — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship ADHD Planner to Android Play Store ASAP with analytics, crash reporting, AI cost management, and privacy policy.

**Architecture:** PostHog + Sentry initialize at app root (`_layout.tsx`). AI cost tracking extends existing `aiScoringAudit` table and adds `userCosts` accumulator. Privacy policy hosted on Lullio portfolio site (Cloudflare Pages). EAS handles build + submit to Play Store.

**Tech Stack:** Expo/React Native, Convex, PostHog React Native SDK, Sentry React Native SDK, EAS Build/Submit

---

## Task 1: Sentry Integration (Mobile)

**Files:**
- Modify: `apps/mobile/package.json` (add dependency)
- Modify: `apps/mobile/app.json` (add Sentry plugin)
- Modify: `apps/mobile/app/_layout.tsx` (initialize Sentry)

**Step 1: Install Sentry**

Run:
```bash
cd apps/mobile && npx expo install @sentry/react-native
```

**Step 2: Add Sentry plugin to app.json**

In `apps/mobile/app.json`, add to the `plugins` array:
```json
[
  "@sentry/react-native/expo",
  {
    "organization": "YOUR_SENTRY_ORG",
    "project": "adhd-planner",
    "url": "https://sentry.io/"
  }
]
```

**Step 3: Initialize Sentry in `_layout.tsx`**

Add at the top of `apps/mobile/app/_layout.tsx`, before the component:
```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN!,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  enabled: !__DEV__,
});
```

Wrap the default export:
```typescript
export default Sentry.wrap(RootLayout);
```

**Step 4: Add EXPO_PUBLIC_SENTRY_DSN to `.env.example`**

In `apps/mobile/.env.example`, add:
```
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**Step 5: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/app/_layout.tsx apps/mobile/.env.example
git commit -m "feat: integrate Sentry crash reporting"
```

---

## Task 2: PostHog Integration (Mobile)

**Files:**
- Modify: `apps/mobile/package.json` (add dependency)
- Modify: `apps/mobile/app/_layout.tsx` (wrap with PostHog provider)
- Create: `apps/mobile/src/lib/posthog.ts` (PostHog config + helper)

**Step 1: Install PostHog**

Run:
```bash
cd apps/mobile && npx expo install posthog-react-native
```

**Step 2: Create PostHog config**

Create `apps/mobile/src/lib/posthog.ts`:
```typescript
import PostHog from "posthog-react-native";

export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
  host: "https://us.i.posthog.com",
  disabled: __DEV__,
});
```

**Step 3: Add PostHog provider in `_layout.tsx`**

Import and wrap below `ConvexBetterAuthProvider`:
```typescript
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "../src/lib/posthog";
```

Wrap the `<Stack>`:
```tsx
<PostHogProvider client={posthog}>
  <Stack screenOptions={{ headerShown: false }} />
</PostHogProvider>
```

**Step 4: Add EXPO_PUBLIC_POSTHOG_KEY to `.env.example`**

In `apps/mobile/.env.example`, add:
```
EXPO_PUBLIC_POSTHOG_KEY=phc_your_project_key
```

**Step 5: Add analytics tracking to key flows**

Add `posthog.capture()` calls in these existing files:
- `apps/mobile/src/components/onboarding/OnboardingProvider.tsx` — on `completeOnboarding`: `posthog.capture("onboarding_completed")`
- Where tasks are created (trace from the UI to the mutation call): `posthog.capture("task_created")`
- Where tasks are completed: `posthog.capture("task_completed")`
- Voice input activation: `posthog.capture("voice_input_used")`

For each capture call, import posthog:
```typescript
import { posthog } from "../lib/posthog"; // adjust path as needed
```

**Step 6: Identify users on auth change**

In `_layout.tsx` or a top-level component that has access to the auth state, identify the user:
```typescript
// When user is authenticated:
posthog.identify(userId);
// On logout:
posthog.reset();
```

**Step 7: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit`

**Step 8: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app/_layout.tsx apps/mobile/src/lib/posthog.ts apps/mobile/.env.example
git commit -m "feat: integrate PostHog analytics with event tracking"
```

---

## Task 3: AI Cost Management (Backend)

**Files:**
- Modify: `apps/convex/convex/schema.ts` (add `userCosts` table, add `cost` field to `aiScoringAudit`, add `modelOverride` to `userSettings`)
- Modify: `apps/convex/convex/ai.ts` (read model override, extract cost from response, accumulate cost, Sentry alert)
- Modify: `apps/convex/convex/settings.ts` (expose modelOverride in queries)

**Step 1: Update schema**

In `apps/convex/convex/schema.ts`:

Add `modelOverride` to `userSettings`:
```typescript
userSettings: defineTable({
  userId: v.string(),
  aiEnabled: v.boolean(),
  userAiEnabled: v.optional(v.boolean()),
  modelOverride: v.optional(v.string()),
}).index("by_user", ["userId"]),
```

Add `cost` field to `aiScoringAudit`:
```typescript
aiScoringAudit: defineTable({
  taskId: v.id("tasks"),
  userId: v.string(),
  taskTitle: v.string(),
  score: v.number(),
  reason: v.string(),
  model: v.optional(v.string()),
  cost: v.optional(v.number()),
}).index("by_task", ["taskId"]).index("by_user", ["userId"]),
```

Add new `userCosts` table:
```typescript
userCosts: defineTable({
  userId: v.string(),
  totalCost: v.number(),
}).index("by_user", ["userId"]),
```

**Step 2: Add cost accumulation mutations**

In `apps/convex/convex/ai.ts`, add new internal mutations:

```typescript
export const getUserModelOverride = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.modelOverride ?? undefined;
  },
});

export const accumulateUserCost = internalMutation({
  args: { userId: v.string(), cost: v.number() },
  handler: async (ctx, { userId, cost }) => {
    const existing = await ctx.db
      .query("userCosts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalCost: existing.totalCost + cost,
      });
      return existing.totalCost + cost;
    } else {
      await ctx.db.insert("userCosts", { userId, totalCost: cost });
      return cost;
    }
  },
});
```

**Step 3: Update `logScoringAudit` args to accept `cost`**

```typescript
export const logScoringAudit = internalMutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.string(),
    taskTitle: v.string(),
    score: v.number(),
    reason: v.string(),
    model: v.optional(v.string()),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiScoringAudit", args);
  },
});
```

**Step 4: Update `scoreTaskDifficulty` to use model override, extract cost, accumulate, and alert**

In the `scoreTaskDifficulty` handler, after the kill switch and rate limit checks:

1. Read model override:
```typescript
const modelOverride = await ctx.runQuery(internal.ai.getUserModelOverride, { userId });
```

2. Build request body with optional model:
```typescript
const requestBody: Record<string, unknown> = {
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: sanitizedTitle },
  ],
};
if (modelOverride) {
  requestBody.model = modelOverride;
}
```

3. After `const data = await response.json();`, extract cost:
```typescript
const costFromResponse = data.usage?.total_cost ?? data.usage?.cost ?? 0;
const model = data.model ?? undefined;
```

Note: OpenRouter returns cost info in the response body. If not available there, fall back to 0.

4. In the audit log call, add cost:
```typescript
await ctx.runMutation(internal.ai.logScoringAudit, {
  taskId, userId, taskTitle: title,
  score, reason: reason.slice(0, 1000), model,
  cost: costFromResponse,
});
```

5. Accumulate and check threshold:
```typescript
if (costFromResponse > 0) {
  const newTotal = await ctx.runMutation(internal.ai.accumulateUserCost, {
    userId, cost: costFromResponse,
  });

  const threshold = parseFloat(process.env.COST_ALERT_THRESHOLD ?? "20");
  if (newTotal >= threshold) {
    // Log as error so Sentry captures it (Sentry will be set up on backend separately if needed)
    console.error(
      `[COST ALERT] User ${userId} total cost $${newTotal.toFixed(4)} exceeds threshold $${threshold}`,
    );
  }
}
```

**Step 5: Verify deployment works**

Run: `cd apps/convex && npx convex dev --once`
Expected: Schema and functions deploy without errors

**Step 6: Commit**

```bash
git add apps/convex/convex/schema.ts apps/convex/convex/ai.ts apps/convex/convex/settings.ts
git commit -m "feat: AI cost tracking with per-user accumulation and threshold alerts"
```

---

## Task 4: Critical Security Fix — Migrate Settings from AsyncStorage to SecureStore

**Files:**
- Modify: `apps/mobile/src/hooks/useSettings.ts` (replace AsyncStorage with SecureStore)

**Step 1: Replace AsyncStorage with SecureStore**

In `apps/mobile/src/hooks/useSettings.ts`:

Replace:
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
```
With:
```typescript
import * as SecureStore from "expo-secure-store";
```

In `settingsReducer`, replace:
```typescript
AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(newState));
```
With:
```typescript
SecureStore.setItemAsync(LOCAL_KEY, JSON.stringify(newState));
```

In the `useEffect` inside `useSettings`, replace:
```typescript
AsyncStorage.getItem(LOCAL_KEY),
```
With:
```typescript
SecureStore.getItemAsync(LOCAL_KEY),
```

**Step 2: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useSettings.ts
git commit -m "fix(security): migrate local settings from AsyncStorage to SecureStore (H1)"
```

---

## Task 5: Critical Security Fix — Auth Error Handling Consistency

**Files:**
- Modify: `apps/convex/convex/settings.ts` (use shared `requireAuth` pattern)

**Step 1: Add requireAuth to settings.ts**

The `settings.ts:get` query returns `null` for unauthenticated users (silent fail). Other files like `tasks.ts` throw `ConvexError("Unauthenticated")`. Make `settings.ts:get` consistent:

```typescript
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireAuth(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}

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
```

Note: Check all other query/mutation files for the same pattern. `preferences.ts` and any other file that does `if (!identity) return null` should be updated to throw instead.

**Step 2: Verify deployment**

Run: `cd apps/convex && npx convex dev --once`

**Step 3: Commit**

```bash
git add apps/convex/convex/settings.ts
git commit -m "fix(security): consistent auth error handling across queries (H4)"
```

---

## Task 6: Push Notification Token Registration

**Files:**
- Modify: `apps/convex/convex/schema.ts` (add `pushTokens` table)
- Create: `apps/convex/convex/pushTokens.ts` (register/update mutation)
- Modify: `apps/mobile/app/_layout.tsx` or create `apps/mobile/src/hooks/usePushToken.ts` (register token on launch)

**Step 1: Add pushTokens table to schema**

In `apps/convex/convex/schema.ts`:
```typescript
pushTokens: defineTable({
  userId: v.string(),
  token: v.string(),
  platform: v.string(),
}).index("by_user", ["userId"]),
```

**Step 2: Create pushTokens mutation**

Create `apps/convex/convex/pushTokens.ts`:
```typescript
import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";

export const register = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, { token, platform }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { token, platform });
    } else {
      await ctx.db.insert("pushTokens", { userId, token, platform });
    }
  },
});
```

**Step 3: Create usePushToken hook**

Create `apps/mobile/src/hooks/usePushToken.ts`:
```typescript
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function usePushToken() {
  const registerToken = useMutation(api.pushTokens.register);

  useEffect(() => {
    async function register() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;

      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await registerToken({
        token,
        platform: Platform.OS,
      });
    }
    register().catch(() => {
      // Non-fatal — token registration can retry next launch
    });
  }, [registerToken]);
}
```

**Step 4: Use the hook in the app**

In the main authenticated layout or home screen component, add:
```typescript
import { usePushToken } from "../src/hooks/usePushToken";
// Inside the component:
usePushToken();
```

Note: This hook must be called inside `ConvexBetterAuthProvider` since it uses `useMutation`. Place it in a child component of `_layout.tsx`, not in `_layout.tsx` itself (which is the provider level).

**Step 5: Verify it compiles**

Run: `cd apps/mobile && npx tsc --noEmit`

**Step 6: Deploy and verify**

Run: `cd apps/convex && npx convex dev --once`

**Step 7: Commit**

```bash
git add apps/convex/convex/schema.ts apps/convex/convex/pushTokens.ts apps/mobile/src/hooks/usePushToken.ts
git commit -m "feat: register push notification tokens on app launch"
```

---

## Task 7: Privacy Policy & Terms of Service (Portfolio Site)

**Status: DONE** — Privacy policy and Terms of Service already created at:
- `apps/portfolio/privacy.html`
- `apps/portfolio/terms.html`
- Footer links updated in `apps/portfolio/index.html`

**Step 1: Deploy the portfolio site**

Run:
```bash
cd apps/portfolio && npx wrangler pages deploy . --project-name lullio
```

**Step 2: Verify pages are live**

Visit:
- `https://lullio.pages.dev/privacy.html`
- `https://lullio.pages.dev/terms.html`

Use the privacy policy URL for the Play Store listing.

---

## Task 8: EAS Build & Submit Setup

**Files:**
- Create: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.json` (add `extra.eas.projectId`)

**Step 1: Install EAS CLI globally**

Run:
```bash
npm install -g eas-cli
```

**Step 2: Login to Expo**

Run:
```bash
eas login
```
(Use your Expo account credentials. Create one at expo.dev if needed.)

**Step 3: Initialize EAS in the mobile app**

Run:
```bash
cd apps/mobile && eas init
```
This creates/updates `eas.json` and adds `extra.eas.projectId` to `app.json`.

**Step 4: Configure eas.json for Android production**

Ensure `apps/mobile/eas.json` has:
```json
{
  "cli": {
    "version": ">= 14.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Step 5: Configure environment variables for EAS**

Run:
```bash
cd apps/mobile
eas secret:create --name EXPO_PUBLIC_CONVEX_URL --value "your-convex-url"
eas secret:create --name EXPO_PUBLIC_CONVEX_SITE_URL --value "your-convex-site-url"
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "your-sentry-dsn"
eas secret:create --name EXPO_PUBLIC_POSTHOG_KEY --value "your-posthog-key"
```

**Step 6: Test a preview build**

Run:
```bash
cd apps/mobile && eas build --platform android --profile preview
```
Expected: Build queued on EAS, outputs an APK download link

**Step 7: Commit**

```bash
git add apps/mobile/eas.json apps/mobile/app.json
git commit -m "feat: configure EAS build and submit for Android"
```

---

## Task 9: OAuth Secrets Setup (Google & Apple)

This is a manual step — no code changes, just environment configuration.

**Step 1: Google OAuth**

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (type: Android)
3. Add SHA-1 fingerprint from your signing key:
   ```bash
   cd apps/mobile && eas credentials --platform android
   ```
   (This shows the SHA-1 of your keystore)
4. Also create a Web client ID (needed for the OAuth flow)
5. Add to Convex environment:
   ```bash
   cd apps/convex
   npx convex env set GOOGLE_CLIENT_ID "your-client-id"
   npx convex env set GOOGLE_CLIENT_SECRET "your-client-secret"
   ```

**Step 2: Apple Sign-In**

1. Go to Apple Developer portal → Certificates, Identifiers & Profiles
2. Create a Services ID for Sign in with Apple
3. Generate a key for Sign in with Apple
4. Add to Convex environment:
   ```bash
   cd apps/convex
   npx convex env set APPLE_CLIENT_ID "your-service-id"
   npx convex env set APPLE_CLIENT_SECRET "your-generated-secret"
   ```

**Step 3: Uncomment the env validation in auth.ts**

In `apps/convex/convex/auth.ts`, uncomment the required env check block (lines 13-26):
```typescript
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
```

**Step 4: Deploy and verify**

Run: `cd apps/convex && npx convex deploy`
Expected: No missing env var errors

**Step 5: Commit**

```bash
git add apps/convex/convex/auth.ts
git commit -m "feat: enable OAuth env validation for production"
```

---

## Task 10: Play Store Listing & Submission

This is primarily a manual step with some preparation.

**Step 1: Google Play Developer Account**

1. Go to https://play.google.com/console/signup
2. Pay $25 one-time fee
3. Complete identity verification (takes 24-48 hours)

**Step 2: Create Google Play Service Account (for EAS Submit)**

1. In Google Play Console → Settings → API access
2. Link or create a Google Cloud project
3. Create a service account with "Release Manager" role
4. Download the JSON key file
5. Save as `apps/mobile/google-service-account.json`
6. Add to `.gitignore`:
   ```
   google-service-account.json
   ```

**Step 3: Prepare store listing text**

Short description (80 chars):
```
Smart ADHD task planner with AI difficulty scoring and gamification
```

Long description:
```
ADHD Planner helps you manage tasks with features designed for ADHD brains:

• AI-powered difficulty scoring personalizes each task to your unique challenges
• Gamification with XP and levels makes completing tasks rewarding
• Voice input lets you add tasks hands-free
• Clean, distraction-free interface designed for focus

Created by someone who understands ADHD. Start organizing your day in a way that actually works for your brain.
```

**Step 4: Create feature graphic**

Create a 1024x500 PNG feature graphic. Can use Figma, Canva, or any design tool. Should show the app name and a screenshot or illustration.

**Step 5: Take screenshots**

Take at least 4 phone screenshots of the app running on a device or emulator:
1. Home screen with tasks
2. Task creation / voice input
3. Onboarding / preferences
4. Settings / gamification

Screenshots must be 16:9 or 9:16, minimum 320px, maximum 3840px on any side.

**Step 6: Build production APK/AAB**

Run:
```bash
cd apps/mobile && eas build --platform android --profile production
```

**Step 7: Submit to Play Store**

Run:
```bash
cd apps/mobile && eas submit --platform android --profile production
```

Or manually upload the AAB from the Play Console.

**Step 8: Complete Play Store forms**

In the Google Play Console:
1. Content rating questionnaire (IARC) — answer all questions
2. Data safety form — declare: task data collected, analytics, crash reporting, auth tokens
3. Target audience — select appropriate age group
4. App category: Productivity
5. Privacy policy URL: `<your-convex-site-url>/privacy`

**Step 9: Submit for review**

Submit the internal testing track first, then promote to production.

---

## Summary — Task Dependency Order

```
Task 1 (Sentry) ─────────┐
Task 2 (PostHog) ─────────┤
Task 3 (AI Cost) ──────────┼── All independent, can be parallelized
Task 4 (SecureStore fix) ──┤
Task 5 (Auth fix) ─────────┤
Task 6 (Push tokens) ──────┘
                           │
Task 7 (Privacy policy) ───┤── Can run in parallel with above
                           │
Task 8 (EAS setup) ────────┤── Depends on Sentry + PostHog env vars existing
Task 9 (OAuth secrets) ────┤── Manual, can start anytime (24-48hr for Google verification)
                           │
Task 10 (Store submission) ─── Depends on ALL above being complete
```

**Parallelization:** Tasks 1-7 can all be worked on in parallel. Task 8 needs Tasks 1+2 done (for env vars). Task 9 is manual and should be started early. Task 10 is the final step.

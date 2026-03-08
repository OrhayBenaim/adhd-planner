# Convex Direct + RLS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Express API layer with direct Convex access from mobile, move all points/progress logic to Convex, and enforce row-level security so users can only access their own data.

**Architecture:** Mobile authenticates via better-auth anonymous sign-in (hitting Convex `.site` URL directly for auth only), receives a Convex-compatible JWT, and passes it to `ConvexProviderWithAuth`. All data queries and mutations go directly to Convex via the React SDK. Convex functions enforce RLS by reading `ctx.auth.getUserIdentity()` — a server-verified identity that clients cannot spoof. Express is deleted entirely.

**Tech Stack:** `convex` (React SDK), `@convex-dev/better-auth` (with `convex` plugin re-enabled), `better-auth`, `@better-auth/expo`, `expo-secure-store`

**Packages removed:** `@tanstack/react-query` (mobile), `apps/api` (entire app + all its packages)

---

## Before you start

Two things must be running:
1. `npx convex dev` in `apps/convex/` — keep it running the whole time, it will auto-deploy as you save files
2. Note your deployment URLs from `apps/convex/.env.local`:
   - `CONVEX_URL` — the `.cloud` URL (for `ConvexReactClient`)
   - `CONVEX_SITE_URL` — the `.site` URL (for `authClient` baseURL)

---

### Task 1: Shared types — add UserProgress to packages/types

**Files:**
- Modify: `packages/types/src/index.ts`

**Step 1: Add UserProgress interface**

```typescript
// packages/types/src/index.ts
export interface UserProgress {
  level: number;
  points: number;
  pointsToNextLevel: number;
}
```

Add it after the existing `Task` interface. Leave all other types untouched.

**Step 2: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add UserProgress interface"
```

---

### Task 2: Convex — restore auth.config.ts

**Files:**
- Create: `apps/convex/convex/auth.config.ts`

**Step 1: Create the file**

```typescript
// apps/convex/convex/auth.config.ts
import { getAuthConfigProvider } from "@convex-dev/better-auth";

export default {
  providers: [getAuthConfigProvider()],
};
```

`getAuthConfigProvider()` returns a provider with `applicationID: "convex"` and `type: "customJwt"`. This tells Convex infrastructure to validate JWTs issued by better-auth's convex plugin using the JWKS endpoint at `CONVEX_SITE_URL/api/auth/convex/jwks`.

**Step 2: Commit**

```bash
git add apps/convex/convex/auth.config.ts
git commit -m "feat(convex): restore auth.config.ts with getAuthConfigProvider"
```

---

### Task 3: Convex — restore convex plugin in auth.ts

**Files:**
- Modify: `apps/convex/convex/auth.ts`

**Step 1: Update auth.ts**

```typescript
// apps/convex/convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { expo } from "@better-auth/expo";
import { anonymous } from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: ["adhd-planner://"],
    database: authComponent.adapter(ctx),
    plugins: [
      expo(),
      convex({ authConfig }),
      anonymous(),
    ],
  });
```

**Step 2: Verify `convex dev` (already running) shows no errors**

Watch the terminal running `npx convex dev`. Expected: functions push successfully. If you see an error about `providers.filter`, the `auth.config.ts` from Task 2 was not saved correctly.

**Step 3: Commit**

```bash
git add apps/convex/convex/auth.ts
git commit -m "feat(convex): re-enable convex JWT plugin for direct mobile access"
```

---

### Task 4: Convex — add userProgress table to schema

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Update schema.ts**

```typescript
// apps/convex/convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  userProgress: defineTable({
    userId: v.string(),
    level: v.number(),
    points: v.number(),
    pointsToNextLevel: v.number(),
  }).index("by_user", ["userId"]),
});
```

**Step 2: Verify `convex dev` pushes the new table with no errors**

**Step 3: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "feat(convex): add userProgress table"
```

---

### Task 5: Convex — rewrite tasks.ts with full RLS

**Files:**
- Modify: `apps/convex/convex/tasks.ts`

**Step 1: Replace tasks.ts**

All functions now read `userId` from `ctx.auth.getUserIdentity()` — never from function arguments. Write operations verify the row belongs to the authenticated user before touching it.

```typescript
// apps/convex/convex/tasks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

async function requireAuth(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity.subject;
}

function calcPointsEarned(difficulty: number): number {
  return Math.round(difficulty / 10) + 1;
}

function nextLevelThreshold(level: number): number {
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    difficulty: v.number(),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    return ctx.db.insert("tasks", {
      ...args,
      userId,
      completed: false,
    });
  },
});

export const completeTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);

    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");

    await ctx.db.patch(id, { completed: true });

    // Award points — atomic with task completion
    const existing = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const current = existing ?? { level: 1, points: 0, pointsToNextLevel: 50 };
    const earned = calcPointsEarned(task.difficulty);
    let { level, points, pointsToNextLevel } = current;
    points += earned;
    let leveledUp = false;

    if (points >= pointsToNextLevel) {
      level += 1;
      points -= pointsToNextLevel;
      pointsToNextLevel = nextLevelThreshold(level);
      leveledUp = true;
    }

    const next = { level, points, pointsToNextLevel };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert("userProgress", { userId, ...next });
    }

    return { earned, leveledUp, progress: next };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");
    await ctx.db.delete(id);
  },
});
```

Note: `setCompleted` is removed. `completeTask` replaces it (always completes + awards points). If uncomplete is needed in future, add a separate `uncompleteTask` mutation.

**Step 2: Verify `convex dev` pushes with no errors**

**Step 3: Commit**

```bash
git add apps/convex/convex/tasks.ts
git commit -m "feat(convex): enforce RLS on all task functions, atomic completeTask with points"
```

---

### Task 6: Convex — add progress.ts query

**Files:**
- Create: `apps/convex/convex/progress.ts`

**Step 1: Create the file**

```typescript
// apps/convex/convex/progress.ts
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const progress = await ctx.db
      .query("userProgress")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return progress ?? { level: 1, points: 0, pointsToNextLevel: 50 };
  },
});
```

**Step 2: Verify `convex dev` pushes with no errors**

**Step 3: Commit**

```bash
git add apps/convex/convex/progress.ts
git commit -m "feat(convex): add progress.get query"
```

---

### Task 7: Convex — verify auth routes and JWT are working

**Step 1: Verify anonymous sign-in works**

```bash
curl -s -X POST https://<your-deployment>.convex.site/api/auth/sign-in/anonymous \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: JSON response with a session object (not an error).

**Step 2: Verify JWKS endpoint is live**

```bash
curl -s https://<your-deployment>.convex.site/api/auth/convex/jwks
```

Expected: `{"keys":[...]}` — a JSON Web Key Set. If empty `{"keys":[]}`, a key pair hasn't been generated yet. Sign in once (Step 1) to trigger key generation, then retry.

---

### Task 8: Mobile — install Convex React SDK, remove react-query

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install Convex React SDK**

```bash
cd apps/mobile
npm install convex
```

**Step 2: Remove react-query**

```bash
npm uninstall @tanstack/react-query
```

**Step 3: Verify package.json has `convex` and no `@tanstack/react-query`**

**Step 4: Commit**

```bash
cd ../..
git add apps/mobile/package.json
git commit -m "chore(mobile): add convex SDK, remove react-query"
```

---

### Task 9: Mobile — update authClient.ts to point at Convex site URL

**Files:**
- Modify: `apps/mobile/src/lib/authClient.ts`

**Step 1: Update baseURL**

The authClient needs to hit the Convex `.site` URL directly for anonymous sign-in — this is auth, not data. Data goes through `ConvexReactClient`.

```typescript
// apps/mobile/src/lib/authClient.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { anonymousClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL!,
  plugins: [
    expoClient({
      scheme: "adhd-planner",
      storagePrefix: "adhd-planner",
      storage: SecureStore,
    }),
    anonymousClient(),
  ],
});
```

**Step 2: Commit**

```bash
git add apps/mobile/src/lib/authClient.ts
git commit -m "feat(mobile): point authClient at Convex site URL for JWT auth"
```

---

### Task 10: Mobile — create Convex client and useConvexAuth hook

**Files:**
- Create: `apps/mobile/src/lib/convexClient.ts`

**Step 1: Create the file**

```typescript
// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  const fetchAccessToken = useCallback(
    async (_opts: { forceRefreshToken: boolean }) => {
      try {
        const res = await authClient.$fetch<{ token: string }>(
          "/api/auth/convex/token"
        );
        return res.data?.token ?? null;
      } catch {
        return null;
      }
    },
    [session]
  );

  return {
    isLoading: isPending,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/lib/convexClient.ts
git commit -m "feat(mobile): add ConvexReactClient and useConvexAuth hook"
```

---

### Task 11: Mobile — update _layout.tsx with ConvexProviderWithAuth

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Replace _layout.tsx**

```typescript
// apps/mobile/app/_layout.tsx
import "../global.css";
import { useEffect } from "react";
import { ConvexProviderWithAuth } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { convex, useConvexAuth } from "../src/lib/convexClient";
import { authClient } from "../src/lib/authClient";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch(console.error);
    }
  }, [session, isPending]);

  return (
    <GestureHandlerRootView className="flex-1">
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProviderWithAuth>
    </GestureHandlerRootView>
  );
}
```

Note: `QueryClientProvider` is removed — Convex has its own built-in caching.

**Step 2: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): replace QueryClientProvider with ConvexProviderWithAuth"
```

---

### Task 12: Mobile — rewrite useTasks.ts with Convex hooks

**Files:**
- Modify: `apps/mobile/src/hooks/useTasks.ts`

**Step 1: Replace useTasks.ts**

```typescript
// apps/mobile/src/hooks/useTasks.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Task } from "@adhd-planner/types";

export type CreateTaskInput = {
  title: string;
  description?: string;
  difficulty: number;
  dueDate?: string;
  dueTime?: string;
};

export function useTasks() {
  return useQuery(api.tasks.list) ?? [];
}

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useCompleteTask() {
  return useMutation(api.tasks.completeTask);
}

export function useDeleteTask() {
  return useMutation(api.tasks.remove);
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/hooks/useTasks.ts
git commit -m "feat(mobile): replace apiClient task hooks with Convex hooks"
```

---

### Task 13: Mobile — rewrite useUserProgress.ts with Convex query

**Files:**
- Modify: `apps/mobile/src/hooks/useUserProgress.ts`

**Step 1: Replace useUserProgress.ts**

```typescript
// apps/mobile/src/hooks/useUserProgress.ts
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function useUserProgress() {
  const progress = useQuery(api.progress.get) ?? {
    level: 1,
    points: 0,
    pointsToNextLevel: 50,
  };
  return { progress };
}
```

Note: `addPoints` is gone — points are now awarded atomically inside `tasks.completeTask` on Convex.

**Step 2: Commit**

```bash
git add apps/mobile/src/hooks/useUserProgress.ts
git commit -m "feat(mobile): replace AsyncStorage progress hook with Convex query"
```

---

### Task 14: Mobile — update index.tsx handleComplete, remove addPoints

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Step 1: Find and update handleComplete**

The `handleComplete` currently calls `completeTask.mutateAsync` then `addPoints` separately. Replace both with a single Convex mutation call that returns `{ earned }`.

Find this block:
```typescript
const handleComplete = useCallback(
  async (task: Task) => {
    await completeTask.mutateAsync(task.id);
    const { earned } = await addPoints(task.difficulty);
    setSelectedTask(null);
    setToast({ points: earned, visible: true });
  },
  [completeTask, addPoints]
);
```

Replace with:
```typescript
const handleComplete = useCallback(
  async (task: Task) => {
    const result = await completeTask({ id: task._id });
    setSelectedTask(null);
    setToast({ points: result?.earned ?? 0, visible: true });
  },
  [completeTask]
);
```

Note: Convex tasks use `_id` (not `id`). The `completeTask` mutation now returns `{ earned, leveledUp, progress }` directly.

**Step 2: Remove useUserProgress addPoints from destructuring**

Find:
```typescript
const { progress, addPoints } = useUserProgress();
```

Replace with:
```typescript
const { progress } = useUserProgress();
```

**Step 3: Remove useCreateTask / useCompleteTask / useDeleteTask call-site adjustments**

Convex `useMutation` returns a function directly (not `{ mutateAsync }`). Find all `.mutateAsync(` calls in index.tsx and replace with direct calls:

- `createTask.mutateAsync(input)` → `await createTask(input)`
- `completeTask.mutateAsync(id)` → handled above via `completeTask({ id: task._id })`
- `deleteTask.mutateAsync(id)` → `await deleteTask({ id: task._id })`

**Step 4: Update task id references**

Convex returns `_id` (not `id`) on documents. Search for `task.id` in index.tsx and replace with `task._id` where the task is a Convex document.

**Step 5: Typecheck**

```bash
cd apps/mobile && npm run typecheck
```

Fix any remaining type errors.

**Step 6: Commit**

```bash
cd ../..
git add apps/mobile/app/index.tsx
git commit -m "feat(mobile): wire handleComplete to Convex completeTask mutation"
```

---

### Task 15: Mobile — delete dead code and files

**Files:**
- Delete: `apps/mobile/src/lib/api.ts`
- Delete: `apps/mobile/src/lib/queryClient.ts`
- Delete: `apps/mobile/src/lib/points.ts`
- Delete: `apps/mobile/src/lib/__tests__/points.test.ts`

**Step 1: Update XPBar.tsx — inline xpPercent**

`XPBar` imports `xpPercent` from `points.ts` which we're deleting. Inline it:

```typescript
// In XPBar.tsx, replace:
import { UserProgress, xpPercent } from "../lib/points";
// With:
import type { UserProgress } from "@adhd-planner/types";
// And replace:
const percent = xpPercent(progress);
// With:
const percent = Math.min(progress.points / progress.pointsToNextLevel, 1);
```

**Step 2: Delete the files**

```bash
rm apps/mobile/src/lib/api.ts
rm apps/mobile/src/lib/queryClient.ts
rm apps/mobile/src/lib/points.ts
rm apps/mobile/src/lib/__tests__/points.test.ts
```

**Step 3: Typecheck**

```bash
cd apps/mobile && npm run typecheck
```

Fix any remaining import errors.

**Step 4: Commit**

```bash
cd ../..
git add -A
git commit -m "chore(mobile): delete api.ts, queryClient.ts, points.ts and move xpPercent inline"
```

---

### Task 16: Mobile — update env files

**Files:**
- Modify: `apps/mobile/.env.local`

**Step 1: Update .env.local**

```bash
# apps/mobile/.env.local
EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
```

Replace `<your-deployment>` with your actual deployment name from `apps/convex/.env.local`.

Note: `EXPO_PUBLIC_API_URL` is removed — Express is gone.

---

### Task 17: Delete apps/api

**Step 1: Delete the directory**

```bash
rm -rf apps/api
```

**Step 2: Verify nothing else references it**

```bash
grep -r "apps/api\|@adhd-planner/api" . --include="*.json" --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .git
```

Expected: no results (or only gitignore/lockfile entries which are fine).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete apps/api — Express replaced by direct Convex access"
```

---

### Task 18: Clean up shared types

**Files:**
- Modify: `packages/types/src/index.ts`

**Step 1: Remove API-centric types that no longer apply**

Remove `User`, `ApiResponse`, and `AuthSession` — these were Express response types. Keep `Task` and `UserProgress`.

```typescript
// packages/types/src/index.ts
export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: number;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  _creationTime: number;
}

export interface UserProgress {
  level: number;
  points: number;
  pointsToNextLevel: number;
}
```

Note: Convex documents use `_id` and `_creationTime` instead of `id`, `createdAt`, `updatedAt`.

**Step 2: Typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "chore(types): remove Express-era types, update Task to Convex shape"
```

---

### Task 19: End-to-end verification

**Step 1: Start services**

Terminal 1 — Convex (if not already running):
```bash
cd apps/convex && npx convex dev
```

Terminal 2 — Mobile:
```bash
cd apps/mobile && npm run dev
```

**Step 2: Verify anonymous sign-in**

Open the app. Check Convex dashboard → Data → betterAuth component → `session` table. A new anonymous session should appear.

**Step 3: Verify JWT auth**

Check Convex dashboard → Data → betterAuth component → `jwks` table. At least one key should be present (generated on first sign-in).

**Step 4: Verify tasks load**

The tasks list should appear (empty on first run). Check Convex dashboard → Data → `tasks` table.

**Step 5: Create a task**

Add a task via the app. Check Convex dashboard → `tasks` table — a new row should appear with the correct `userId` matching the session.

**Step 6: Complete a task**

Complete the task. Check:
- `tasks` table: `completed: true`
- `userProgress` table: a row appears with `points > 0`
- App XP bar updates

**Step 7: Verify RLS — user can only see their own tasks**

This is enforced by `requireAuth` in every Convex function. There's no API to bypass it — the userId always comes from `ctx.auth.getUserIdentity()`.

**Step 8: Verify JWKS endpoint**

```bash
curl -s https://<your-deployment>.convex.site/api/auth/convex/jwks
```

Expected: `{"keys":[{...}]}` with at least one key.

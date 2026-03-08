# Turborepo Monorepo Init Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the adhd-planner monorepo with Turborepo, npm workspaces, Expo mobile app, Node/Express API, Convex backend, and a shared types package.

**Architecture:** Turborepo orchestrates three apps (`mobile`, `api`, `convex`) and one shared package (`types`). The Expo app calls the Express API via TanStack Query; the API proxies data to Convex; better-auth handles sessions in the API.

**Tech Stack:** Turborepo, npm workspaces, Expo + NativeWind v4 + TanStack Query, Node.js + Express + better-auth, Convex, TypeScript throughout.

---

## Task 1: Root monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Step 1: Create root `package.json`**

```json
{
  "name": "adhd-planner",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 3: Create root `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

**Step 4: Create `.gitignore`**

```
node_modules/
dist/
.expo/
.turbo/
*.log
.env
.env.local
.convex/
```

**Step 5: Install turbo at root**

Run from `adhd-planner/`:
```bash
npm install
```
Expected: `node_modules/` created, `package-lock.json` generated.

**Step 6: Commit**

```bash
git add package.json turbo.json tsconfig.base.json .gitignore package-lock.json
git commit -m "chore: init turborepo root with npm workspaces"
```

---

## Task 2: packages/types

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`

**Step 1: Create directory**

```bash
mkdir -p packages/types/src
```

**Step 2: Create `packages/types/package.json`**

```json
{
  "name": "@adhd-planner/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext"
  },
  "include": ["src"]
}
```

**Step 4: Create `packages/types/src/index.ts`**

```typescript
// Domain types shared between apps/api and apps/mobile

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Auth
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
}
```

**Step 5: Verify types compile**

```bash
cd packages/types && npm run typecheck
```
Expected: No errors.

**Step 6: Commit**

```bash
cd ../../
git add packages/
git commit -m "feat: add shared types package"
```

---

## Task 3: apps/convex initialization

**Files:**
- Create: `apps/convex/package.json`
- Create: `apps/convex/convex/schema.ts`
- Create: `apps/convex/convex/tasks.ts`

**Step 1: Create directory**

```bash
mkdir -p apps/convex/convex
```

**Step 2: Create `apps/convex/package.json`**

```json
{
  "name": "@adhd-planner/convex",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "convex dev",
    "deploy": "convex deploy"
  },
  "dependencies": {
    "convex": "^1.0.0"
  }
}
```

**Step 3: Install Convex in `apps/convex`**

```bash
cd apps/convex && npm install
```

**Step 4: Initialize Convex project**

```bash
npx convex dev --once
```
Expected: Prompts for Convex project name. Follow the prompts to create/link a Convex project. This generates `convex.json` or links via `.env.local`.

> **Note:** You need a Convex account at dashboard.convex.dev. Sign up if needed.

**Step 5: Create `apps/convex/convex/schema.ts`**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    dueDate: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  users: defineTable({
    externalId: v.string(), // better-auth user ID
    email: v.string(),
    name: v.string(),
  }).index("by_external_id", ["externalId"]),
});
```

**Step 6: Create `apps/convex/convex/tasks.ts`**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("tasks", {
      ...args,
      completed: false,
    });
  },
});

export const setCompleted = mutation({
  args: { id: v.id("tasks"), completed: v.boolean() },
  handler: async (ctx, { id, completed }) => {
    await ctx.db.patch(id, { completed });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
```

**Step 7: Commit**

```bash
cd ../../
git add apps/convex/
git commit -m "feat: add convex app with tasks schema and mutations"
```

---

## Task 4: apps/api — Express + TypeScript scaffold

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`

**Step 1: Create directory**

```bash
mkdir -p apps/api/src
```

**Step 2: Create `apps/api/package.json`**

```json
{
  "name": "@adhd-planner/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@adhd-planner/types": "*",
    "better-auth": "^1.0.0",
    "convex": "^1.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 4: Create `apps/api/src/index.ts`**

```typescript
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 5: Install dependencies**

```bash
cd apps/api && npm install
```

**Step 6: Verify it starts**

```bash
npm run dev
```
Expected: `API server running on http://localhost:3001`

Stop with Ctrl+C.

**Step 7: Commit**

```bash
cd ../../
git add apps/api/
git commit -m "feat: scaffold Express API app"
```

---

## Task 5: apps/api — better-auth integration

**Files:**
- Create: `apps/api/src/auth.ts`
- Create: `apps/api/.env.example`
- Modify: `apps/api/src/index.ts`

**Step 1: Create `apps/api/.env.example`**

```
BETTER_AUTH_SECRET=change-me-to-a-random-32-char-string
BETTER_AUTH_URL=http://localhost:3001
DATABASE_URL=
```

**Step 2: Create `apps/api/.env` from example**

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `.env` and set `BETTER_AUTH_SECRET` to a random string (e.g., `openssl rand -hex 16`).

**Step 3: Create `apps/api/src/auth.ts`**

> **Note:** better-auth requires a database adapter. For this initial setup we use the in-memory adapter for development. Replace with your production adapter (Postgres, SQLite, etc.) before deploying.

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  emailAndPassword: {
    enabled: true,
  },
  // TODO: replace with persistent adapter before production
  // e.g. import { drizzleAdapter } from "better-auth/adapters/drizzle"
});
```

**Step 4: Mount auth in `apps/api/src/index.ts`**

Replace the file contents:

```typescript
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// better-auth handles all /api/auth/* routes
app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 5: Verify typecheck passes**

```bash
cd apps/api && npm run typecheck
```
Expected: No errors.

**Step 6: Commit**

```bash
cd ../../
git add apps/api/src/auth.ts apps/api/src/index.ts apps/api/.env.example
git commit -m "feat: integrate better-auth into Express API"
```

---

## Task 6: apps/api — Convex proxy middleware

**Files:**
- Create: `apps/api/src/convex.ts`
- Create: `apps/api/src/routes/tasks.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/.env.example`

**Step 1: Add Convex URL to `.env.example`**

Add to `apps/api/.env.example`:
```
CONVEX_URL=https://your-deployment.convex.cloud
```

Also add `CONVEX_URL` to `apps/api/.env` — get the value from your Convex dashboard or `apps/convex/.env.local`.

**Step 2: Create `apps/api/src/convex.ts`**

```typescript
import { ConvexHttpClient } from "convex/browser";

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is required");
}

export const convex = new ConvexHttpClient(process.env.CONVEX_URL);
```

**Step 3: Create `apps/api/src/routes/tasks.ts`**

```typescript
import { Router } from "express";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { convex } from "../convex";
import type { AuthSession } from "@adhd-planner/types";

const router = Router();

// GET /api/tasks — list tasks for authenticated user
router.get("/", async (req, res) => {
  const session = req.session as AuthSession | undefined;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tasks = await convex.query(api.tasks.list, { userId: session.userId });
  res.json({ data: tasks });
});

// POST /api/tasks — create a task
router.post("/", async (req, res) => {
  const session = req.session as AuthSession | undefined;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { title, description, dueDate } = req.body as {
    title: string;
    description?: string;
    dueDate?: string;
  };
  const id = await convex.mutation(api.tasks.create, {
    userId: session.userId,
    title,
    description,
    dueDate,
  });
  res.status(201).json({ data: { id } });
});

// PATCH /api/tasks/:id/complete
router.patch("/:id/complete", async (req, res) => {
  const session = req.session as AuthSession | undefined;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { completed } = req.body as { completed: boolean };
  await convex.mutation(api.tasks.setCompleted, {
    id: req.params.id as any,
    completed,
  });
  res.json({ data: { success: true } });
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const session = req.session as AuthSession | undefined;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await convex.mutation(api.tasks.remove, { id: req.params.id as any });
  res.json({ data: { success: true } });
});

export default router;
```

**Step 4: Mount tasks router in `apps/api/src/index.ts`**

Add import and mount after the auth handler:

```typescript
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import tasksRouter from "./routes/tasks";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use("/api/tasks", tasksRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 5: Verify typecheck**

```bash
cd apps/api && npm run typecheck
```
Expected: No errors (or only warnings about `as any` casts for Convex IDs — acceptable for now).

**Step 6: Commit**

```bash
cd ../../
git add apps/api/src/convex.ts apps/api/src/routes/ apps/api/src/index.ts apps/api/.env.example
git commit -m "feat: add Convex proxy middleware and task routes"
```

---

## Task 7: apps/mobile — Expo + NativeWind scaffold

**Files:**
- Generated by `create-expo-app`
- Modify: `apps/mobile/babel.config.js`
- Modify: `apps/mobile/metro.config.js`
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`

**Step 1: Create Expo app**

From `adhd-planner/apps/`:
```bash
npx create-expo-app@latest mobile --template blank-typescript
```
Expected: `apps/mobile/` created with Expo project.

**Step 2: Update `apps/mobile/package.json` name**

Open `apps/mobile/package.json` and change the `name` field to:
```json
"name": "@adhd-planner/mobile"
```

Also add the types package as a dependency:
```json
"dependencies": {
  "@adhd-planner/types": "*",
  ...existing deps...
}
```

**Step 3: Install NativeWind v4 and its peer deps**

```bash
cd apps/mobile
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```

**Step 4: Create `apps/mobile/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 5: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 6: Update `apps/mobile/babel.config.js`**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 7: Update `apps/mobile/metro.config.js`**

If the file doesn't exist, create it:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 8: Add global.css import to app entry**

Open `apps/mobile/app/_layout.tsx` (or `App.tsx` if not using Expo Router). Add at the very top:
```typescript
import "../global.css";
```

**Step 9: Update `apps/mobile/package.json` to add dev script compatible with turbo**

Ensure the `dev` script is:
```json
"scripts": {
  "dev": "expo start",
  ...
}
```

**Step 10: Verify NativeWind works**

In `apps/mobile/app/index.tsx`, add a className to a Text component:
```tsx
<Text className="text-blue-500 text-2xl">Hello NativeWind</Text>
```

Run:
```bash
cd apps/mobile && npm run dev
```
Expected: App loads, text is blue and large.

Stop with Ctrl+C.

**Step 11: Commit**

```bash
cd ../../
git add apps/mobile/
git commit -m "feat: scaffold Expo mobile app with NativeWind v4"
```

---

## Task 8: apps/mobile — TanStack Query setup

**Files:**
- Create: `apps/mobile/src/lib/queryClient.ts`
- Create: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Install TanStack Query**

```bash
cd apps/mobile
npm install @tanstack/react-query
```

**Step 2: Create `apps/mobile/src/lib/queryClient.ts`**

```bash
mkdir -p apps/mobile/src/lib
```

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});
```

**Step 3: Create `apps/mobile/src/lib/api.ts`**

This is the central fetch utility for all API calls:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  const { data } = await res.json();
  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

**Step 4: Create `apps/mobile/.env.local`**

```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

**Step 5: Wrap app with QueryClientProvider in `apps/mobile/app/_layout.tsx`**

```tsx
import "../global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

**Step 6: Verify typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```
Expected: No errors.

**Step 7: Commit**

```bash
cd ../../
git add apps/mobile/src/ apps/mobile/app/_layout.tsx apps/mobile/.env.local
git commit -m "feat: add TanStack Query setup to mobile app"
```

---

## Task 9: Verify full monorepo with turbo dev

**Step 1: Install all workspace dependencies from root**

```bash
cd adhd-planner/
npm install
```
Expected: All workspace packages linked, no errors.

**Step 2: Run typecheck across all packages**

```bash
npm run typecheck
```
Expected: All packages pass typecheck.

**Step 3: Run turbo dev**

```bash
npm run dev
```
Expected: All three apps start:
- `apps/convex` → Convex dev server running
- `apps/api` → `API server running on http://localhost:3001`
- `apps/mobile` → Expo dev server with QR code

**Step 4: Smoke test the API**

```bash
curl http://localhost:3001/health
```
Expected: `{"status":"ok"}`

**Step 5: Final commit**

```bash
git add package-lock.json
git commit -m "chore: finalize monorepo setup and verify turbo dev"
```

---

## Notes

- `apps/convex` requires a Convex account and `npx convex dev` login on first run
- better-auth's in-memory adapter in Task 5 is for development only — add a persistent adapter before any real usage
- Convex IDs typed as `any` in the task routes (Task 6) — replace with proper ID types after Convex code generation runs
- Add `apps/api/.env` and `apps/mobile/.env.local` to `.gitignore`

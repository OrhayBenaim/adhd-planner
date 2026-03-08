# Backend + Frontend Integration Design

**Date:** 2026-03-08

## Goal

Wire the mobile app to a real, persistent backend. Users are created automatically (anonymous auth) on first launch. Tasks are stored in Convex and survive app restarts.

## Architecture

```
Mobile (Expo)
├── authClient (@better-auth/expo) ──→ Convex HTTP  (/api/auth/*)
└── apiClient  (TanStack Query)    ──→ Express API  (:3001 /api/tasks)
                                         └── validates session via Convex auth HTTP
                                         └── calls Convex mutations for task CRUD
```

Auth lives in Convex, served as HTTP actions via `@convex-dev/better-auth`. Express validates sessions by calling Convex's own `/api/auth/get-session` endpoint — no separate auth database needed.

## Tech Stack

- `@convex-dev/better-auth` — Convex component that stores sessions/users in Convex and mounts auth HTTP routes
- `better-auth@1.4.9` + `@better-auth/expo@1.4.9` — pinned versions required by `@convex-dev/better-auth`
- `expo-secure-store` — secure session cookie storage on device
- `anonymous` plugin — silently creates a user on first launch, no signup screen needed

## Data Flow

### First Launch
1. `_layout.tsx` checks for existing session via `authClient.useSession()`
2. No session → `authClient.signIn.anonymous()` → Convex creates anonymous user + session
3. Session token stored in `expo-secure-store`

### Every API Request
1. TanStack Query hook calls `apiClient.get/post/patch/delete`
2. `apiClient` calls `authClient.getCookie()` and injects `Cookie` header
3. Express receives request, calls `GET ${CONVEX_SITE_URL}/api/auth/get-session` with that cookie
4. Gets back `{ user: { id } }` → uses `userId` for Convex task operations

### Future: Connect Account
- User presses "Connect account" → `authClient.signIn.email()` or OAuth
- `onLinkAccount` callback migrates data from anonymous user to real user
- Anonymous record deleted automatically by better-auth

## Changes Per App

### apps/convex
- Bump `convex` to `^1.25.0` (minimum required)
- Install `@convex-dev/better-auth`
- `convex/convex.config.ts` — register `betterAuth` component
- `convex/auth.config.ts` — `AuthConfig` with Convex deployment URL
- `convex/auth.ts` — `createAuth(ctx)` with `expo()`, `convex()`, `anonymous()` plugins
- `convex/http.ts` — mount auth routes via `authComponent.registerRoutes`
- `convex/schema.ts` — add `difficulty: v.number()` and `dueTime: v.optional(v.string())` to tasks; drop manual `users` table (managed by better-auth component)
- `convex/tasks.ts` — add `difficulty` + `dueTime` to `create` mutation args

### apps/api
- Pin `better-auth` to `1.4.9`
- Remove in-memory `auth.ts` instance
- `routes/tasks.ts` — replace `auth.api.getSession()` with fetch to `${CONVEX_SITE_URL}/api/auth/get-session`
- `routes/tasks.ts` — pass `difficulty` + `dueTime` in create route
- `.env` — add `CONVEX_SITE_URL`

### apps/mobile
- Install `@better-auth/expo@1.4.9`, `expo-secure-store`, `expo-network`
- `src/lib/authClient.ts` — `createAuthClient` with `expoClient` + `anonymousClient` plugins
- `src/lib/api.ts` — inject `Cookie: authClient.getCookie()` header on every request
- `app/_layout.tsx` — auto sign-in anonymously if no session on first launch
- `.env.local` — add `EXPO_PUBLIC_CONVEX_SITE_URL`

## Environment Variables

| App     | Variable                    | Value                              |
|---------|-----------------------------|------------------------------------|
| convex  | `BETTER_AUTH_SECRET`        | random 32-char string              |
| convex  | `CONVEX_SITE_URL`           | your Convex deployment HTTP URL    |
| api     | `CONVEX_URL`                | Convex deployment URL              |
| api     | `CONVEX_SITE_URL`           | Convex deployment HTTP URL         |
| mobile  | `EXPO_PUBLIC_API_URL`       | http://localhost:3001              |
| mobile  | `EXPO_PUBLIC_CONVEX_SITE_URL` | Convex deployment HTTP URL       |

## What Does NOT Change

- TanStack Query hooks (`useTasks`, etc.) — no changes needed
- Task API route paths (`GET/POST/PATCH/DELETE /api/tasks`) — unchanged
- `apiClient` base URL — still points to Express
- XP/settings logic — unchanged, still AsyncStorage

# Turborepo Monorepo Setup Design

**Date:** 2026-03-08
**Project:** ADHD Planner

## Overview

Initialize the project as a Turborepo monorepo with npm workspaces containing a mobile Expo app, a Node.js API server, and a Convex backend.

## Monorepo Structure

```
adhd-planner/
├── apps/
│   ├── mobile/       ← Expo + NativeWind + TanStack Query
│   ├── api/          ← Node.js + Express + better-auth
│   └── convex/       ← Convex schema + functions
├── packages/
│   └── types/        ← Shared TypeScript types
├── turbo.json
├── package.json      ← npm workspaces root
└── .gitignore
```

## Apps

### `apps/mobile`
- **Framework:** Expo (React Native), TypeScript
- **Navigation:** Expo Router
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **Data fetching:** TanStack Query (React Query) — all API calls go through React Query hooks
- **Auth:** Session cookie/token from `apps/api` via better-auth

### `apps/api`
- **Runtime:** Node.js, TypeScript
- **Framework:** Express
- **Auth:** better-auth (session management, user registration/login)
- **Database access:** Convex Node client — proxies all data operations to `apps/convex`
- **Role:** Single backend entry point for the mobile app; no direct Expo→Convex connection

### `apps/convex`
- **Platform:** Convex
- **Contents:** Schema definitions, queries, mutations
- **Deployment:** `npx convex deploy` (separate from Node API)
- **Access:** Called only from `apps/api`, never directly from mobile

### `packages/types`
- Shared TypeScript types for API request/response shapes and domain models (Task, PlannerEntry, User, etc.)
- Imported by both `apps/mobile` and `apps/api`

## Data Flow

```
Expo app
  → POST /auth/*        → apps/api (better-auth handles session)
  → GET/POST /api/*     → apps/api → Convex Node client → apps/convex
```

No real-time subscriptions. Request/response only.

## Turborepo Pipeline

```json
{
  "tasks": {
    "build":      { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":        { "persistent": true, "cache": false },
    "lint":       {},
    "typecheck":  { "dependsOn": ["^build"] }
  }
}
```

`turbo dev` runs all three apps concurrently:
- `apps/mobile` → `expo start`
- `apps/api` → `tsx watch` (Express dev server)
- `apps/convex` → `npx convex dev`

## Package Manager

npm with workspaces (pnpm excluded due to git worktree compatibility issues).

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Monorepo tool | Turborepo | Best-in-class task caching, simple config |
| Package manager | npm | pnpm has issues with git worktrees |
| Mobile styling | NativeWind v4 | Tailwind DX on React Native |
| Data fetching | TanStack Query | Caching, mutations, loading states out of the box |
| Node framework | Express | Battle-tested, large ecosystem |
| Auth | better-auth | Modern, TypeScript-first auth for Node |
| Database | Convex | Real-time capable BaaS, used as a proxied data layer |
| Convex placement | `apps/convex` | Matches Convex's own CLI/deployment lifecycle |
| Auth↔Convex | Session proxy | Node API proxies Convex calls on behalf of authed users |

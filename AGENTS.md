# ADHD Planner

## Project Overview

This is a TypeScript monorepo for an ADHD planning/productivity app. It uses Turborepo for orchestration with npm workspaces.

## Architecture

```
apps/
  convex/       — Backend (Convex serverless functions + Better Auth)
  mobile/       — React Native mobile app (Expo SDK 55 + Expo Router)
  portfolio/    — Static landing page (deployed to Cloudflare Pages)
packages/
  types/        — Shared TypeScript type definitions (@adhd-planner/types)
```

## Tech Stack

- **Runtime**: TypeScript 5.x, ES2022 target, strict mode
- **Backend**: Convex (v1.32.0) with Better Auth for authentication
- **Mobile**: React Native 0.83 + Expo SDK 55 + Expo Router
- **Styling**: NativeWind v4 + Tailwind CSS v3
- **Auth**: Better Auth with Google Sign-In + Expo integration
- **Analytics**: PostHog (react-native SDK)
- **Error Tracking**: Sentry (react-native)
- **Monetization**: RevenueCat (react-native-purchases)
- **UI**: Gorhom Bottom Sheet, Reanimated v4, Gesture Handler
- **Testing**: Jest 30 + ts-jest
- **Deployment**: EAS Build (mobile), Cloudflare Wrangler Pages (portfolio)
- **Package Manager**: npm 11.6.2

## Key Commands

```bash
# Development (from root, via Turbo)
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps
npm run typecheck    # Type-check all apps
npm run lint         # Lint all apps

# Mobile (from apps/mobile/)
npx expo start      # Start Expo dev server
npm test            # Run Jest tests
npm run typecheck   # Type-check mobile app

# Convex (from apps/convex/)
npx convex dev      # Start Convex dev server
npx convex deploy   # Deploy Convex functions

# Portfolio (from apps/portfolio/)
npx wrangler pages deploy . --project-name lullio
```

## Rules

- Use TypeScript strict mode. Never use `any` unless absolutely necessary.
- Follow the existing code patterns — check nearby files before creating new ones.
- Shared types go in `packages/types/`, not duplicated across apps.
- Mobile styling uses NativeWind (Tailwind classes on React Native components).
- Always run `npm run typecheck` after making changes to verify nothing is broken.
- Never edit `.env` files directly — they contain secrets. Use `.env.example` as reference.
- Convex functions follow Convex conventions (queries, mutations, actions in the `convex/` directory).
- When adding new dependencies, add them to the specific app/package that needs them, not the root.

## Protected Files

Do not modify these files without explicit permission:
- `*.proto` files — Proto definitions require proto:generate + rebuild
- `.env*` files — Contain secrets
- `opencode.json` / `.opencode/` config files — AI tool configuration
- `.claude/settings.json` — Claude Code project settings

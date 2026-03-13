# CLAUDE.md — ADHD Planner (Lullio)

## Critical Agent Rules

### Worktree Requirement
**ALWAYS use git worktrees when spawning agents for implementation work.** Pass `isolation: ".worktree"` when using the Agent tool for any task that writes code. This prevents agents from stepping on each other or the main workspace. Only skip worktrees for read-only research/exploration agents.

**If you are already in a worktree** (check the working directory path and environment info), do NOT call `EnterWorktree` or create another worktree. Work directly in the current worktree on its existing branch.

### Token Conservation
Do NOT explore the codebase to understand the project. Everything you need is in this file and `AGENTS.md`. Jump straight to the task. If you need to find a specific file, use Glob/Grep — do not do broad codebase exploration.

---

## Project Overview

**Lullio** (package name: `com.ottersprod.lullio`) — a planning/productivity mobile app. TypeScript monorepo using Turborepo + npm workspaces.

**App name**: Lullio | **Bundle ID**: `com.ottersprod.lullio`

## Architecture

```
apps/
  convex/        # Backend — Convex serverless functions + Better Auth
  mobile/        # Frontend — React Native / Expo SDK 55 / Expo Router
  portfolio/     # Static landing page — Cloudflare Pages
packages/
  types/         # Shared TypeScript interfaces (@adhd-planner/types)
docs/
  plans/         # Architecture & implementation plans (50+ files)
  backlog/       # Future work ideas
  todos/         # Specific cleanup tasks
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x, strict mode, ES2022 |
| Backend | Convex 1.32.0 |
| Auth | Better Auth 1.4.9 + anonymous auth + Google OAuth |
| Mobile | React Native 0.83 + Expo SDK 55 + Expo Router 55 |
| Styling | NativeWind 4.2.2 + Tailwind CSS 3.4.19 |
| State | Convex queries/mutations (server), React Context (UI), SecureStore (persistence) |
| UI Components | Gorhom Bottom Sheet 5.2, Reanimated 4.2, Gesture Handler 2.30 |
| Voice | Expo Speech Recognition 3.1.1 |
| Analytics | PostHog (react-native, EU instance) |
| Errors | Sentry (react-native, 20% sample rate) |
| Monetization | RevenueCat (react-native-purchases) |
| AI | OpenRouter API for task difficulty scoring |
| Testing | Jest 30 + ts-jest |
| Build | EAS Build (mobile), Wrangler (portfolio) |
| Package Manager | npm 11.6.2 |

## Commands

```bash
# Root (Turbo)
npm run dev           # Start all apps
npm run typecheck     # Type-check all apps
npm run build         # Build all
npm run lint          # Lint all

# Mobile (apps/mobile/)
npx expo start        # Expo dev server
npm test              # Jest tests
npm run typecheck     # Type-check

# Backend (apps/convex/)
npx convex dev        # Convex dev server
npx convex deploy     # Deploy functions
```

## Mobile App Structure (apps/mobile/)

### Routing (Expo Router — file-based)
```
app/
  _layout.tsx          # Root layout — all providers (Gesture, Auth, Convex, Premium, PostHog, Sentry)
  index.tsx            # Auth gate → onboarding redirect or HomeScreen
  paywall.tsx          # Premium paywall modal
  sign-in-gate.tsx     # Auth required modal
  (onboarding)/        # Onboarding flow (6 screens)
    welcome.tsx, sign-in.tsx, difficulties.tsx, strengths.tsx, work-time.tsx, notifications.tsx
```

### Key Source Directories (src/)
```
components/
  home/
    HomeScreen.tsx        # Main screen
    HomeProvider.tsx       # Context: tasks, progress, settings, mutations, sheet management
    SheetFlowProvider.tsx  # Multi-step task creation state machine (useReducer)
    SheetManager.tsx       # Mounts all 10 bottom sheets
    MainContent.tsx        # Task list, mood slider, daily view
  sheets/
    AddTaskSheet.tsx       # Text/voice task input
    AllTasksSheet.tsx      # View all tasks
    SelectDaySheet.tsx     # Date picker
    SelectTimeSheet.tsx    # Time picker
    TaskSummarySheet.tsx   # Batch task review
    SettingsSheet.tsx      # App settings
    PreferencesSheet.tsx   # User preferences
    ProfileSheet.tsx       # User profile
    AchievementsSheet.tsx  # Achievement badges
    InsightsSheet.tsx      # Usage insights
  auth/                   # Email forms, social auth, account linking
  onboarding/             # Layout, provider, chip grid, progress bar
  settings/               # VoiceLanguages.tsx
  [reusable]              # TaskCard, BottomNav, XPBar, StreakBadge, MoodSlider, ScrollingWaveform, AppPressable

hooks/
  useTasks.ts             # Task CRUD hooks (wraps Convex)
  usePreferences.ts       # Onboarding preferences
  useSettings.ts          # Local + remote settings (useReducer)
  useSpeechRecognition.ts # Voice input
  usePremium.tsx          # RevenueCat subscription state
  useUserProgress.ts      # XP/level tracking
  usePushToken.ts         # Push notification token

lib/
  authClient.ts           # Better Auth client config
  convexClient.ts         # ConvexProviderWithAuth (session refresh on app resume)
  taskSplitter.ts         # Smart transcription splitting (conjunctions, verbs, numbers)
  dateTimeConvert.ts      # Date/time formatting
  posthog.ts              # PostHog analytics init
  deviceId.ts             # Device ID management
  soundStore.ts           # Audio playback
  googleSignIn.ts         # Google OAuth
  widgetSync.ts           # Home screen widget sync
  __tests__/              # Unit tests (taskSplitter, moodLabels)
```

### State Management Patterns
1. **Server state**: Convex `useQuery()` / `useMutation()` — real-time, auto-cached
2. **UI state**: React Context (`HomeProvider`, `SheetFlowProvider`, `PremiumProvider`)
3. **Complex local state**: `useReducer` (settings, input modes, flow steps)
4. **Persistence**: `expo-secure-store` (settings, device ID)

### Task Creation Flow
1. User taps "+" → `SheetFlowProvider.start("addTask")`
2. `AddTaskSheet` → text or voice input
3. Voice → `splitTranscription()` for smart splitting
4. Batch tasks → `TaskSummarySheet` for review
5. `SelectDaySheet` → pick date
6. `SelectTimeSheet` → pick time
7. Mutation → `api.tasks.create()` → AI difficulty scoring scheduled

### Auth Flow
1. App launch → check `authClient.useSession()`
2. No session → anonymous sign-in
3. Check `useNeedsOnboarding()`
4. Onboarding not done → redirect to onboarding screens
5. Done → HomeScreen
6. Account linking later (email/Google) → `migration.ts` merges anonymous data

## Backend Structure (apps/convex/convex/)

### Schema (schema.ts)
| Table | Key Fields | Indexes |
|-------|-----------|---------|
| tasks | title, description, difficulty, completed, dueDate, dueTime | userId |
| userProgress | level, points, pointsToNextLevel | userId |
| userPreferences | name, bestWorkTimes[], difficulties[], strengths[], onboardingCompleted | userId |
| userSettings | aiEnabled, userAiEnabled, notificationsEnabled, deviceId | userId |
| streaks | currentStreak, longestStreak, lastCompletionDate | userId |
| achievements | achievementId, unlockedAt | userId+achievementId |
| subscriptions | isActive, productId, expiresAt | userId, revenueCatId |
| aiScoringAudit | score, cost, model | taskId, userId |
| userCosts, monthlyAiCosts | totalCost | userId, deviceId+month |
| appConfig | key, value | key |
| pushTokens | token, platform | userId |
| coachNotificationLog | message, sentAt | userId |
| aiCredits | balance | userId |

### API Functions
| File | Functions | Purpose |
|------|----------|---------|
| tasks.ts | list, create, completeTask, update, remove | Task CRUD + points/streak on completion |
| preferences.ts | needsOnboarding, get, save, update | Onboarding preferences |
| settings.ts | get, setUserAiEnabled, setNotificationsEnabled, registerDeviceId | Settings with defaults |
| streaks.ts | get, updateOnCompletion | Streak tracking (resets if no completion yesterday) |
| progress.ts | — | XP/level with exponential thresholds (50 * 1.5^n) |
| ai.ts | scoreTaskDifficulty, updateTaskDifficulty, logScoringAudit | OpenRouter LLM scoring (rate-limited: 10/60s) |
| auth.ts | — | Better Auth config (JWT RS256, anonymous + Google) |
| subscriptions.ts | — | RevenueCat webhook integration |
| credits.ts | — | AI credit tracking |
| migration.ts | migrateUserData | Anonymous → authenticated data merge |
| achievements.ts | — | Badge/milestone system |

### Validation (lib/validation.ts)
- Limits: MAX_TITLE=500, MAX_DESCRIPTION=5000, MAX_NAME=200, MAX_PREF_ITEM=100, MAX_PREF_ARRAY=20
- Format: DATE_RE=`YYYY-MM-DD`, TIME_RE=`HH:mm`
- `sanitizeForPrompt()` removes control chars

## Shared Types (packages/types/src/index.ts)

Key interfaces: `Task`, `UserProgress`, `UserPreferences`, `Subscription`, `StreakData`, `Achievement`, `WeeklyReport`

## Coding Rules

- **TypeScript strict mode** — never use `any` unless absolutely necessary
- **Follow existing patterns** — check nearby files before creating new ones
- **Shared types** go in `packages/types/`, never duplicated
- **Mobile styling** uses NativeWind (Tailwind classes on RN components)
- **Always run `npm run typecheck`** after changes
- **Always run `npx -y react-doctor@latest .`** from `apps/mobile/` after any mobile code change. Ignore icon-related warnings (will be fixed later). All other warnings must be fixed. If a warning is about too many state calls, refactor the state logic to use `useReducer`.
- **Never edit `.env` files** — they contain secrets
- **Convex conventions** for backend functions (queries, mutations, actions)
- **Dependencies** go in the specific app/package, not the root
- **Validation** always on backend before DB operations
- **Errors**: throw `ConvexError` for client-facing, Sentry for logging
- **Hooks**: custom hooks named `use*`, call Convex hooks inside
- **Async**: use async/await, wrap in try/catch at call sites

## Protected Files (DO NOT MODIFY)

- `*.proto` files
- `.env*` files
- `.claude/settings.json`

## Protected Values (DO NOT CHANGE)

- `apps/mobile/package.json` → `"main": "expo-router/entry"` — this is required for Expo Router to work. Never change the `main` field to a custom entry point.

## Environment Variables

### Mobile (.env)
`EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`

### Backend (.env)
`CONVEX_DEPLOYMENT`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `COST_ALERT_THRESHOLD`

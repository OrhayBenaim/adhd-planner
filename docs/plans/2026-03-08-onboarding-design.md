# Onboarding Flow Design

**Goal:** Build a 6-step onboarding shown once after first launch, collecting user profile data to personalize AI difficulty scoring. Steps 1-4 mandatory, steps 5-6 skippable.

**Architecture:** Expo Router stack group `(onboarding)` with 6 screens. React Context (`OnboardingProvider`) holds collected values across steps. Single Convex mutation at the end saves everything.

**Tech Stack:** Expo Router, React Context, Convex, expo-notifications, NativeWind, expo-linear-gradient, Reanimated, Better Auth

**Figma:** https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=13-767

---

## Screens

| # | Route | File | Collects | Required |
|---|-------|------|----------|----------|
| 1 | `welcome` | `welcome.tsx` | `name: string` | Yes |
| 2 | `work-time` | `work-time.tsx` | `bestWorkTimes: string[]` (multi-select list) | Yes (min 1) |
| 3 | `difficulties` | `difficulties.tsx` | `difficulties: string[]` (2-col chip grid) | Yes (min 1) |
| 4 | `strengths` | `strengths.tsx` | `strengths: string[]` (2-col chip grid) | Yes (min 1) |
| 5 | `notifications` | `notifications.tsx` | `notificationsEnabled: boolean` | No (skip available) |
| 6 | `sign-in` | `sign-in.tsx` | Google/Apple/Email auth | No (skip available) |

## Context

```ts
interface OnboardingState {
  name: string;
  bestWorkTimes: string[];
  difficulties: string[];
  strengths: string[];
  notificationsEnabled: boolean;
}
```

Context exposes `state`, `updateField(key, value)`, and `submitOnboarding()`.

## Flow

- `_layout.tsx`: Stack with `headerShown: false`, wraps children in `<OnboardingProvider>`
- Each screen: illustration area, title + emoji, input/selection area, progress bar (N/6), Back/Continue footer
- Continue button disabled (opacity 0.5) until step validation passes (name not empty, at least 1 selection)
- Back button hidden on step 1, visible on steps 2-6
- Step 5: "Enable Notifications" triggers `expo-notifications` OS permission dialog, "Skip for now" sets false. No back/continue footer — just the two action buttons.
- Step 6: "Link Account" → sub-view with sign-in options. "I'll do this later" skips. Platform-based provider display:
  - Android: Google + Email
  - iOS: Apple + Email
- On completion/skip of step 6: `submitOnboarding()` → Convex mutation saves preferences, navigate to home

## Entry Gate

Root `app/index.tsx` queries Convex `userPreferences.get()`:
- No record or `onboardingCompleted: false` → redirect to `/(onboarding)/welcome`
- `onboardingCompleted: true` → render home screen (existing behavior)

## Backend

### New Convex table

```ts
userPreferences: defineTable({
  userId: v.string(),
  name: v.string(),
  bestWorkTimes: v.array(v.string()),
  difficulties: v.array(v.string()),
  strengths: v.array(v.string()),
  notificationsEnabled: v.boolean(),
  onboardingCompleted: v.boolean(),
}).index("by_user", ["userId"])
```

### New mutations/queries

- `preferences.save(name, bestWorkTimes, difficulties, strengths, notificationsEnabled)` — inserts record with `onboardingCompleted: true`
- `preferences.get()` — returns preferences for current user (used by entry gate + AI scoring)

### AI scoring integration

Modify `scoreTaskDifficulty` in `ai.ts`:
1. Fetch user preferences via internal query `preferences.get()`
2. Append to system prompt:
   ```
   User context:
   - Finds these challenging: [difficulties]
   - Enjoys and is good at: [strengths]
   - Most productive during: [bestWorkTimes]

   Use this context to personalize the difficulty score. Tasks related to their
   challenges should score higher. Tasks aligned with their strengths should score lower.
   ```
3. AI uses this context to personalize the 0-100 difficulty score

### Auth changes

- Add Google provider to Better Auth config (platform: Android)
- Add Apple provider to Better Auth config (platform: iOS)
- Email provider (always available)
- Account linking upgrades anonymous user to authenticated user, preserving existing data

## Shared Components

- **`OnboardingLayout`** — common wrapper: gradient background, white card container, illustration slot, title, subtitle, content area, progress bar, footer buttons
- **`ChipGrid`** — 2-column selectable chip grid. Props: `items`, `selected`, `onToggle`, `accentColor`. Used by steps 3 & 4. Pink gradient for difficulties, blue gradient for strengths.
- **`ProgressBar`** — 6-segment indicator, filled segments use blue-to-purple gradient
- **`OnboardingButton`** — gradient Continue button with chevron, opacity states

## Option Lists

**Productive times (step 2):**
1. Early morning
2. Mid-morning
3. Afternoon
4. Evening
5. Night

**What feels hard? (step 3) — mix of traits and real-world activities:**
1. Starting tasks
2. Finishing projects
3. Keeping track of time
4. Staying focused
5. Making decisions
6. Cooking & meal prep
7. Cleaning & tidying
8. Paying bills
9. Grocery shopping
10. Exercising

**What do you enjoy? (step 4) — mix of traits and real-world activities:**
1. Creative work
2. Helping others
3. Learning new things
4. Problem solving
5. Quick small tasks
6. Cooking & meal prep
7. Exercising
8. Shopping
9. Social activities
10. Reading & research

## Visual Style

- Gradient background: `#ffc8dd` → `#ffafcc` → `#cdb4db` (top to bottom)
- White card container with rounded corners (48px), shadow
- Illustrations at top of each card (from Figma assets)
- Rounded inputs (24px radius), gradient chips on selection
- Pink gradient (`#ffc8dd` → `#ffafcc`) + pink border for difficulties (step 3)
- Blue gradient (`#bde0fe` → `#a2d2ff`) + blue border for strengths (step 4)
- Selected chips show small checkmark badge (pink circle for hard, blue circle for easy)
- Progress bar: 6 segments, filled = blue-to-purple gradient, unfilled = `#e5e7eb`
- Continue button: blue-to-purple gradient, white text, shadow, chevron right icon
- Back button: gray circle with chevron left icon

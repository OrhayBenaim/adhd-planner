# Mobile Frontend Design

**Date:** 2026-03-08
**Project:** ADHD Planner — `apps/mobile`

---

## Overview

Single-screen Expo app with bottom sheets for all interactions. The home screen persists throughout — mood slider, AI task picker, XP gamification bar, and task card are always visible. Everything else (add task, task list, settings) slides up as a bottom sheet.

---

## Screens

### Home screen (`app/index.tsx`)

The only navigated screen. Contains:

1. **Gamification bar** — trophy icon, Level N, current points, "Next level: X pts", animated XP progress bar
2. **Mood slider** — rainbow gradient track, thumb, label that cross-fades between mood text values
3. **AI button** — large gradient circle with sparkles icon. Tapping it finds the task from the list whose `difficulty` is closest to the current `moodLevel` and displays it in the task card below
4. **Task card** — shows "No task selected yet" (placeholder) or the AI-selected task (title, description, difficulty label, Complete + Later buttons)
5. **Bottom nav** — List | + (gradient) | Settings

### Bottom sheets

| Sheet | Trigger | Content |
|---|---|---|
| Add New Task | Tap + | Textarea, Mic button, Confirm button |
| Recording Audio | Tap Mic | Waveform animation (animated dots), Stop, Confirm |
| Select Day | After confirm task | Today / Tomorrow / End of Week / Custom |
| Custom Day | Tap Custom | Same options + date text input |
| Select Time | After day selected | By Noon / By Afternoon / By End of Day / Custom |
| Custom Time | Tap Custom | Same options + time text input |
| All Tasks | Tap List | Scrollable task list — each item has title, description, difficulty label, edit + delete |
| Settings | Tap Settings | Notifications / Focus Mode / Sound Effects / Smart Scheduling toggles |

---

## Data Model

```ts
Task {
  id: string
  title: string
  description?: string
  difficulty: number       // 0–100, stored as number, displayed as text
  dueDate?: string         // ISO date string
  dueTime?: string         // "noon" | "afternoon" | "end_of_day" | "HH:mm"
  completed: boolean
  createdAt: string
}

UserProgress {             // stored in AsyncStorage
  level: number            // starts at 1
  points: number           // current XP
  pointsToNextLevel: number  // starts at 50, scales per level
}

Settings {                 // stored in AsyncStorage
  notifications: boolean
  focusMode: boolean
  soundEffects: boolean
  smartScheduling: boolean
}
```

---

## Mood & Difficulty Scale (shared 0–100)

| Range | Mood label | Difficulty label |
|---|---|---|
| 0–20 | Exhausted | Very Easy |
| 21–40 | Low Energy | Easy |
| 41–60 | Focused | Medium |
| 61–80 | Motivated | Hard |
| 81–100 | Super Motivated | Very Hard |

---

## AI Button Logic

```
selectedTask = tasks
  .filter(t => !t.completed)
  .sort by |t.difficulty - moodLevel|
  [0]
```

Finds the incomplete task whose difficulty is closest to the current mood level.

---

## Gamification / Points System

Completing a task earns points based on difficulty:

```
pointsEarned = Math.round(difficulty / 10) + 1
// Very Easy (0–20)  → 1–3 pts
// Easy (21–40)      → 3–5 pts
// Medium (41–60)    → 5–7 pts
// Hard (61–80)      → 7–9 pts
// Very Hard (81–100)→ 9–11 pts
```

Level threshold progression: 50 → 100 → 175 → 275 → 400 (each level requires +50% more than the last).

When `points >= pointsToNextLevel`: level increments, points resets to overflow, next threshold scales up.

---

## Micro Animations

All animations use `react-native-reanimated` with shared spring configs from `src/animations/springs.ts`.

| Trigger | Animation |
|---|---|
| AI picks a task | Task card fades in + slides up (spring, 400ms) |
| Task dismissed (Later) | Card slides down + fades out |
| Tap Complete | Card scales to 0.95 → checkmark pops → card exits |
| XP awarded | "+N pts" text floats up and fades above the XP bar |
| XP bar fills | Bar width animates with spring (600ms, damping 20) |
| Level up | Bar fills to 100% → brief pause → resets → trophy icon scale burst |
| Task added | New item fades in + slides from right in All Tasks list |
| Task deleted | Item slides left + fades out |
| Mood slider moves | Label cross-fades between mood text values |
| Any gradient button press | Scale to 0.96 on press-in, spring back on release |
| Sparkles button (AI) | Rotation + scale pulse before result appears |
| Bottom sheet open/close | Spring slide-up via `@gorhom/bottom-sheet` |

---

## Auth

Anonymous by default — no login screen. Tasks are created without a userId. Account linking screen added later as a separate Expo Router route.

---

## Voice Recording

`expo-av` for microphone access and audio recording. The "Recording audio" state shows an animated waveform (row of pink dots that pulse in sequence).

---

## Dependencies

| Package | Purpose |
|---|---|
| `@gorhom/bottom-sheet` | Bottom sheet component |
| `react-native-reanimated` | Micro animations (already peer dep of NativeWind v4) |
| `react-native-gesture-handler` | Required by bottom-sheet |
| `expo-av` | Voice recording |
| `@react-native-async-storage/async-storage` | UserProgress + Settings persistence |
| `@tanstack/react-query` | Task CRUD via API |

---

## File Structure

```
apps/mobile/
  app/
    index.tsx              ← home screen
    _layout.tsx            ← QueryClientProvider + GestureHandlerRootView
  src/
    components/
      MoodSlider.tsx
      TaskCard.tsx           ← animated entrance / exit / complete
      XPBar.tsx              ← animated fill + level/points display
      PointsToast.tsx        ← floating "+N pts" animation
      BottomNav.tsx
      sheets/
        AddTaskSheet.tsx
        RecordingSheet.tsx
        SelectDaySheet.tsx
        SelectTimeSheet.tsx
        AllTasksSheet.tsx
        SettingsSheet.tsx
    hooks/
      useTasks.ts            ← TanStack Query CRUD hooks
      useUserProgress.ts     ← XP/level logic + AsyncStorage
      useSettings.ts         ← Settings + AsyncStorage
    lib/
      moodLabels.ts          ← 0-100 → mood + difficulty text
      points.ts              ← points calculation + level thresholds
      api.ts                 ← fetch wrapper
      queryClient.ts
    animations/
      springs.ts             ← shared spring/timing configs
```

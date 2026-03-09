# Tech Debt Analysis

**Date:** 2026-03-09
**React Doctor Score:** 93/100 (56 warnings across 28/50 files)

---

## 1. Dead State

### DEAD: `error` in useSpeechRecognition — always null, never set
**File:** `src/hooks/useSpeechRecognition.ts:58`
```ts
return { state, transcript, volume, start, stop, cancel, append, error: null };
```
- `error` is hardcoded to `null` — never set to any other value
- Consumer `RecordingSheet.tsx:128` checks `error === "permissions_denied"` — this is **dead code** since it can never be true
- The entire permission alert `useEffect` at `RecordingSheet.tsx:127-147` is unreachable
- **Fix:** Remove `error` from the hook return until STT is implemented; remove the dead `useEffect` in RecordingSheet

### DEAD: `append` function in useSpeechRecognition — never called
**File:** `src/hooks/useSpeechRecognition.ts:54-56`
```ts
const append = useCallback(async () => {
  setState("listening");
}, []);
```
- `append` is returned from the hook but **never called** by any consumer
- RecordingSheet destructures `start`, `stop`, `cancel` but not `append`
- Appears to be a planned "continue recording" feature never wired up
- **Fix:** Remove until STT is implemented

### DEAD: `onEdit` callback on AllTasksSheet — wired as no-op
**File:** `src/components/home/SheetManager.tsx:271`
```ts
<AllTasksSheet onEdit={() => {}} ... />
```
- `onEdit` prop is defined in `AllTasksSheet` interface (line 16) and invoked on task press (line 38)
- But the parent always passes `() => {}` — button press does nothing
- **Fix:** Either implement the edit flow or remove `onEdit` from the interface and the press handler

### WRITE-ONLY: `selectedDay` in SheetManager (multi-task flow)
**File:** `src/components/home/SheetManager.tsx:81`
```ts
const [selectedDay, setSelectedDay] = useState("");
```
- In the **multi-task flow** (line 149-150), `setSelectedDay(dateStr)` is called but `selectedDay` is never read — the date is applied directly to `pendingTasks` via `setPendingTasks`
- Only read in the single-task flow (line 188) where it's consumed by `createTask`
- After single-task creation (line 192), it's reset but never re-read before that
- **Fix:** Remove `selectedDay` state; pass `dateStr` directly through the flow via a ref or reducer

### WRITE-ONLY: `customDay` / `customTime` toggle state
**File:** `src/components/home/SheetManager.tsx:82-85`
```ts
const [customDay, setCustomDay] = useState("");
const [showCustomDay, setShowCustomDay] = useState(false);
const [customTime, setCustomTime] = useState("");
const [showCustomTime, setShowCustomTime] = useState(false);
```
- `showCustomDay` and `showCustomTime` are set in `handleDaySelected`/`handleTimeSelected` but are **only** passed as props to `SelectDaySheet`/`SelectTimeSheet`
- `customDay` and `customTime` values are passed as props but **never read back** in SheetManager — the custom input text isn't used when creating tasks
- The custom input flow appears incomplete — user types custom day/time but SheetManager never reads those values to create a task with them
- **Fix:** Either complete the custom date/time flow (read values back) or remove these states

### DEAD ANIMATION: `createScale` / `createStyle` in TaskSummarySheet
**File:** `src/components/sheets/TaskSummarySheet.tsx:85-88`
```ts
const createScale = useSharedValue(1);
const createStyle = useAnimatedStyle(() => ({
  transform: [{ scale: createScale.value }],
}));
```
- `createStyle` IS applied to `Animated.View` on line 161
- `createScale` IS animated via `onPressIn`/`onPressOut` on lines 164-168
- **Status:** VERIFIED LIVE — false alarm from initial analysis. This code works correctly.

---

## 2. Dead Code — Unused Functions & Exports

### Backend (apps/convex)

| File | Export | Notes |
|------|--------|-------|
| `convex/settings.ts:42-78` | `setSttSettings` mutation | Never called from mobile app. Only caller would be useSettings but it stores STT in AsyncStorage instead |
| `convex/ai.ts:195-204` | `getStaleScoringTasks` internalQuery | Never called by any function, cron, or scheduler. Orphaned cleanup query |
| `convex/validation.ts:7-8` | `MAX_STT_MODEL`, `MAX_STT_LOCALE` | Only used inside dead `setSttSettings` |

### Frontend (apps/mobile)

| File | Export | Notes |
|------|--------|-------|
| `src/hooks/usePreferences.ts:4` | `usePreferences()` | Defined but **never called**. Only `useNeedsOnboarding` and `useSavePreferences` from this file are used |
| `src/animations/springs.ts:3` | `SPRING_DEFAULT` | Never imported. Identical config to `SPRING_BOUNCY` (both: damping 20, stiffness 300) |
| `src/animations/springs.ts:13` | `SPRING_XP_BAR` | Never imported |
| `src/animations/springs.ts:18` | `TIMING_FAST` | Never imported |
| `src/animations/springs.ts:19` | `TIMING_NORMAL` | Never imported |
| `src/animations/springs.ts:20` | `TIMING_SLOW` | Never imported |

### Unused Types

| File | Type | Notes |
|------|------|-------|
| `src/lib/moodLabels.ts:1` | `MoodLabel` | Exported but never imported. Functions `getMoodLabel`/`getDifficultyLabel` are used, but their return types are never consumed externally |
| `src/lib/moodLabels.ts:8` | `DifficultyLabel` | Same as above |
| `src/hooks/useSpeechRecognition.ts:3` | `SpeechState` | Exported but never imported |
| `src/hooks/useTasks.ts:5` | `CreateTaskInput` | Exported but never imported. Task creation args are typed inline in HomeProvider |

### Unused Re-exports

| File | Export | Notes |
|------|--------|-------|
| `src/components/home/index.ts` | `HomeProvider` | Re-exported but imported directly from `HomeProvider.tsx` by consumers |
| `src/components/home/index.ts` | `useHome` | Same — barrel export unused |

---

## 3. useEffect Anti-Patterns

### HIGH: Missing error handling in async effect
**File:** `src/hooks/useSettings.ts:35-48`
```ts
useEffect(() => {
  Promise.all([
    AsyncStorage.getItem(LOCAL_KEY),
    Notifications.getPermissionsAsync(),
  ]).then(([raw, { status }]) => { ... });
}, []);
```
- No `.catch()` — silent failure if AsyncStorage or Notifications throws
- No unmount cleanup — could set state on unmounted component
- **Fix:** Add `.catch()` handler and `let isMounted = true` guard

### MEDIUM: Unnecessary ref sync via useEffect
**File:** `src/components/sheets/RecordingSheet.tsx:39-41`
```ts
useEffect(() => { volumeRef.current = volume; }, [volume]);
```
- Ref update can be done directly in render body
- **Fix:** `volumeRef.current = volume;` inline (no effect needed)

### MEDIUM: Dead permission alert effect (unreachable)
**File:** `src/components/sheets/RecordingSheet.tsx:127-147`
```ts
useEffect(() => {
  if (error === "permissions_denied") { Alert.alert(...); }
}, [error]);
```
- `error` is always `null` (see Dead State section) — this effect never fires
- **Fix:** Remove entirely until STT is implemented with real error handling

### MEDIUM: Unstable dependency in registration effect
**File:** `src/components/home/SheetManager.tsx:54-62`
- `registerSheet` in dependency array but it's already `useCallback([], [])` in HomeProvider — dependency is stable but misleading
- **Fix:** Use `// eslint-disable-next-line` or verify with lint rule

---

## 4. Excessive useState (>3 per component)

### SheetManager.tsx — 8 useState calls
| State | Type | Status |
|-------|------|--------|
| `pendingTaskTitle` | string | Live (single-task flow) |
| `selectedDay` | string | Partially dead (see Dead State section) |
| `customDay` | string | Write-only (see Dead State section) |
| `showCustomDay` | boolean | Passed as prop, but custom flow incomplete |
| `customTime` | string | Write-only (see Dead State section) |
| `showCustomTime` | boolean | Passed as prop, but custom flow incomplete |
| `pendingTasks` | PendingTask[] | Live (multi-task flow) |
| `editingTaskId` | string \| null | Live (edit flow) |

**Fix:** Consolidate into `useReducer` and remove dead states:
```ts
type SheetFlowState = {
  mode: "idle" | "single" | "multi";
  taskTitle: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
};
```

### sign-in.tsx (SignInStep) — 5 useState calls, 386 lines
- Flagged by react-doctor as giant component + excessive state
- **Fix:** Split into sub-components, group auth state into reducer

---

## 5. Components with Too Much Logic

### SheetManager.tsx (284 lines) — Mixed Concerns
Responsibilities that should be separated:
1. Sheet ref management + registration (lines 44-62)
2. Sheet chaining navigation (lines 64-77)
3. Single-task flow state + logic (lines 79-85, 125-129)
4. Multi-task flow state + logic (lines 87-89, 92-123)
5. Day/time selection handlers (lines 131-196)
6. Task creation mutations (lines 207-220)

**Refactor plan:**
1. Extract `useSheetFlow()` — manages form state with `useReducer`
2. Extract `useSheetNavigation()` — manages refs and chaining
3. SheetManager becomes a thin wiring layer

### sign-in.tsx (386 lines) — Giant Component
**Refactor plan:** Extract `<SocialAuthButtons />`, `<AnonymousAuthButton />`, `<TermsModal />`

### RecordingSheet.tsx (305 lines)
**Refactor plan:** Extract `ScrollingWaveform` (93 lines) to own file

---

## 6. Legacy APIs & Deprecated Packages

### @expo/vector-icons — 16 files
Deprecated. Migrate to `expo-symbols` or `expo-image`.

**Files:** `_layout.tsx`, `notifications.tsx`, `sign-in.tsx`, `XPBar.tsx`, `BottomNav.tsx`, `TaskCard.tsx`, `ChipGrid.tsx`, `OnboardingLayout.tsx`, `MainContent.tsx`, `RecordingSheet.tsx`, `AddTaskSheet.tsx`, `AllTasksSheet.tsx`, `SelectDaySheet.tsx`, `SelectTimeSheet.tsx`, `TaskSummarySheet.tsx`, `SettingsSheet.tsx`

### Legacy Shadow Styles — 20 occurrences across 9 files
Uses `shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation` instead of `boxShadow`.

**Files:** `notifications.tsx` (2), `sign-in.tsx` (6), `XPBar.tsx` (1), `MoodSlider.tsx` (2), `BottomNav.tsx` (2), `TaskCard.tsx` (2), `MainContent.tsx` (1), `RecordingSheet.tsx` (2), `AddTaskSheet.tsx` (2)

**Fix:** Replace with `boxShadow` for cross-platform New Architecture support

---

## 7. Hardcoded Values & Duplication

### Hardcoded color palette — 50 occurrences across 23 files
Colors like `#a2d2ff`, `#cdb4db`, `#ffc8dd`, `#ffafcc` are repeated everywhere without a shared constants file.
- **Fix:** Extract to `src/constants/colors.ts` for single-source-of-truth and easy theming

### Hardcoded rate limit magic numbers
**File:** `convex/ai.ts:75-81`
```ts
const oneMinuteAgo = Date.now() - 60_000;
// ...
if (recentCount >= 10) {
```
- `60_000` and `10` should be named constants (e.g., `RATE_LIMIT_WINDOW_MS`, `MAX_SCORES_PER_WINDOW`)

### TODO comment indicating known incomplete work
**File:** `src/hooks/useSpeechRecognition.ts:18`
```ts
// TODO: Replace with a working STT library.
```

---

## 8. Other Issues

### Accessibility
- `app/(onboarding)/welcome.tsx:42` — `autoFocus` causes usability issues for screen reader users

### Array Index as Key
- `src/components/onboarding/ProgressBar.tsx:16,23` — uses index `i` as key (causes bugs on reorder)

### Incomplete Features
- **Custom day/time input:** `SheetManager` tracks `customDay`/`customTime` state and renders custom inputs in SelectDay/SelectTimeSheet, but never reads the custom values back to create tasks
- **STT hook:** `useSpeechRecognition` is fully stubbed — transcript always empty, error always null, volume is simulated

---

## Priority Summary

| # | Issue | Category | Effort | Impact |
|---|-------|----------|--------|--------|
| P0 | SheetManager: remove dead state + useReducer refactor | Dead State / Architecture | Medium | High — eliminates 3-4 dead states, reduces 8 useState to 1 useReducer |
| P0 | sign-in.tsx: split giant component (386 lines, 5 useState) | Architecture | Medium | High — maintainability |
| P1 | Remove dead `error` flow (useSpeechRecognition + RecordingSheet) | Dead Code | Low | Medium — removes unreachable code path |
| P1 | Remove unused exports: `usePreferences`, 5 animation constants | Dead Code | Low | Low — reduces bundle, cleans API surface |
| P1 | Remove dead backend: `setSttSettings`, `getStaleScoringTasks` | Dead Code | Low | Low — reduces Convex function count |
| P1 | Fix or remove incomplete custom day/time flow | Dead State | Medium | Medium — either complete the feature or remove confusing state |
| P1 | Legacy shadow styles -> boxShadow (20 occurrences) | Deprecation | Low | Medium — New Architecture compat |
| P1 | @expo/vector-icons -> expo-symbols (16 files) | Deprecation | Medium | Medium — package no longer maintained |
| P1 | Extract hardcoded color palette to constants (50 occurrences, 23 files) | Maintainability | Low | Medium — enables theming, single source of truth |
| P2 | useSettings.ts: add error handling to async effect | Reliability | Low | Medium — prevents silent failures |
| P2 | Remove unused types: `MoodLabel`, `DifficultyLabel`, `SpeechState`, `CreateTaskInput` | Dead Code | Low | Low |
| P2 | Remove `onEdit` no-op callback from AllTasksSheet | Dead Code | Low | Low — or implement for real |
| P2 | Remove dead `append` function from useSpeechRecognition | Dead Code | Low | Low |
| P2 | RecordingSheet: extract ScrollingWaveform to own file | Architecture | Low | Low |
| P2 | Remove/merge barrel export `src/components/home/index.ts` | Dead Code | Low | Low |
| P2 | Extract rate limit magic numbers to named constants | Maintainability | Low | Low |
| P3 | ProgressBar: replace array index keys | Correctness | Low | Low |
| P3 | welcome.tsx: remove autoFocus for a11y | Accessibility | Low | Low |

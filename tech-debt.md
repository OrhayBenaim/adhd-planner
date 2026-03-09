# Tech Debt

## Critical (Large files, too many concerns)

### `apps/mobile/src/components/home/SheetManager.tsx` — 285 lines
- **8 useState hooks** managing complex multi-step form flow
- 4 large callbacks (30+ lines each): `handleRecordingStop`, `handleDaySelected`, `handleTimeSelected`, `handleEditDateTime`
- Manages both single-task AND multi-task flows in one component
- **Fix:** Extract `useTaskFormState`, `useSingleTaskFlow`, `useMultiTaskFlow` hooks

### `apps/mobile/src/components/sheets/RecordingSheet.tsx` — 306 lines
- Inline `ScrollingWaveform` subcomponent (60 lines) should be its own file
- Permission error handling mixed with recording state
- **Fix:** Extract `ScrollingWaveform` to `components/ScrollingWaveform.tsx`, extract permission logic to `useMicrophonePermission` hook

### `apps/mobile/src/components/home/HomeProvider.tsx` — 145 lines
- 3 useState + 7 useCallback managing unrelated concerns (sheets, tasks, toast, settings)
- **Fix:** Extract `useToast`, `useSheetNavigation`, keep provider thin

### `apps/convex/convex/ai.ts` — 166 lines
- `scoreTaskDifficulty` is 112 lines — builds prompt, calls API, parses response, handles errors, writes to DB all in one function
- **Fix:** Extract `buildSystemPrompt()`, `parseAiResponse()`, `validateScore()`

---

## High (Long functions, mixed logic)

### `apps/mobile/src/components/home/MainContent.tsx` — 169 lines
- `handleAIPick` callback is 28 lines mixing filtering, sorting, and animation sequencing
- **Fix:** Extract AI pick algorithm to `lib/pickNextTask.ts`, animation to `useAIButtonAnimation` hook

### `apps/mobile/src/hooks/useSettings.ts` — 106 lines
- `updateSetting` is 44 lines with nested if/else chain for each setting type
- **Fix:** Split into per-setting handlers or a switch/map pattern

### `apps/mobile/src/lib/convexClient.ts` — 63 lines
- `useConvexAuth` is 50 lines handling both AppState session refresh AND token fetching
- **Fix:** Extract `useSessionRefresh` hook

### `apps/convex/convex/tasks.ts` — 112 lines
- `completeTask` is 40 lines mixing points calculation, level-up logic, and DB writes
- **Fix:** Extract `calculatePointsEarned()`, `calculateLevelUp()` to utility

### `apps/convex/convex/migration.ts` — 75 lines
- `migrateUserData` repeats identical query-check-delete/patch pattern 4 times
- **Fix:** Extract `migrateTableRecords(ctx, table, oldUserId, newUserId)` helper

---

## Medium (Could be cleaner)

### `apps/mobile/src/components/sheets/TaskSummarySheet.tsx` — 184 lines
- Inline `TaskCard` helper is 54 lines — should be its own file

### `apps/mobile/src/components/MoodSlider.tsx` — 122 lines
- Gesture logic, animation state, and layout in one component
- **Fix:** Extract gesture handling to `useSliderGesture` hook

### `apps/mobile/src/components/TaskCard.tsx` — 92 lines
- Animation setup (scale on press) repeated — same pattern in AddTaskSheet, RecordingSheet, TaskSummarySheet
- **Fix:** Create `usePressScale` hook reusable across all pressable buttons

### `apps/mobile/src/lib/taskSplitter.ts` — 127 lines
- `splitByConjunctions` is 38 lines with complex regex — acceptable for algorithm code but could use inline comments

### `apps/convex/convex/preferences.ts` — 109 lines
- Repeated `db.query("userPreferences").withIndex("by_user", ...)` pattern (3 times)
- Same pattern in `settings.ts` (2 times)
- **Fix:** Extract `getUserPreferences(ctx, userId)` and `getUserSettings(ctx, userId)` helpers

---

## Low (Nice to have)

### Magic numbers without constants
- `tasks.ts`: `50` (initial XP threshold), `1.5` (level multiplier), `Math.round(difficulty / 10) + 1` (points formula)
- `MoodSlider.tsx`: hardcoded color values and ranges
- **Fix:** Move to named constants

### Duplicated animation pattern
- `useSharedValue` + `withSpring(0.92)` on press / `withSpring(1)` on release appears in 5+ components
- **Fix:** `usePressScale()` hook

### `useSpeechRecognition.ts` — stubbed
- Currently a fake implementation with no real STT
- Needs replacement with a working speech recognition library

---

## useEffect audit

useEffect is often an anti-pattern — many can be replaced with derived state, event handlers, or specialized hooks.

### Replaceable

| File | Line | Deps | What it does | Replace with |
|------|------|------|-------------|-------------|
| `RecordingSheet.tsx` | 39 | `[volume]` | Syncs `volumeRef.current = volume` so interval reads latest value | Restructure interval to not need a ref — pass volume directly or use `useCallback` |
| `XPBar.tsx` | 23 | `[percent]` | Animates shared value when percent changes | `useAnimatedReaction` (Reanimated) — purpose-built for syncing animated values to state |
| `PointsToast.tsx` | 21 | `[visible]` | Triggers fade-in/hold/fade-out sequence | `useAnimatedReaction`. **Also has a bug:** `onDone` is called inside but missing from deps — stale closure |
| `useSettings.ts` | 35 | `[]` | Loads AsyncStorage + checks notification perms on mount | Lazy `useState` initializer for sync parts; extract async load into a `useAsync` pattern or load before render |

### Acceptable but watch

| File | Line | Deps | What it does | Notes |
|------|------|------|-------------|-------|
| `useSpeechRecognition.ts` | 26 | `[state]` | Starts/stops volume animation interval based on state | Fine — lifecycle-driven timer. Clean up on unmount is correct |
| `convexClient.ts` | 19 | `[]` | Subscribes to AppState changes for session refresh | Fine — external subscription with proper cleanup |
| `RecordingSheet.tsx` | 51 | `[]` | Starts waveform interval on mount | Fine — animation timer with cleanup |
| `RecordingSheet.tsx` | 127 | `[error]` | Shows Alert on permission denied | Could move to event handler in `start()` instead of reacting to error state |
| `SheetManager.tsx` | 54 | `[registerSheet]` | Registers all sheet refs with provider | Could replace with a declarative pattern — pass refs via context or a registry object instead of imperative registration |

### Bug found

**`PointsToast.tsx:21`** — `onDone` is used inside the effect but not in the dependency array `[visible]`. This causes a stale closure: if `onDone` changes between renders, the old callback fires. Fix: add `onDone` to deps, or use a ref for the callback.

---

## Patterns to adopt

| Pattern | Where to apply |
|---------|---------------|
| Extract hook when 3+ useState | SheetManager, HomeProvider |
| Extract function when >15 lines | ai.ts, tasks.ts, useSettings.ts |
| Extract component when >100 lines | RecordingSheet, MainContent |
| Shared DB query helpers | preferences.ts, settings.ts, migration.ts |
| Reusable animation hooks | Press scale, slide gesture, toast animation |

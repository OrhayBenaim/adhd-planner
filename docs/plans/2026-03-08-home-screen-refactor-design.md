# Home Screen Refactor Design

## Problem

`apps/mobile/app/index.tsx` (315 lines) mixes session gating, sheet navigation, task creation flow, AI pick logic, animation, and layout into a single component. Additionally, Convex queries fire before auth is ready, causing `Unauthenticated` errors.

## Solution

Split into 5 files by concern. Gate rendering on session to fix the auth race.

## Architecture

```
index.tsx                          — session gate: loader or <HomeScreen>
src/components/home/HomeScreen.tsx — wraps in <HomeProvider>, composes layout
src/components/home/HomeProvider.tsx — context: tasks, mood, progress, toast, selectedTask, sheet nav, actions
src/components/home/MainContent.tsx — scrollable area (header, XP bar, mood slider, AI button, task card, bottom nav)
src/components/home/SheetManager.tsx — all 6 bottom sheets + sheet refs + task creation flow state machine
```

## File Details

### `index.tsx` (~20 lines)
- Checks `authClient.useSession()` and `isPending`
- No session + not pending → triggers anonymous sign-in
- `isPending` or no session → full-screen ActivityIndicator
- Session exists → renders `<HomeScreen>`
- No Convex hooks mount until session is confirmed, fixing the Unauthenticated race

### `HomeScreen.tsx` (~15 lines)
- Wraps children in `<HomeProvider>`
- Renders `<MainContent />` and `<SheetManager />`
- Pure composition, no logic

### `HomeProvider.tsx` (~80 lines)
- Single React context exposing:
  - **Data**: `tasks`, `progress`, `settings`, `moodLevel`, `selectedTask`, `toast`
  - **Actions**: `setMoodLevel`, `setSelectedTask`, `completeTask`, `createTask`, `deleteTask`, `updateSetting`, `showToast`
  - **Sheet nav**: `openSheet`, `closeSheet` (sheet name enum)
- `openSheet`/`closeSheet` live here so any component (e.g. BottomNav) can trigger sheets from context

### `MainContent.tsx` (~90 lines)
- Consumes `HomeContext`
- Renders: header, XPBar + PointsToast, MoodSlider, AI pick button, TaskCard, BottomNav
- Owns AI pick animation (reanimated shared values are local — only this component uses them)
- AI pick logic: mood-based task selection + wiggle animation

### `SheetManager.tsx` (~80 lines)
- Consumes `HomeContext` for `openSheet`/`closeSheet` signals and task actions
- Owns all 6 BottomSheet refs
- Owns `nextSheetRef` queue logic and `onSheetClosed` handler
- Owns task creation flow state: `pendingTaskTitle`, `selectedDay`, `customDay`, `showCustomDay`, `customTime`, `showCustomTime`
- Handles the multi-step wizard: title → day → time → create

## convexClient.ts Simplification

The pre-fetch token logic added to fix the auth race can be simplified since the session gate prevents Convex queries from mounting before auth is ready. The hook just needs to provide `fetchAccessToken` for `ConvexProviderWithAuth`.

## Constraints

- No behavior changes — same UX, same sheets, same animations
- All new files in `apps/mobile/src/components/home/`
- Existing component files (TaskCard, MoodSlider, sheets, etc.) unchanged

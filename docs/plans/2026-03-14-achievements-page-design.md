# Achievements Page Design

**Date:** 2026-03-14
**Status:** Approved

## Summary

Move achievements from a bottom sheet to a full-screen Expo Router page. Add an achievements button in ProfileSheet (premium + signed-in only). Show completion percentage at the top of the page.

## Route

- New file: `app/achievements.tsx`
- Stack screen with header title "Achievements"
- Back button navigates to HomeScreen

## Page Layout (top to bottom)

1. **Completion summary** — "3/8 Achievements (37%)" simple text at top
2. **2-column grid** — same card layout as current sheet:
   - Unlocked: linear gradient background (`#a2d2ff` → `#cdb4db`, 45°), full opacity, white text
   - Locked: gray background (`#e5e7eb`), 50% opacity, gray text
   - Each card: Ionicons icon + name + description + unlock date (if unlocked)

## ProfileSheet Button

- New "Achievements" button in ProfileSheet
- Visible only when `isPremium && isSignedIn`
- Trophy icon (`trophy-outline`) + "Achievements" label
- On press: close profile sheet → `router.push('/achievements')`

## Removals

- `AchievementsSheet.tsx` — delete (replaced by new page)
- Sheet ref in `SheetManager.tsx` — remove achievements registration
- `"achievements"` from sheet type union in `HomeProvider.tsx`
- StreakBadge `onPress` achievements navigation — remove

## Unchanged

- Backend (`achievementDefs.ts`) — no changes
- Achievement unlock logic in `tasks.ts` — no changes
- Achievement types in `packages/types/` — no changes
- Card styling — reused from current sheet

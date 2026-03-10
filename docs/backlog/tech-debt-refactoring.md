# Tech Debt Refactoring

**Reference:** `/tech-debt.md`

## Critical Tech Debt

- [ ] **SheetManager.tsx** (285 lines) — extract 8 useState hooks into custom hooks
- [ ] **RecordingSheet.tsx** (306 lines) — extract inline ScrollingWaveform (~60 lines) to own component
- [ ] **ai.ts** (166 lines) — break up `scoreTaskDifficulty` (112 lines) into smaller functions
- [ ] **HomeProvider.tsx** (145 lines) — split 7 unrelated useCallback into focused hooks

## High Tech Debt

- [ ] **MainContent.tsx** (169 lines) — extract 28-line `handleAIPick` callback
- [ ] **useSettings.ts** (106 lines) — refactor 44-line `updateSetting` with nested if/else
- [ ] **tasks.ts** (112 lines) — separate concerns in 40-line `completeTask`
- [ ] **migration.ts** (75 lines) — DRY up repeated query-check-patch patterns

## Code Duplication

- [ ] Extract shared `db.query("userPreferences").withIndex("by_user", ...)` helper
- [ ] Extract shared press scale animation hook (used in 5+ components)

## Bugs

- [ ] **PointsToast.tsx:21** — `onDone` callback missing from useEffect dependency array (stale closure)

## Notes

- None of this blocks release
- Tackle critical items first when there's breathing room post-launch
- Consider doing refactors alongside feature work to reduce risk

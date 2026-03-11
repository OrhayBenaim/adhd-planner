# Preferences & Account Polish

## Summary

UI improvements to preferences and profile sheets, plus a bug fix for the account merge flow.

## Changes

### 1. Preferences Sheet — Compact Layout

- Reduce snap point from 85% to 50%
- Remove the Name tab (tab 0) — remaining tabs become: Times, Difficulties, Strengths
- BottomSheetScrollView handles overflow within the shorter sheet

### 2. Move Name to Profile Sheet

- Add editable name field in ProfileSheet (both anonymous and authenticated views)
- Same auto-save pattern used in preferences

### 3. Fix BottomNav Icons

- Preferences: `color-palette-outline` (was `person-outline`)
- Profile: `person-outline` (was `person-circle-outline`)

### 4. Fix Onboarding Redirect After Account Merge

**Root cause:** In `migration.ts`, when the new user already has a `userPreferences` record, the old record (containing `onboardingCompleted: true`) is deleted without merging critical flags into the new record.

**Fix:** During migration, when new user already has preferences, patch the new user's record with `onboardingCompleted: true` from the old record before deleting it. Preserve all critical flags during merge.

# Preferences Tab Design

## Overview

Add a 4th button to the existing BottomNav that opens a Preferences sheet, allowing users to edit the preferences they set during onboarding: name, best work times, difficulties, and strengths.

## BottomNav Layout

Current: `[Tasks] [+Add] [Settings]`
New: `[Tasks] [Preferences] [+Add] [Settings]`

- Preferences button uses `person-outline` icon (Ionicons)
- Same styling as existing nav buttons
- Center gradient Add button stays in position 3 (index 2 of 4)

## Preferences Sheet — Tabbed UI

- Bottom sheet at 85% snap point
- Header: "My Preferences"
- Segmented control with 4 tabs: Name | Times | Difficulties | Strengths
- Active tab filled with its onboarding color (pink/purple/pink/blue)
- Inactive tabs gray/neutral

### Tab Contents

- **Name**: Centered text input, pre-filled with current name
- **Times**: Toggle buttons for time slots (reuse onboarding work-time pattern)
- **Difficulties**: ChipGrid component (2-column, reuse from onboarding)
- **Strengths**: ChipGrid component (2-column, reuse from onboarding)

### Behavior

- Instant tab switching (no animation)
- Auto-save on tab switch or sheet close
- Pre-populated from current userPreferences

## Data Flow

- Read: Fetch `userPreferences` from Convex on sheet open
- Write: New `preferences.update` mutation patches individual fields without resetting `onboardingCompleted`
- Optimistic update, no loading spinner

## New Files

- `PreferencesSheet.tsx` — sheet with segmented control + 4 tab views
- `SegmentedControl.tsx` — reusable segmented control component

## Modified Files

- `BottomNav.tsx` — add 4th Preferences button
- `SheetManager.tsx` — register preferences sheet
- `HomeProvider.tsx` — add sheet registration
- `apps/convex/convex/preferences.ts` — add `update` mutation

## Reused Components

- `ChipGrid` from onboarding (difficulties/strengths)
- Toggle button pattern from onboarding work-time screen
- Options constants from `constants/onboarding.ts`

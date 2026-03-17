# Onboarding Confetti Celebration — Design

## Overview

Add a celebration effect (Lottie confetti + congratulatory message) when the user arrives at the home screen after completing the onboarding flow.

## Decisions

- **When**: On the home screen after arriving from onboarding (not during onboarding)
- **Effect**: Lottie confetti animation (full-screen) + "Let's gooo! Time to crush it!" text
- **Duration**: ~3 seconds, auto-dismiss (no tap required)
- **Approach**: Full-screen `<CelebrationOverlay />` component rendered conditionally on home screen
- **Library**: `lottie-react-native` (new dependency) + existing `react-native-reanimated` for text fade
- **Trigger**: `router.replace({ pathname: "/", params: { celebrate: "true" } })` from onboarding completion

## Component: CelebrationOverlay

- Location: `apps/mobile/src/components/CelebrationOverlay.tsx`
- Lottie confetti animation from `assets/animations/confetti.json` (user-provided file)
- Full-screen absolute overlay, transparent background
- Text centered with Reanimated fade-in/fade-out
- Plays once (no loop), calls `onComplete` callback after ~3 seconds
- Tracks `onboarding_celebration_viewed` PostHog event

## Trigger Mechanism

- `OnboardingProvider.tsx`: change `router.replace("/")` → `router.replace({ pathname: "/", params: { celebrate: "true" } })`
- `welcome.tsx`: same change for the already-completed redirect
- Home screen: read `celebrate` param via `useLocalSearchParams()`, render overlay if `"true"`
- Param is naturally discarded after navigation (no cleanup needed)

## File Changes

| File | Change |
|------|--------|
| `apps/mobile/package.json` | Add `lottie-react-native` |
| `apps/mobile/assets/animations/confetti.json` | Lottie file (user provides) |
| `apps/mobile/src/components/CelebrationOverlay.tsx` | New component |
| `apps/mobile/src/components/onboarding/OnboardingProvider.tsx` | Update `router.replace` call |
| `apps/mobile/app/(onboarding)/welcome.tsx` | Update `router.replace` call |
| `apps/mobile/app/index.tsx` (home screen) | Read param, render overlay |

No backend changes. No new routes. No new context providers.

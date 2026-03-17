# Onboarding Confetti Celebration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a Lottie confetti animation + congratulatory message on the home screen when the user finishes onboarding.

**Architecture:** A `<CelebrationOverlay />` component is rendered conditionally in `index.tsx` based on a `celebrate` route param passed from onboarding completion. The overlay plays a Lottie confetti animation once, shows "Let's gooo! Time to crush it!" with a Reanimated fade, auto-dismisses after ~3s, and tracks the event in PostHog.

**Tech Stack:** lottie-react-native, react-native-reanimated (existing), expo-router (existing), posthog-react-native (existing)

---

### Task 1: Install lottie-react-native

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install the dependency**

Run from `apps/mobile/`:
```bash
npx expo install lottie-react-native
```

**Step 2: Verify installation**

Run: `cat apps/mobile/package.json | grep lottie`
Expected: `"lottie-react-native": "..."` appears in dependencies

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/../../package-lock.json
git commit -m "chore: install lottie-react-native"
```

---

### Task 2: Add placeholder Lottie animation file

The user will provide their own confetti Lottie JSON file later. For now, create a minimal placeholder so the component can be built and tested.

**Files:**
- Create: `apps/mobile/assets/animations/confetti.json`

**Step 1: Create the animations directory and placeholder file**

Create `apps/mobile/assets/animations/confetti.json` with a minimal valid Lottie JSON:

```json
{
  "v": "5.5.7",
  "fr": 30,
  "ip": 0,
  "op": 90,
  "w": 400,
  "h": 400,
  "nm": "placeholder",
  "layers": []
}
```

This is a valid Lottie file with 3 seconds at 30fps (90 frames), empty layers. The user will replace this with their chosen confetti animation.

**Step 2: Commit**

```bash
git add apps/mobile/assets/animations/confetti.json
git commit -m "chore: add placeholder confetti Lottie animation"
```

---

### Task 3: Create CelebrationOverlay component

**Files:**
- Create: `apps/mobile/src/components/CelebrationOverlay.tsx`

**Step 1: Create the component**

```tsx
import { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { posthog } from "../lib/posthog";

interface CelebrationOverlayProps {
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 3000;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 500;
const VISIBLE_MS = TOTAL_DURATION_MS - FADE_IN_MS - FADE_OUT_MS;

export function CelebrationOverlay({ onComplete }: CelebrationOverlayProps) {
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    posthog.capture("onboarding_celebration_viewed");

    textOpacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_MS }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: FADE_OUT_MS }))
    );

    const timer = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      <LottieView
        source={require("../../assets/animations/confetti.json")}
        autoPlay
        loop={false}
        style={styles.lottie}
      />
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.title}>Let's gooo!</Text>
        <Text style={styles.subtitle}>Time to crush it!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0A0A0A",
  },
  subtitle: {
    fontSize: 18,
    color: "#6A7282",
    marginTop: 4,
  },
});
```

**Step 2: Run typecheck**

Run from repo root: `npm run typecheck`
Expected: No errors related to CelebrationOverlay

**Step 3: Commit**

```bash
git add apps/mobile/src/components/CelebrationOverlay.tsx
git commit -m "feat: add CelebrationOverlay component with Lottie confetti and Reanimated text"
```

---

### Task 4: Update onboarding completion to pass celebrate param

**Files:**
- Modify: `apps/mobile/src/components/onboarding/OnboardingProvider.tsx:100`
- Modify: `apps/mobile/app/(onboarding)/welcome.tsx:24`

**Step 1: Update OnboardingProvider.tsx**

In `submitOnboarding` (line 100), change:

```ts
router.replace("/");
```

to:

```ts
router.replace({ pathname: "/", params: { celebrate: "true" } });
```

**Step 2: Update welcome.tsx**

In the `useEffect` that redirects when onboarding is already done (line 24), this redirect should NOT show celebration (the user didn't just complete onboarding — they were already done). Leave this `router.replace("/")` unchanged.

**Step 3: Run typecheck**

Run from repo root: `npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/components/onboarding/OnboardingProvider.tsx
git commit -m "feat: pass celebrate param on onboarding completion"
```

---

### Task 5: Integrate CelebrationOverlay into the home screen

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Step 1: Update index.tsx**

Replace the full file content with:

```tsx
import { ActivityIndicator, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useEffect, useState } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useConvexAuth } from "convex/react";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home/HomeScreen";
import { CelebrationOverlay } from "../src/components/CelebrationOverlay";
import { posthog } from "../src/lib/posthog";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
  const needsOnboarding = useNeedsOnboarding();
  const { celebrate } = useLocalSearchParams<{ celebrate?: string }>();
  const [showCelebration, setShowCelebration] = useState(false);

  // Trigger celebration overlay when arriving from onboarding
  useEffect(() => {
    if (celebrate === "true") {
      setShowCelebration(true);
    }
  }, [celebrate]);

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e: unknown) => {
        Sentry.captureException(e);
      });
    }
  }, [session, isPending]);

  // Identify user in PostHog when session is available
  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id);
    }
  }, [session?.user?.id]);

  // Show loader until both better-auth session AND Convex auth are ready.
  if (isPending || isConvexLoading || !isAuthenticated || needsOnboarding === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  if (needsOnboarding === true) return <Redirect href={"/(onboarding)/welcome"} />;

  return (
    <View className="flex-1">
      <HomeScreen />
      {showCelebration && (
        <CelebrationOverlay onComplete={() => setShowCelebration(false)} />
      )}
    </View>
  );
}
```

**Step 2: Run typecheck**

Run from repo root: `npm run typecheck`
Expected: No errors

**Step 3: Run react-doctor**

Run from `apps/mobile/`: `npx -y react-doctor@latest .`
Expected: No new warnings (ignore icon-related ones)

**Step 4: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat: show confetti celebration on home screen after onboarding"
```

---

### Task 6: Manual QA

**Steps to verify:**

1. Clear app data or use a fresh anonymous session
2. Go through the full onboarding flow (welcome → work-time → difficulties → strengths → notifications → sign-in)
3. Complete onboarding (tap done/skip on sign-in screen)
4. Verify: confetti animation plays on home screen
5. Verify: "Let's gooo! / Time to crush it!" text fades in and out
6. Verify: overlay auto-dismisses after ~3 seconds
7. Verify: home screen is fully interactive after dismissal
8. Verify: navigating away and back to home does NOT re-trigger celebration
9. Verify: force-closing and reopening the app does NOT trigger celebration

**Note:** The placeholder Lottie file has empty layers, so no confetti will be visible until the user replaces it with their chosen animation. The text overlay and timing should still work for verification.

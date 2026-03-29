# Guided Tour Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a post-onboarding guided tour that walks new users through creating and completing their first task.

**Architecture:** A `GuidedTourProvider` context wraps `HomeScreen`, managing a linear 7-step state machine. Overlay components use `expo-blur` for frosted glass effect with a transparent cutout (via absolute positioning and pointer events). Tour state persists via a `hasCompletedTour` field on the `userPreferences` Convex table.

**Tech Stack:** React Native, expo-blur (new dep), react-native-reanimated, Convex, PostHog

**Design doc:** `docs/plans/2026-03-30-guided-tour-design.md`

---

### Task 1: Add `expo-blur` dependency

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install expo-blur**

```bash
cd apps/mobile && npx expo install expo-blur
```

**Step 2: Verify installation**

```bash
node -e "console.log(require('./package.json').dependencies['expo-blur'])"
```

Expected: A version string (e.g., `~14.1.3`)

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore: add expo-blur dependency for guided tour overlay"
```

---

### Task 2: Add `hasCompletedTour` to Convex schema + backend

**Files:**
- Modify: `apps/convex/convex/schema.ts:54-62`
- Modify: `apps/convex/convex/preferences.ts`

**Step 1: Add field to schema**

In `apps/convex/convex/schema.ts`, add `hasCompletedTour` to the `userPreferences` table definition (after the `onboardingCompleted` field, line 61):

```typescript
  userPreferences: defineTable({
    userId: v.string(),
    name: v.string(),
    bestWorkTimes: v.array(v.string()),
    difficulties: v.array(v.string()),
    strengths: v.array(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
    onboardingCompleted: v.boolean(),
    hasCompletedTour: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
```

**Step 2: Add `completeTour` mutation to preferences.ts**

Add this mutation at the end of `apps/convex/convex/preferences.ts`:

```typescript
export const completeTour = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existing) throw new ConvexError("No preferences found");
    await ctx.db.patch(existing._id, { hasCompletedTour: true });
  },
});
```

**Step 3: Run typecheck from repo root**

```bash
npm run typecheck
```

Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add apps/convex/convex/schema.ts apps/convex/convex/preferences.ts
git commit -m "feat: add hasCompletedTour field to userPreferences schema"
```

---

### Task 3: Create tour constants

**Files:**
- Create: `apps/mobile/src/components/tour/constants.ts`

**Step 1: Create the file**

```typescript
export type TourStepName =
  | "intro"
  | "createTask"
  | "pickDay"
  | "pickTime"
  | "moodMeter"
  | "aiPick"
  | "completeTask"
  | "celebration";

export type TourStepType = "action" | "button";

export interface TourStepDef {
  name: TourStepName;
  step: number;
  type: TourStepType;
  title: string;
  description: string;
  buttonLabel?: string;
  posthogEvent: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    name: "intro",
    step: 0,
    type: "button",
    title: "Let me show you around",
    description: "It'll take 30 seconds.",
    buttonLabel: "Let's go",
    posthogEvent: "guided_tour_shown",
  },
  {
    name: "createTask",
    step: 1,
    type: "action",
    title: "Add your first task",
    description: "What do you need to get done? Tap below to get started.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickDay",
    step: 2,
    type: "action",
    title: "When do you want to do this?",
    description: "Pick a day. We'll use this to plan your schedule and send reminders.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "pickTime",
    step: 3,
    type: "action",
    title: "What time works best?",
    description: "We'll match this to your focus times from onboarding.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "moodMeter",
    step: 4,
    type: "button",
    title: "How are you feeling?",
    description: "Slide to set your energy level. We'll suggest tasks that match how you're feeling right now.",
    buttonLabel: "Got it",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "aiPick",
    step: 5,
    type: "action",
    title: "Your personal task picker",
    description: "Tap here and we'll find the best task for your mood and energy.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "completeTask",
    step: 6,
    type: "action",
    title: "Nice! Now let's crush it",
    description: "When you're done, tap the task to mark it complete and earn XP.",
    posthogEvent: "guided_tour_step_viewed",
  },
  {
    name: "celebration",
    step: 7,
    type: "button",
    title: "You're ready!",
    description: "That's the core loop. Add tasks, match your mood, and get things done.",
    buttonLabel: "Let's start!",
    posthogEvent: "guided_tour_completed",
  },
];
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tour/constants.ts
git commit -m "feat: add guided tour step constants"
```

---

### Task 4: Create `GuidedTourProvider`

**Files:**
- Create: `apps/mobile/src/components/tour/GuidedTourProvider.tsx`

**Step 1: Create the provider**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { posthog } from "../../lib/posthog";
import { TOUR_STEPS, type TourStepName } from "./constants";

interface GuidedTourContextValue {
  isActive: boolean;
  currentStepName: TourStepName;
  currentStepIndex: number;
  advance: () => void;
  skip: () => void;
  isTourStep: (name: TourStepName) => boolean;
}

const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function useGuidedTour() {
  return useContext(GuidedTourContext);
}

interface Props {
  children: ReactNode;
  enabled: boolean;
}

export function GuidedTourProvider({ children, enabled }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(enabled);
  const completeTourMutation = useMutation(api.preferences.completeTour);

  const currentStep = TOUR_STEPS[stepIndex];

  const completeTour = useCallback(() => {
    setIsActive(false);
    completeTourMutation().catch(() => {});
  }, [completeTourMutation]);

  const advance = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      posthog.capture("guided_tour_completed");
      completeTour();
      return;
    }
    const nextStep = TOUR_STEPS[nextIndex];
    posthog.capture(nextStep.posthogEvent, {
      step: nextStep.step,
      stepName: nextStep.name,
    });
    setStepIndex(nextIndex);
  }, [stepIndex, completeTour]);

  const skip = useCallback(() => {
    posthog.capture("guided_tour_skipped");
    completeTour();
  }, [completeTour]);

  const isTourStep = useCallback(
    (name: TourStepName) => isActive && currentStep?.name === name,
    [isActive, currentStep]
  );

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <GuidedTourContext.Provider
      value={{
        isActive,
        currentStepName: currentStep.name,
        currentStepIndex: stepIndex,
        advance,
        skip,
        isTourStep,
      }}
    >
      {children}
    </GuidedTourContext.Provider>
  );
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add apps/mobile/src/components/tour/GuidedTourProvider.tsx
git commit -m "feat: add GuidedTourProvider context"
```

---

### Task 5: Create `TourTooltip` component

**Files:**
- Create: `apps/mobile/src/components/tour/TourTooltip.tsx`

**Step 1: Create the component**

This is the floating card shown on each step. It receives title, description, optional button label, and onPress.

```typescript
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface Props {
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  secondaryText?: string;
}

export function TourTooltip({ title, description, buttonLabel, onPress, secondaryText }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="bg-white rounded-3xl px-6 py-5 mx-6"
      style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)" }}
    >
      <Text className="text-xl font-semibold text-[#0A0A0A] mb-2">{title}</Text>
      <Text className="text-base text-[#6A7282] leading-6">{description}</Text>
      {secondaryText && (
        <Text className="text-sm text-[#99a1af] mt-3 leading-5">{secondaryText}</Text>
      )}
      {buttonLabel && onPress && (
        <Pressable onPress={onPress} className="mt-4">
          <LinearGradient
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
          >
            <Text className="text-white font-semibold text-base">{buttonLabel}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tour/TourTooltip.tsx
git commit -m "feat: add TourTooltip component"
```

---

### Task 6: Create `TourOverlay` component

**Files:**
- Create: `apps/mobile/src/components/tour/TourOverlay.tsx`

**Step 1: Create the component**

The frosted overlay with a cutout. Uses `expo-blur` BlurView as the backdrop. The cutout is achieved by rendering the blur in 4 rectangular sections around the target area (top, bottom, left, right), leaving the target exposed.

```typescript
import { View, Dimensions, type LayoutRectangle } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { TourTooltip } from "./TourTooltip";

const SCREEN = Dimensions.get("window");
const CUTOUT_PADDING = 12;

interface Props {
  targetLayout: LayoutRectangle | null;
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  tooltipPosition?: "above" | "below";
}

export function TourOverlay({
  targetLayout,
  title,
  description,
  buttonLabel,
  onPress,
  tooltipPosition = "below",
}: Props) {
  if (!targetLayout) return null;

  const cutout = {
    x: targetLayout.x - CUTOUT_PADDING,
    y: targetLayout.y - CUTOUT_PADDING,
    width: targetLayout.width + CUTOUT_PADDING * 2,
    height: targetLayout.height + CUTOUT_PADDING * 2,
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-[900]"
      pointerEvents="box-none"
    >
      {/* Top blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: cutout.y,
        }}
      />
      {/* Bottom blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y + cutout.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Left blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y,
          left: 0,
          width: cutout.x,
          height: cutout.height,
        }}
      />
      {/* Right blur section */}
      <BlurView
        intensity={40}
        tint="light"
        style={{
          position: "absolute",
          top: cutout.y,
          left: cutout.x + cutout.width,
          right: 0,
          height: cutout.height,
        }}
      />

      {/* Tooltip */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          ...(tooltipPosition === "above"
            ? { bottom: SCREEN.height - cutout.y + 16 }
            : { top: cutout.y + cutout.height + 16 }),
        }}
      >
        <TourTooltip
          title={title}
          description={description}
          buttonLabel={buttonLabel}
          onPress={onPress}
        />
      </View>
    </Animated.View>
  );
}
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add apps/mobile/src/components/tour/TourOverlay.tsx
git commit -m "feat: add TourOverlay with frosted blur cutout"
```

---

### Task 7: Create `TourIntroCard` component

**Files:**
- Create: `apps/mobile/src/components/tour/TourIntroCard.tsx`

**Step 1: Create the component**

The inline intro card shown in the content area (not an overlay). Has "Let's go" and "Skip" buttons.

```typescript
import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

interface Props {
  onStart: () => void;
  onSkip: () => void;
}

export function TourIntroCard({ onStart, onSkip }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="bg-white rounded-3xl px-6 py-6 mx-6"
      style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)" }}
    >
      <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2">
        Let me show you around
      </Text>
      <Text className="text-base text-[#6A7282] text-center mb-5">
        It'll take 30 seconds.
      </Text>
      <Pressable onPress={onStart}>
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
        >
          <Text className="text-white font-semibold text-base">Let's go</Text>
        </LinearGradient>
      </Pressable>
      <Pressable onPress={onSkip} className="mt-3 items-center py-2">
        <Text className="text-sm text-[#99a1af]">Skip</Text>
      </Pressable>
    </Animated.View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tour/TourIntroCard.tsx
git commit -m "feat: add TourIntroCard with start/skip buttons"
```

---

### Task 8: Create `TourCelebration` component

**Files:**
- Create: `apps/mobile/src/components/tour/TourCelebration.tsx`

**Step 1: Create the component**

Final overlay card with subtle pro mention. Full-screen frosted blur with centered card.

```typescript
import { View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn } from "react-native-reanimated";
import { TourTooltip } from "./TourTooltip";

interface Props {
  onFinish: () => void;
}

export function TourCelebration({ onFinish }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 z-[900] items-center justify-center"
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <TourTooltip
        title="You're ready!"
        description="That's the core loop. Add tasks, match your mood, and get things done."
        secondaryText="Pro members also get AI coaching, streak tracking, and personalized reminders."
        buttonLabel="Let's start!"
        onPress={onFinish}
      />
    </Animated.View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/tour/TourCelebration.tsx
git commit -m "feat: add TourCelebration final step component"
```

---

### Task 9: Update `CelebrationOverlay` to use user's name

**Files:**
- Modify: `apps/mobile/src/components/CelebrationOverlay.tsx`
- Modify: `apps/mobile/app/index.tsx`

**Step 1: Add `name` prop to CelebrationOverlay**

Update `CelebrationOverlay` to accept an optional `name` prop and change the message:

In `apps/mobile/src/components/CelebrationOverlay.tsx`:

Change the interface (line 13-15):
```typescript
interface CelebrationOverlayProps {
  onComplete: () => void;
  name?: string;
}
```

Change the component signature (line 22):
```typescript
export function CelebrationOverlay({ onComplete, name }: CelebrationOverlayProps) {
```

Change the text content (lines 72-75):
```typescript
      <Animated.View className="items-center" style={textStyle}>
        <Text className="text-[32px] font-bold text-[#0A0A0A]">
          {name ? `You're all set, ${name}!` : "You're all set!"}
        </Text>
      </Animated.View>
```

Remove the old subtitle line (`Time to crush it!`).

**Step 2: Pass `name` from index.tsx**

In `apps/mobile/app/index.tsx`, import `usePreferences` and pass the name:

Add import:
```typescript
import { usePreferences } from "../src/hooks/usePreferences";
```

Inside `IndexPage()`, add after the existing hooks:
```typescript
const preferences = usePreferences();
```

Update the CelebrationOverlay render (line 52):
```typescript
<CelebrationOverlay
  onComplete={() => setShowCelebration(false)}
  name={preferences?.name}
/>
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/components/CelebrationOverlay.tsx apps/mobile/app/index.tsx
git commit -m "feat: personalize celebration overlay with user's name"
```

---

### Task 10: Integrate `GuidedTourProvider` into HomeScreen

**Files:**
- Modify: `apps/mobile/src/components/home/HomeScreen.tsx`
- Modify: `apps/mobile/src/hooks/usePreferences.ts`

**Step 1: Add `useHasCompletedTour` hook**

In `apps/mobile/src/hooks/usePreferences.ts`, add:

```typescript
export function useHasCompletedTour() {
  const prefs = useQuery(api.preferences.get);
  return prefs?.hasCompletedTour ?? false;
}
```

**Step 2: Wrap HomeScreen content with GuidedTourProvider**

In `apps/mobile/src/components/home/HomeScreen.tsx`:

Add imports:
```typescript
import { GuidedTourProvider } from "../tour/GuidedTourProvider";
import { useHasCompletedTour } from "../../hooks/usePreferences";
```

Inside the component, add after `usePushToken()`:
```typescript
const hasCompletedTour = useHasCompletedTour();
```

Wrap the SafeAreaView children:
```typescript
return (
  <HomeProvider>
    <SheetFlowProvider>
      <GuidedTourProvider enabled={!hasCompletedTour}>
        <SafeAreaView className="flex-1 bg-[#f5f7fa]">
          <MainContent />
          <SheetManager />
        </SafeAreaView>
      </GuidedTourProvider>
    </SheetFlowProvider>
  </HomeProvider>
);
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/components/home/HomeScreen.tsx apps/mobile/src/hooks/usePreferences.ts
git commit -m "feat: integrate GuidedTourProvider into HomeScreen"
```

---

### Task 11: Add tour steps to `MainContent`

This is the largest task. It wires the tour into the home screen by:
1. Showing the intro card and step 1 CTA in the content area
2. Rendering overlays for the mood meter (step 4) and AI pick (step 5)
3. Rendering overlay for complete task (step 6)
4. Rendering the celebration overlay (step 7)

**Files:**
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Add tour imports and hook**

At the top of `MainContent.tsx`, add:

```typescript
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourIntroCard } from "../tour/TourIntroCard";
import { TourOverlay } from "../tour/TourOverlay";
import { TourCelebration } from "../tour/TourCelebration";
import { TOUR_STEPS } from "../tour/constants";
```

Inside the `MainContent` function, add after existing hooks:

```typescript
const tour = useGuidedTour();
```

**Step 2: Add refs for tour target elements**

Add refs for measurable elements (after existing state declarations):

```typescript
const moodSliderRef = useRef<View>(null);
const aiButtonRef = useRef<View>(null);
const taskCardRef = useRef<View>(null);
const [moodLayout, setMoodLayout] = useState<LayoutRectangle | null>(null);
const [aiButtonLayout, setAiButtonLayout] = useState<LayoutRectangle | null>(null);
const [taskCardLayout, setTaskCardLayout] = useState<LayoutRectangle | null>(null);
```

Import `LayoutRectangle` from `react-native` (add to the existing import).

**Step 3: Add measurement callbacks**

```typescript
const measureElement = useCallback(
  (ref: React.RefObject<View | null>, setter: (layout: LayoutRectangle) => void) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setter({ x, y, width, height });
    });
  },
  []
);
```

Add an effect to re-measure when tour step changes:

```typescript
useEffect(() => {
  if (!tour) return;
  if (tour.isTourStep("moodMeter")) {
    measureElement(moodSliderRef, setMoodLayout);
  } else if (tour.isTourStep("aiPick")) {
    measureElement(aiButtonRef, setAiButtonLayout);
  } else if (tour.isTourStep("completeTask")) {
    measureElement(taskCardRef, setTaskCardLayout);
  }
}, [tour?.currentStepIndex, measureElement]);
```

**Step 4: Attach refs to target elements**

Wrap the mood slider View (around line 190) with the ref:

Change:
```tsx
<View className="px-6 pt-2 pb-8">
```
To:
```tsx
<View ref={moodSliderRef} className="px-6 pt-2 pb-8">
```

Wrap the AI button container (around line 195) with the ref:

Change:
```tsx
<View className="items-center pb-6">
  <Animated.View style={aiAnimStyle}>
```
To:
```tsx
<View ref={aiButtonRef} className="items-center pb-6">
  <Animated.View style={aiAnimStyle}>
```

Wrap the task card container (around line 256) with the ref:

Change:
```tsx
<View className="px-6">
  <TaskCard
```
To:
```tsx
<View ref={taskCardRef} className="px-6">
  <TaskCard
```

**Step 5: Render tour intro and step 1 inline CTA**

In the JSX, before the `{/* Task card */}` section (around line 255), add the tour intro/step-1 area:

```tsx
{/* Tour: Intro card (step 0) */}
{tour?.isTourStep("intro") && (
  <View className="px-0 py-4">
    <TourIntroCard
      onStart={() => {
        posthog.capture("guided_tour_started");
        tour.advance();
      }}
      onSkip={tour.skip}
    />
  </View>
)}

{/* Tour: Create first task CTA (step 1) */}
{tour?.isTourStep("createTask") && (
  <View className="px-6 py-4">
    <Pressable
      onPress={() => {
        posthog.capture("guided_tour_step_viewed", { step: 1, stepName: "createTask" });
        flow.start("addTask");
        tour.advance();
      }}
    >
      <LinearGradient
        colors={["#a2d2ff", "#cdb4db"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
      >
        <Text className="text-white font-semibold text-lg">Add your first task</Text>
        <Text className="text-white/80 text-sm mt-1">What do you need to get done? Tap to get started.</Text>
      </LinearGradient>
    </Pressable>
  </View>
)}
```

**Step 6: Render overlays for steps 4, 5, 6, 7**

After the ScrollView closes and before the BottomNav (around line 265), add:

```tsx
{/* Tour overlays */}
{tour?.isTourStep("moodMeter") && (
  <TourOverlay
    targetLayout={moodLayout}
    title={TOUR_STEPS[4].title}
    description={TOUR_STEPS[4].description}
    buttonLabel={TOUR_STEPS[4].buttonLabel}
    onPress={tour.advance}
    tooltipPosition="below"
  />
)}
{tour?.isTourStep("aiPick") && (
  <TourOverlay
    targetLayout={aiButtonLayout}
    title={TOUR_STEPS[5].title}
    description={TOUR_STEPS[5].description}
    tooltipPosition="below"
  />
)}
{tour?.isTourStep("completeTask") && (
  <TourOverlay
    targetLayout={taskCardLayout}
    title={TOUR_STEPS[6].title}
    description={TOUR_STEPS[6].description}
    tooltipPosition="above"
  />
)}
{tour?.isTourStep("celebration") && (
  <TourCelebration onFinish={tour.advance} />
)}
```

**Step 7: Wire action-gated advances**

For the AI pick step (step 5), the tour advances when the user taps the AI pick button. Modify `handleAIPick` (around line 89):

At the start of `handleAIPick`, add:
```typescript
if (tour?.isTourStep("aiPick")) {
  // During tour, just select the first task (we know one was just created)
  const firstTask = tasks.find((t) => !t.completed);
  if (firstTask) {
    setSelectedTask(firstTask);
    tour.advance();
  }
  return;
}
```

For the complete task step (step 6), modify `handleComplete` (around line 138):

After `showToast(result?.earned ?? 0);`, add:
```typescript
if (tour?.isTourStep("completeTask")) {
  tour.advance();
}
```

**Step 8: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 9: Run react-doctor**

```bash
cd apps/mobile && npx -y react-doctor@latest .
```

Expected: PASS (ignore icon warnings)

**Step 10: Commit**

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: integrate guided tour steps into MainContent"
```

---

### Task 12: Add tour overlays to `SelectDaySheet` and `SelectTimeSheet`

**Files:**
- Modify: `apps/mobile/src/components/sheets/SelectDaySheet.tsx`
- Modify: `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`

**Step 1: Add tour overlay to SelectDaySheet**

In `apps/mobile/src/components/sheets/SelectDaySheet.tsx`:

Add imports:
```typescript
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS } from "../tour/constants";
```

Inside the component (after `const flow = useSheetFlow();`), add:
```typescript
const tour = useGuidedTour();
```

Inside the `BottomSheetView`, before the closing `</BottomSheetView>` tag, add:

```typescript
{tour?.isTourStep("pickDay") && (
  <View className="mt-4">
    <TourTooltip
      title={TOUR_STEPS[2].title}
      description={TOUR_STEPS[2].description}
    />
  </View>
)}
```

In the `handleSelect` function, after `flow.next();` (line 91), add:
```typescript
if (tour?.isTourStep("pickDay")) tour.advance();
```

Similarly in `handleCustomSubmit`, after `flow.next();` (line 99), add:
```typescript
if (tour?.isTourStep("pickDay")) tour.advance();
```

**Step 2: Add tour overlay to SelectTimeSheet**

Same pattern in `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`:

Add imports:
```typescript
import { useGuidedTour } from "../tour/GuidedTourProvider";
import { TourTooltip } from "../tour/TourTooltip";
import { TOUR_STEPS } from "../tour/constants";
```

Inside the component (after `const flow = useSheetFlow();`), add:
```typescript
const tour = useGuidedTour();
```

Inside `BottomSheetView`, before closing tag:
```typescript
{tour?.isTourStep("pickTime") && (
  <View className="mt-4">
    <TourTooltip
      title={TOUR_STEPS[3].title}
      description={TOUR_STEPS[3].description}
    />
  </View>
)}
```

In `handleSelect`, after `flow.next();` (line 67), add:
```typescript
if (tour?.isTourStep("pickTime")) tour.advance();
```

In `handleCustomSubmit`, after `flow.next();` (line 75), add:
```typescript
if (tour?.isTourStep("pickTime")) tour.advance();
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/SelectDaySheet.tsx apps/mobile/src/components/sheets/SelectTimeSheet.tsx
git commit -m "feat: add guided tour overlays to day/time selection sheets"
```

---

### Task 13: Wire tour step 4 (mood meter) advance after task creation

When the task creation flow completes (after selectTime in SheetFlowProvider), the tour needs to advance from step 3 (pickTime) to step 4 (moodMeter). This happens automatically because the tour advances in the sheet. But we need to make sure step 4 shows after the sheets close.

**Files:**
- Modify: `apps/mobile/src/components/home/SheetFlowProvider.tsx`

**Step 1: Add PostHog tour event for task creation**

In `apps/mobile/src/components/home/SheetFlowProvider.tsx`, in the `selectTime` case (around line 174-178), after the `createTask` call and before `syncDispatch({ type: "RESET" })`:

```typescript
posthog.capture("guided_tour_task_created");
```

This only fires during the normal single-task creation path. The tour will always go through this path since voice input creates a single task during the tour.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/SheetFlowProvider.tsx
git commit -m "feat: capture guided_tour_task_created event"
```

Wait. Actually, the PostHog event should only fire during the tour. Let me revise.

In `SheetFlowProvider.tsx`, the `next()` function doesn't have access to the tour context. Instead, we should fire this event from `MainContent.tsx` where we already have tour context. The existing `posthog.capture("Created item")` already fires for all task creations. We can add the tour-specific event in the tour advance logic.

**Revised Step 1:** No changes to SheetFlowProvider. Instead, in `MainContent.tsx`, add a `useEffect` that watches for the tour transitioning to the `moodMeter` step:

```typescript
useEffect(() => {
  if (tour?.isTourStep("moodMeter")) {
    posthog.capture("guided_tour_task_created");
  }
}, [tour?.currentStepIndex]);
```

This fires the event when the tour reaches step 4 (mood meter), which means the task was just created.

**Revised files:** This should be added to Task 11 step 6 area. If implementing separately:

**Step 2: Commit** (skip if folded into Task 11)

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: fire guided_tour_task_created event on mood meter step"
```

---

### Task 14: Add PostHog event for task completion during tour

**Files:**
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

This is already handled in Task 11 step 7 where `handleComplete` fires `tour.advance()`. Add the PostHog event there too.

In `handleComplete`, where we added the tour advance (Task 11 step 7):

```typescript
if (tour?.isTourStep("completeTask")) {
  posthog.capture("guided_tour_task_completed");
  tour.advance();
}
```

**Step 1: Commit** (if not already folded into Task 11)

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat: fire guided_tour_task_completed event"
```

---

### Task 15: Final typecheck, react-doctor, and manual test

**Step 1: Run typecheck from repo root**

```bash
npm run typecheck
```

Expected: PASS

**Step 2: Run react-doctor from mobile dir**

```bash
cd apps/mobile && npx -y react-doctor@latest .
```

Expected: PASS (ignore icon warnings). If warnings about too many state calls appear, refactor the tour state to use `useReducer`.

**Step 3: Manual test checklist**

Test on device/simulator:
1. Fresh account: onboarding completes, confetti shows personalized message, intro card appears
2. Tap "Skip" on intro card: tour ends, normal home screen shows
3. Tap "Let's go": tour starts, step 1 CTA appears
4. Tap CTA: AddTaskSheet opens, type a task
5. Select a day: tour tooltip shows on day sheet, selecting advances
6. Select a time: tour tooltip shows on time sheet, selecting advances
7. Back on home: mood meter overlay shows, "Got it" button advances
8. AI pick overlay shows, tapping the button selects the task and advances
9. Complete task overlay shows, completing the task advances
10. Celebration card shows with pro mention, "Let's start!" ends tour
11. Tour doesn't show again on subsequent app opens
12. Check PostHog for full funnel events

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete guided tour implementation"
```

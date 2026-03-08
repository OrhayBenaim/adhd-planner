# Onboarding Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 6-step onboarding flow that collects user preferences (name, productive times, challenges, strengths), optionally enables notifications and account linking, and feeds preferences into AI difficulty scoring.

**Architecture:** Expo Router route group `(onboarding)` with shared layout, React Context for cross-step state, Convex backend for persistence. Entry gate in `app/index.tsx` redirects to onboarding if preferences don't exist.

**Tech Stack:** Expo Router, React Context, Convex (schema + mutations/queries), NativeWind, expo-linear-gradient, Reanimated, Better Auth (Google/Apple/Email), expo-notifications

**Design Doc:** `docs/plans/2026-03-08-onboarding-design.md`

**Figma:** https://www.figma.com/design/uEKUhrvteSOfw9kRknd9I6/ADHD?node-id=13-767

---

## Task 1: Add `userPreferences` table to Convex schema

**Files:**
- Modify: `apps/convex/convex/schema.ts`

**Step 1: Add the table definition**

Add `userPreferences` table after the existing `userProgress` table:

```ts
userPreferences: defineTable({
  userId: v.string(),
  name: v.string(),
  bestWorkTimes: v.array(v.string()),
  difficulties: v.array(v.string()),
  strengths: v.array(v.string()),
  notificationsEnabled: v.boolean(),
  onboardingCompleted: v.boolean(),
}).index("by_user", ["userId"]),
```

**Step 2: Push schema**

Run: `cd apps/convex && npx convex dev` (let it sync schema, then Ctrl+C)
Expected: Schema pushed successfully, no errors.

**Step 3: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "feat(convex): add userPreferences table to schema"
```

---

## Task 2: Create preferences query and mutation

**Files:**
- Create: `apps/convex/convex/preferences.ts`

**Step 1: Write the module**

```ts
// apps/convex/convex/preferences.ts
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const getByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    bestWorkTimes: v.array(v.string()),
    difficulties: v.array(v.string()),
    strengths: v.array(v.string()),
    notificationsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        onboardingCompleted: true,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        ...args,
        onboardingCompleted: true,
      });
    }
  },
});
```

**Step 2: Verify it compiles**

Run: `cd apps/convex && npx convex dev` (let it sync, then Ctrl+C)
Expected: Functions deployed successfully.

**Step 3: Commit**

```bash
git add apps/convex/convex/preferences.ts
git commit -m "feat(convex): add preferences query and save mutation"
```

---

## Task 3: Enhance AI scoring with user preferences

**Files:**
- Modify: `apps/convex/convex/ai.ts`

**Step 1: Import internal preferences query**

At the top of the `scoreTaskDifficulty` handler (after the kill-switch check and API key check), add preference fetching:

```ts
// After the apiKey check, before the try block:
const prefs = await ctx.runQuery(internal.preferences.getByUserId, { userId });
```

**Step 2: Build personalized system prompt**

Replace the existing system message content string with:

```ts
let systemPrompt =
  "You are a task difficulty scorer for an ADHD planner app. " +
  "Given a task title, rate its difficulty from 0 to 100. " +
  "0 = trivially easy (e.g. drink water), 100 = extremely difficult (e.g. write a thesis). " +
  "Consider cognitive load, time required, and executive function demand. " +
  "Respond with ONLY the number, nothing else.";

if (prefs) {
  systemPrompt +=
    "\n\nUser context:" +
    `\n- Finds these challenging: ${prefs.difficulties.join(", ")}` +
    `\n- Enjoys and is good at: ${prefs.strengths.join(", ")}` +
    `\n- Most productive during: ${prefs.bestWorkTimes.join(", ")}` +
    "\n\nUse this context to personalize the difficulty score. " +
    "Tasks related to their challenges should score higher. " +
    "Tasks aligned with their strengths should score lower.";
}
```

Then use `systemPrompt` in the messages array instead of the hardcoded string.

**Step 3: Verify it compiles**

Run: `cd apps/convex && npx convex dev` (let it sync, then Ctrl+C)
Expected: Functions deployed successfully.

**Step 4: Commit**

```bash
git add apps/convex/convex/ai.ts
git commit -m "feat(convex): personalize AI scoring with user preferences"
```

---

## Task 4: Add `UserPreferences` to shared types

**Files:**
- Modify: `packages/types/src/index.ts`

**Step 1: Add the type**

Append after `UserProgress`:

```ts
export interface UserPreferences {
  _id: string;
  userId: string;
  name: string;
  bestWorkTimes: string[];
  difficulties: string[];
  strengths: string[];
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  _creationTime: number;
}
```

**Step 2: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add UserPreferences interface"
```

---

## Task 5: Create `usePreferences` hook

**Files:**
- Create: `apps/mobile/src/hooks/usePreferences.ts`

**Step 1: Write the hook**

```ts
// apps/mobile/src/hooks/usePreferences.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function usePreferences() {
  return useQuery(api.preferences.get);
}

export function useSavePreferences() {
  return useMutation(api.preferences.save);
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/hooks/usePreferences.ts
git commit -m "feat(mobile): add usePreferences hook"
```

---

## Task 6: Create onboarding option constants

**Files:**
- Create: `apps/mobile/src/constants/onboarding.ts`

**Step 1: Write the constants file**

This contains all the selectable options for each onboarding step. Extracted as constants for reuse and testability.

```ts
// apps/mobile/src/constants/onboarding.ts

export const PRODUCTIVE_TIMES = [
  { id: "early_morning", label: "Early morning" },
  { id: "mid_morning", label: "Mid-morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night" },
] as const;

export const DIFFICULTIES = [
  { id: "starting_tasks", label: "Starting tasks" },
  { id: "finishing_projects", label: "Finishing projects" },
  { id: "keeping_track_of_time", label: "Keeping track of time" },
  { id: "staying_focused", label: "Staying focused" },
  { id: "making_decisions", label: "Making decisions" },
  { id: "cooking_meal_prep", label: "Cooking & meal prep" },
  { id: "cleaning_tidying", label: "Cleaning & tidying" },
  { id: "paying_bills", label: "Paying bills" },
  { id: "grocery_shopping", label: "Grocery shopping" },
  { id: "exercising", label: "Exercising" },
] as const;

export const STRENGTHS = [
  { id: "creative_work", label: "Creative work" },
  { id: "helping_others", label: "Helping others" },
  { id: "learning_new_things", label: "Learning new things" },
  { id: "problem_solving", label: "Problem solving" },
  { id: "quick_small_tasks", label: "Quick small tasks" },
  { id: "cooking_meal_prep", label: "Cooking & meal prep" },
  { id: "exercising", label: "Exercising" },
  { id: "shopping", label: "Shopping" },
  { id: "social_activities", label: "Social activities" },
  { id: "reading_research", label: "Reading & research" },
] as const;

export const TOTAL_STEPS = 6;
```

**Step 2: Commit**

```bash
git add apps/mobile/src/constants/onboarding.ts
git commit -m "feat(mobile): add onboarding option constants"
```

---

## Task 7: Create `OnboardingProvider` context

**Files:**
- Create: `apps/mobile/src/components/onboarding/OnboardingProvider.tsx`

**Step 1: Write the context provider**

```tsx
// apps/mobile/src/components/onboarding/OnboardingProvider.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useSavePreferences } from "../../hooks/usePreferences";
import { router } from "expo-router";

interface OnboardingState {
  name: string;
  bestWorkTimes: string[];
  difficulties: string[];
  strengths: string[];
  notificationsEnabled: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  updateField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  toggleArrayItem: (key: "bestWorkTimes" | "difficulties" | "strengths", item: string) => void;
  submitOnboarding: () => Promise<void>;
  isSubmitting: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const savePreferences = useSavePreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    name: "",
    bestWorkTimes: [],
    difficulties: [],
    strengths: [],
    notificationsEnabled: false,
  });

  const updateField = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleArrayItem = useCallback(
    (key: "bestWorkTimes" | "difficulties" | "strengths", item: string) => {
      setState((prev) => {
        const arr = prev[key];
        const next = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const submitOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await savePreferences({
        name: state.name,
        bestWorkTimes: state.bestWorkTimes,
        difficulties: state.difficulties,
        strengths: state.strengths,
        notificationsEnabled: state.notificationsEnabled,
      });
      router.replace("/");
    } finally {
      setIsSubmitting(false);
    }
  }, [state, savePreferences]);

  return (
    <OnboardingContext.Provider
      value={{ state, updateField, toggleArrayItem, submitOnboarding, isSubmitting }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/onboarding/OnboardingProvider.tsx
git commit -m "feat(mobile): add OnboardingProvider context"
```

---

## Task 8: Create shared onboarding UI components

**Files:**
- Create: `apps/mobile/src/components/onboarding/ProgressBar.tsx`
- Create: `apps/mobile/src/components/onboarding/OnboardingLayout.tsx`
- Create: `apps/mobile/src/components/onboarding/ChipGrid.tsx`

**Step 1: Create `ProgressBar`**

```tsx
// apps/mobile/src/components/onboarding/ProgressBar.tsx
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TOTAL_STEPS } from "../../constants/onboarding";

interface Props {
  currentStep: number; // 1-based
}

export function ProgressBar({ currentStep }: Props) {
  return (
    <View className="flex-row gap-2 px-6 pt-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const filled = i < currentStep;
        return filled ? (
          <LinearGradient
            key={i}
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="flex-1 h-1 rounded-full"
          />
        ) : (
          <View key={i} className="flex-1 h-1 rounded-full bg-[#e5e7eb]" />
        );
      })}
    </View>
  );
}
```

**Step 2: Create `OnboardingLayout`**

This is the shared wrapper for all onboarding screens: gradient background, white card, progress bar, and footer navigation.

```tsx
// apps/mobile/src/components/onboarding/OnboardingLayout.tsx
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ProgressBar } from "./ProgressBar";

interface Props {
  step: number; // 1-based
  children: React.ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueEnabled: boolean;
  showFooter?: boolean; // default true, set false for notification/account steps
}

export function OnboardingLayout({
  step,
  children,
  onBack,
  onContinue,
  continueEnabled,
  showFooter = true,
}: Props) {
  return (
    <LinearGradient
      colors={["#ffc8dd", "#ffafcc", "#cdb4db"]}
      locations={[0, 0.5, 1]}
      className="flex-1"
    >
      <View className="flex-1 mx-4 my-5">
        <View className="flex-1 bg-white rounded-[48px] overflow-hidden shadow-2xl">
          {/* Progress bar */}
          <ProgressBar currentStep={step} />

          {/* Content area */}
          <View className="flex-1 px-6 pt-8">
            {children}
          </View>

          {/* Footer */}
          {showFooter && (
            <View className="border-t border-[#f3f4f6] px-6 py-6 flex-row items-center justify-between">
              {/* Back button */}
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  className="w-12 h-12 rounded-full bg-[#f3f4f6] items-center justify-center"
                >
                  <Ionicons name="chevron-back" size={24} color="#364153" />
                </Pressable>
              ) : (
                <View className="w-12 h-12 rounded-full bg-[#f3f4f6] items-center justify-center opacity-30">
                  <Ionicons name="chevron-back" size={24} color="#364153" />
                </View>
              )}

              {/* Continue button */}
              <LinearGradient
                colors={["#a2d2ff", "#cdb4db"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="flex-1 ml-4 h-14 rounded-3xl shadow-lg"
                style={{ opacity: continueEnabled ? 1 : 0.5 }}
              >
                <Pressable
                  onPress={onContinue}
                  disabled={!continueEnabled}
                  className="flex-1 flex-row items-center justify-center"
                >
                  <Text className="text-white font-semibold text-base mr-1">
                    Continue
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
              </LinearGradient>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}
```

**Step 3: Create `ChipGrid`**

2-column selectable chip grid used by steps 3 and 4.

```tsx
// apps/mobile/src/components/onboarding/ChipGrid.tsx
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface ChipItem {
  id: string;
  label: string;
}

interface Props {
  items: readonly ChipItem[];
  selected: string[];
  onToggle: (id: string) => void;
  variant: "difficulties" | "strengths";
}

const COLORS = {
  difficulties: {
    border: "#ffafcc",
    gradient: ["rgba(255,200,221,0.2)", "rgba(255,175,204,0.2)"] as [string, string],
    badge: "#ffafcc",
  },
  strengths: {
    border: "#a2d2ff",
    gradient: ["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"] as [string, string],
    badge: "#a2d2ff",
  },
};

export function ChipGrid({ items, selected, onToggle, variant }: Props) {
  const colors = COLORS[variant];

  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => {
        const isSelected = selected.includes(item.id);

        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle(item.id)}
            className="relative"
            style={{ width: "47%" }}
          >
            {isSelected ? (
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-[20px] px-4 py-3 min-h-[47px] justify-center"
                style={{ borderWidth: 1.5, borderColor: colors.border }}
              >
                <Text className="text-sm font-medium text-[#1e2939] text-center">
                  {item.label}
                </Text>
              </LinearGradient>
            ) : (
              <View
                className="rounded-[20px] px-4 py-3 min-h-[47px] justify-center"
                style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
              >
                <Text className="text-sm font-medium text-[#364153] text-center">
                  {item.label}
                </Text>
              </View>
            )}

            {/* Checkmark badge */}
            {isSelected && (
              <View
                className="absolute -top-2 right-[-4px] w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.badge }}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
```

**Step 4: Commit**

```bash
git add apps/mobile/src/components/onboarding/ProgressBar.tsx apps/mobile/src/components/onboarding/OnboardingLayout.tsx apps/mobile/src/components/onboarding/ChipGrid.tsx
git commit -m "feat(mobile): add shared onboarding UI components"
```

---

## Task 9: Create Step 1 — Welcome/Name screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/welcome.tsx`

**Step 1: Write the screen**

```tsx
// apps/mobile/app/(onboarding)/welcome.tsx
import { View, Text, TextInput } from "react-native";
import { Image } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

export default function WelcomeStep() {
  const { state, updateField } = useOnboarding();

  return (
    <OnboardingLayout
      step={1}
      onContinue={() => router.push("/(onboarding)/work-time")}
      continueEnabled={state.name.trim().length > 0}
    >
      <View className="items-center">
        {/* Illustration placeholder — replace with actual asset */}
        <View className="w-48 h-48 rounded-3xl bg-[#ffc8dd]/20 items-center justify-center mb-8">
          <Text className="text-6xl">👋</Text>
        </View>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Welcome! 👋
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10">
          Let's personalize your experience.{"\n"}What should we call you?
        </Text>

        <TextInput
          value={state.name}
          onChangeText={(text) => updateField("name", text)}
          placeholder="Enter your name"
          placeholderTextColor="#99a1af"
          className="w-full border border-[#e5e7eb] rounded-3xl px-4 py-4 text-base text-[#1e2939]"
          autoFocus
        />
      </View>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/welcome.tsx
git commit -m "feat(mobile): add onboarding step 1 — name input"
```

---

## Task 10: Create Step 2 — Productive Times screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/work-time.tsx`

**Step 1: Write the screen**

```tsx
// apps/mobile/app/(onboarding)/work-time.tsx
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { PRODUCTIVE_TIMES } from "../../src/constants/onboarding";

export default function WorkTimeStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={2}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/difficulties")}
      continueEnabled={state.bestWorkTimes.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-48 h-48 rounded-3xl bg-[#cdb4db]/20 items-center justify-center mb-8">
            <Text className="text-6xl">⏰</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            When do you work best? ⏰
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Help us schedule tasks when you're most productive
          </Text>

          <View className="w-full gap-3">
            {PRODUCTIVE_TIMES.map((time) => {
              const isSelected = state.bestWorkTimes.includes(time.id);
              return isSelected ? (
                <Pressable
                  key={time.id}
                  onPress={() => toggleArrayItem("bestWorkTimes", time.id)}
                >
                  <LinearGradient
                    colors={["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="rounded-3xl px-4 py-4"
                    style={{ borderWidth: 1.5, borderColor: "#a2d2ff" }}
                  >
                    <Text className="text-base font-medium text-[#1e2939]">
                      {time.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  key={time.id}
                  onPress={() => toggleArrayItem("bestWorkTimes", time.id)}
                  className="rounded-3xl px-4 py-4"
                  style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
                >
                  <Text className="text-base font-medium text-[#364153]">
                    {time.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/work-time.tsx
git commit -m "feat(mobile): add onboarding step 2 — productive times"
```

---

## Task 11: Create Step 3 — Difficulties screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/difficulties.tsx`

**Step 1: Write the screen**

```tsx
// apps/mobile/app/(onboarding)/difficulties.tsx
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { DIFFICULTIES } from "../../src/constants/onboarding";

export default function DifficultiesStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={3}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/strengths")}
      continueEnabled={state.difficulties.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-40 h-40 rounded-3xl bg-[#ffafcc]/20 items-center justify-center mb-6">
            <Text className="text-5xl">😓</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            What feels hard? 😓
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Select tasks you find difficult or annoying (we'll help!)
          </Text>

          <ChipGrid
            items={DIFFICULTIES}
            selected={state.difficulties}
            onToggle={(id) => toggleArrayItem("difficulties", id)}
            variant="difficulties"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/difficulties.tsx
git commit -m "feat(mobile): add onboarding step 3 — difficulties"
```

---

## Task 12: Create Step 4 — Strengths screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/strengths.tsx`

**Step 1: Write the screen**

```tsx
// apps/mobile/app/(onboarding)/strengths.tsx
import { View, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { ChipGrid } from "../../src/components/onboarding/ChipGrid";
import { STRENGTHS } from "../../src/constants/onboarding";

export default function StrengthsStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={4}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/notifications")}
      continueEnabled={state.strengths.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-40 h-40 rounded-3xl bg-[#a2d2ff]/20 items-center justify-center mb-6">
            <Text className="text-5xl">😊</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            What do you enjoy? 😊
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Select tasks that come naturally to you
          </Text>

          <ChipGrid
            items={STRENGTHS}
            selected={state.strengths}
            onToggle={(id) => toggleArrayItem("strengths", id)}
            variant="strengths"
          />
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/strengths.tsx
git commit -m "feat(mobile): add onboarding step 4 — strengths"
```

---

## Task 13: Create Step 5 — Notifications screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/notifications.tsx`

**Step 1: Write the screen**

This step has no back/continue footer. It shows "Enable Notifications" and "Skip for now" buttons.

```tsx
// apps/mobile/app/(onboarding)/notifications.tsx
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

export default function NotificationsStep() {
  const { updateField } = useOnboarding();

  const handleEnable = async () => {
    // TODO: Request expo-notifications permission here
    // const { status } = await Notifications.requestPermissionsAsync();
    // updateField("notificationsEnabled", status === "granted");
    updateField("notificationsEnabled", true);
    router.push("/(onboarding)/sign-in");
  };

  const handleSkip = () => {
    updateField("notificationsEnabled", false);
    router.push("/(onboarding)/sign-in");
  };

  return (
    <OnboardingLayout
      step={5}
      onContinue={() => {}} // unused, footer hidden
      continueEnabled={false}
      showFooter={false}
    >
      <View className="flex-1 items-center justify-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#ffc8dd]/20 items-center justify-center mb-4">
          <Text className="text-6xl">🔔</Text>
        </View>

        {/* Bell icon badge */}
        <LinearGradient
          colors={["#ffc8dd", "#ffafcc"]}
          className="w-20 h-20 rounded-full items-center justify-center shadow-lg -mt-12 mb-6"
        >
          <Ionicons name="notifications" size={40} color="#fff" />
        </LinearGradient>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Stay on track 🔔
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10 px-4">
          Enable notifications to get gentle reminders when it's time to tackle your tasks
        </Text>

        {/* Enable button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="w-full h-14 rounded-3xl shadow-lg mb-4"
        >
          <Pressable onPress={handleEnable} className="flex-1 items-center justify-center">
            <Text className="text-white font-semibold text-base">
              Enable Notifications
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Skip button */}
        <Pressable onPress={handleSkip}>
          <Text className="text-base font-medium text-[#6a7282]">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/notifications.tsx
git commit -m "feat(mobile): add onboarding step 5 — notifications"
```

---

## Task 14: Create Step 6 — Account Linking screen

**Files:**
- Create: `apps/mobile/app/(onboarding)/sign-in.tsx`

**Step 1: Write the screen**

Shows "Save your progress" with Link Account / Skip, then sign-in method options. Platform-based: Google on Android, Apple on iOS, Email always.

```tsx
// apps/mobile/app/(onboarding)/sign-in.tsx
import { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

type SubView = "main" | "options";

export default function SignInStep() {
  const { submitOnboarding, isSubmitting } = useOnboarding();
  const [subView, setSubView] = useState<SubView>("main");

  const handleSkip = async () => {
    await submitOnboarding();
  };

  const handleSignIn = async (provider: "google" | "apple" | "email") => {
    // TODO: Implement actual auth provider sign-in
    // For now, just complete onboarding
    console.log(`[onboarding] sign-in with ${provider}`);
    await submitOnboarding();
  };

  if (subView === "options") {
    return (
      <OnboardingLayout
        step={6}
        onContinue={() => {}}
        continueEnabled={false}
        showFooter={false}
      >
        <View className="flex-1">
          <View className="mb-8">
            <Text className="text-2xl font-bold text-[#1e2939] text-center mb-3">
              Choose your sign-in method
            </Text>
            <Text className="text-base text-[#4a5565] text-center">
              Select how you'd like to create your account
            </Text>
          </View>

          <View className="gap-3">
            {/* Google (Android only) */}
            {Platform.OS === "android" && (
              <Pressable
                onPress={() => handleSignIn("google")}
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
                <Text className="text-base font-medium text-[#364153]">
                  Sign in with Google
                </Text>
              </Pressable>
            )}

            {/* Apple (iOS only) */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => handleSignIn("apple")}
                className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
                <Text className="text-base font-medium text-[#364153]">
                  Sign in with Apple
                </Text>
              </Pressable>
            )}

            {/* Email (always) */}
            <Pressable
              onPress={() => handleSignIn("email")}
              className="flex-row items-center gap-3 px-4 py-4 rounded-3xl border border-[#e5e7eb] bg-white shadow-sm"
            >
              <Ionicons name="mail-outline" size={24} color="#6a7282" />
              <Text className="text-base font-medium text-[#364153]">
                Sign in with Email
              </Text>
            </Pressable>
          </View>

          <View className="items-center mt-6">
            <Text className="text-sm text-[#6a7282]">Don't have an account?</Text>
            <Pressable>
              <Text className="text-sm font-semibold text-[#a2d2ff] underline mt-1">
                Sign up here
              </Text>
            </Pressable>
          </View>

          {/* Back link */}
          <View className="flex-1 justify-end items-center pb-6">
            <Pressable
              onPress={() => setSubView("main")}
              className="h-14 items-center justify-center"
            >
              <Text className="text-base font-medium text-[#6a7282]">
                ← Back
              </Text>
            </Pressable>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Main view — "Save your progress"
  return (
    <OnboardingLayout
      step={6}
      onContinue={() => {}}
      continueEnabled={false}
      showFooter={false}
    >
      <View className="flex-1 items-center justify-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#bde0fe]/20 items-center justify-center mb-4">
          <Text className="text-6xl">☁️</Text>
        </View>

        {/* Cloud icon badge */}
        <LinearGradient
          colors={["#bde0fe", "#a2d2ff"]}
          className="w-20 h-20 rounded-full items-center justify-center shadow-lg -mt-12 mb-6"
        >
          <Ionicons name="cloud" size={40} color="#fff" />
        </LinearGradient>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Save your progress ☁️
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10 px-4">
          Link an account to sync your data across devices and never lose your progress
        </Text>

        {/* Link Account button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="w-full h-14 rounded-3xl shadow-lg mb-4"
        >
          <Pressable
            onPress={() => setSubView("options")}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              Link Account
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Skip button */}
        <Pressable onPress={handleSkip} disabled={isSubmitting}>
          <Text className="text-base font-medium text-[#6a7282]">
            {isSubmitting ? "Saving..." : "I'll do this later"}
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/sign-in.tsx
git commit -m "feat(mobile): add onboarding step 6 — account linking"
```

---

## Task 15: Create onboarding route layout

**Files:**
- Create: `apps/mobile/app/(onboarding)/_layout.tsx`

**Step 1: Write the layout**

```tsx
// apps/mobile/app/(onboarding)/_layout.tsx
import { Stack } from "expo-router";
import { OnboardingProvider } from "../../src/components/onboarding/OnboardingProvider";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </OnboardingProvider>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/_layout.tsx
git commit -m "feat(mobile): add onboarding route layout with provider"
```

---

## Task 16: Wire up the entry gate

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Step 1: Add onboarding gate**

Replace the current `index.tsx` with a version that checks onboarding status:

```tsx
// apps/mobile/app/index.tsx
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { authClient } from "../src/lib/authClient";
import { usePreferences } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const preferences = usePreferences();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e) =>
        console.error("[index] sign-in error:", e)
      );
    }
  }, [session, isPending]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (session && preferences !== undefined && !preferences?.onboardingCompleted) {
      router.replace("/(onboarding)/welcome");
    }
  }, [session, preferences]);

  // Show loader until session is ready and preferences are loaded
  if (isPending || !session || preferences === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  // If onboarding not done, show loader (redirect is happening)
  if (!preferences?.onboardingCompleted) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return <HomeScreen />;
}
```

**Step 2: Verify the app compiles**

Run: `cd apps/mobile && npx expo start` (verify no compilation errors, then Ctrl+C)

**Step 3: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat(mobile): add onboarding gate to entry point"
```

---

## Task 17: Test the full flow end-to-end

**Step 1: Start the Convex backend**

Run: `cd apps/convex && npx convex dev` (keep running in background)

**Step 2: Start the mobile app**

Run: `cd apps/mobile && npx expo start`

**Step 3: Manual test checklist**

- [ ] App loads → redirects to onboarding welcome screen
- [ ] Step 1: Can enter name, Continue disabled when empty, enabled when filled
- [ ] Step 2: Can multi-select productive times, Continue disabled until ≥1 selected
- [ ] Step 3: Can multi-select difficulties with pink chips + checkmarks, Continue disabled until ≥1
- [ ] Step 4: Can multi-select strengths with blue chips + checkmarks, Continue disabled until ≥1
- [ ] Step 5: "Enable Notifications" and "Skip for now" both advance to step 6
- [ ] Step 6: "I'll do this later" saves preferences and redirects to home
- [ ] Back navigation works on steps 2-6
- [ ] Progress bar fills correctly at each step
- [ ] After completion, refreshing app goes directly to home (no onboarding repeat)
- [ ] Create a task → check Convex dashboard → AI prompt includes user preferences

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(mobile): resolve issues found during onboarding e2e testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add `userPreferences` table | `schema.ts` |
| 2 | Create preferences query/mutation | `preferences.ts` (new) |
| 3 | Enhance AI scoring with preferences | `ai.ts` |
| 4 | Add `UserPreferences` type | `packages/types/src/index.ts` |
| 5 | Create `usePreferences` hook | `usePreferences.ts` (new) |
| 6 | Onboarding option constants | `onboarding.ts` (new) |
| 7 | OnboardingProvider context | `OnboardingProvider.tsx` (new) |
| 8 | Shared UI: ProgressBar, Layout, ChipGrid | 3 new files |
| 9 | Step 1 — Welcome/Name | `welcome.tsx` (new) |
| 10 | Step 2 — Productive Times | `work-time.tsx` (new) |
| 11 | Step 3 — Difficulties | `difficulties.tsx` (new) |
| 12 | Step 4 — Strengths | `strengths.tsx` (new) |
| 13 | Step 5 — Notifications | `notifications.tsx` (new) |
| 14 | Step 6 — Account Linking | `sign-in.tsx` (new) |
| 15 | Onboarding route layout | `_layout.tsx` (new) |
| 16 | Entry gate | `index.tsx` (modify) |
| 17 | End-to-end testing | Manual verification |

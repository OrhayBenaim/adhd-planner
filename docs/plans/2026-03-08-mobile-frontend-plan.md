# Mobile Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `apps/mobile` Expo app with full Figma fidelity — mood slider, AI task picker, XP gamification, animated task card, and all bottom sheets.

**Architecture:** Single Expo Router screen (`app/index.tsx`) with `@gorhom/bottom-sheet` for all interactions. `react-native-reanimated` drives all micro-animations. TanStack Query talks to `apps/api`; `AsyncStorage` persists XP progress and settings locally.

**Tech Stack:** Expo SDK 52, Expo Router, NativeWind v4, react-native-reanimated v3, @gorhom/bottom-sheet v5, TanStack Query v5, expo-av, AsyncStorage, TypeScript.

---

## Task 1: Scaffold Expo app + rename package

**Files:**
- Create: `apps/mobile/` (via CLI)
- Modify: `apps/mobile/package.json`

**Step 1: Create Expo app from `apps/` directory**

```bash
cd apps
npx create-expo-app@latest mobile --template blank-typescript
```
Expected: `apps/mobile/` created with Expo project files.

**Step 2: Update `apps/mobile/package.json` name and add types dep**

Open `apps/mobile/package.json`. Change `"name"` and add `@adhd-planner/types`:

```json
{
  "name": "@adhd-planner/mobile",
  "dependencies": {
    "@adhd-planner/types": "*",
    ...existing deps...
  }
}
```

**Step 3: Commit**

```bash
cd ..
git add apps/mobile/
git commit -m "feat: scaffold Expo mobile app"
```

---

## Task 2: Install dependencies

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install NativeWind + peers**

```bash
cd apps/mobile
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```

**Step 2: Install bottom sheet + gesture handler**

```bash
npx expo install @gorhom/bottom-sheet react-native-gesture-handler
```

**Step 3: Install remaining deps**

```bash
npx expo install expo-av @react-native-async-storage/async-storage
npm install @tanstack/react-query
```

**Step 4: Verify no install errors**

```bash
npx expo-doctor
```
Expected: no critical errors.

**Step 5: Commit**

```bash
cd ../..
git add apps/mobile/
git commit -m "feat: install mobile dependencies"
```

---

## Task 3: Configure NativeWind + Expo Router

**Files:**
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Modify: `apps/mobile/babel.config.js`
- Modify: `apps/mobile/metro.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx` (stub)

**Step 1: Create `apps/mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 2: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Update `apps/mobile/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 4: Create/update `apps/mobile/metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 5: Create `apps/mobile/app/_layout.tsx`**

```tsx
import "../global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { queryClient } from "../src/lib/queryClient";

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 6: Create stub `apps/mobile/app/index.tsx`**

```tsx
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#f5f7fa]">
      <Text className="text-xl font-medium text-[#0a0a0a]">ADHD Planner</Text>
    </View>
  );
}
```

**Step 7: Create `apps/mobile/src/lib/queryClient.ts`**

```bash
mkdir -p apps/mobile/src/lib
```

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});
```

**Step 8: Create `apps/mobile/src/lib/api.ts`**

```ts
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }
  const { data } = await res.json();
  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

**Step 9: Create `apps/mobile/.env.local`**

```bash
printf 'EXPO_PUBLIC_API_URL=http://localhost:3001\n' > apps/mobile/.env.local
```

**Step 10: Verify app starts**

```bash
cd apps/mobile && npm run dev
```
Expected: Expo QR code, no red errors. Stop with Ctrl+C.

**Step 11: Commit**

```bash
cd ../..
git add apps/mobile/
git commit -m "feat: configure NativeWind and Expo Router"
```

---

## Task 4: Utility functions — moodLabels + points + springs

**Files:**
- Create: `apps/mobile/src/lib/moodLabels.ts`
- Create: `apps/mobile/src/lib/points.ts`
- Create: `apps/mobile/src/animations/springs.ts`
- Create: `apps/mobile/src/lib/__tests__/moodLabels.test.ts`
- Create: `apps/mobile/src/lib/__tests__/points.test.ts`

**Step 1: Create `apps/mobile/src/lib/moodLabels.ts`**

```ts
export type MoodLabel =
  | "Exhausted"
  | "Low Energy"
  | "Focused"
  | "Motivated"
  | "Super Motivated";

export type DifficultyLabel =
  | "Very Easy"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Very Hard";

export function getMoodLabel(value: number): MoodLabel {
  if (value <= 20) return "Exhausted";
  if (value <= 40) return "Low Energy";
  if (value <= 60) return "Focused";
  if (value <= 80) return "Motivated";
  return "Super Motivated";
}

export function getDifficultyLabel(value: number): DifficultyLabel {
  if (value <= 20) return "Very Easy";
  if (value <= 40) return "Easy";
  if (value <= 60) return "Medium";
  if (value <= 80) return "Hard";
  return "Very Hard";
}
```

**Step 2: Create `apps/mobile/src/lib/points.ts`**

```ts
export interface UserProgress {
  level: number;
  points: number;
  pointsToNextLevel: number;
}

export const INITIAL_PROGRESS: UserProgress = {
  level: 1,
  points: 0,
  pointsToNextLevel: 50,
};

export function calcPointsEarned(difficulty: number): number {
  return Math.round(difficulty / 10) + 1;
}

function nextLevelThreshold(level: number): number {
  // 50, 100, 175, 275, 400 ... each +50% more than the gap before
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

export function applyPoints(
  progress: UserProgress,
  difficulty: number
): { next: UserProgress; earned: number; leveledUp: boolean } {
  const earned = calcPointsEarned(difficulty);
  let { level, points, pointsToNextLevel } = progress;
  points += earned;
  let leveledUp = false;

  if (points >= pointsToNextLevel) {
    level += 1;
    points -= pointsToNextLevel;
    pointsToNextLevel = nextLevelThreshold(level);
    leveledUp = true;
  }

  return { next: { level, points, pointsToNextLevel }, earned, leveledUp };
}

export function xpPercent(progress: UserProgress): number {
  return Math.min(progress.points / progress.pointsToNextLevel, 1);
}
```

**Step 3: Create `apps/mobile/src/animations/springs.ts`**

```bash
mkdir -p apps/mobile/src/animations
```

```ts
import { WithSpringConfig, WithTimingConfig } from "react-native-reanimated";

export const SPRING_DEFAULT: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
};

export const SPRING_BOUNCY: WithSpringConfig = {
  damping: 12,
  stiffness: 200,
};

export const SPRING_XP_BAR: WithSpringConfig = {
  damping: 20,
  stiffness: 120,
};

export const TIMING_FAST: WithTimingConfig = { duration: 150 };
export const TIMING_NORMAL: WithTimingConfig = { duration: 250 };
export const TIMING_SLOW: WithTimingConfig = { duration: 400 };
```

**Step 4: Write failing tests**

Create `apps/mobile/src/lib/__tests__/moodLabels.test.ts`:

```ts
import { getMoodLabel, getDifficultyLabel } from "../moodLabels";

describe("getMoodLabel", () => {
  it("returns Exhausted for 0", () => expect(getMoodLabel(0)).toBe("Exhausted"));
  it("returns Exhausted for 20", () => expect(getMoodLabel(20)).toBe("Exhausted"));
  it("returns Low Energy for 21", () => expect(getMoodLabel(21)).toBe("Low Energy"));
  it("returns Focused for 50", () => expect(getMoodLabel(50)).toBe("Focused"));
  it("returns Motivated for 70", () => expect(getMoodLabel(70)).toBe("Motivated"));
  it("returns Super Motivated for 100", () => expect(getMoodLabel(100)).toBe("Super Motivated"));
});

describe("getDifficultyLabel", () => {
  it("returns Very Easy for 0", () => expect(getDifficultyLabel(0)).toBe("Very Easy"));
  it("returns Medium for 60", () => expect(getDifficultyLabel(60)).toBe("Medium"));
  it("returns Very Hard for 100", () => expect(getDifficultyLabel(100)).toBe("Very Hard"));
});
```

Create `apps/mobile/src/lib/__tests__/points.test.ts`:

```ts
import { calcPointsEarned, applyPoints, xpPercent, INITIAL_PROGRESS } from "../points";

describe("calcPointsEarned", () => {
  it("returns 1 for difficulty 0", () => expect(calcPointsEarned(0)).toBe(1));
  it("returns 6 for difficulty 50", () => expect(calcPointsEarned(50)).toBe(6));
  it("returns 11 for difficulty 100", () => expect(calcPointsEarned(100)).toBe(11));
});

describe("applyPoints", () => {
  it("adds points without leveling up", () => {
    const { next, earned, leveledUp } = applyPoints(INITIAL_PROGRESS, 50);
    expect(earned).toBe(6);
    expect(next.points).toBe(6);
    expect(next.level).toBe(1);
    expect(leveledUp).toBe(false);
  });

  it("levels up when points reach threshold", () => {
    const progress = { level: 1, points: 45, pointsToNextLevel: 50 };
    const { next, leveledUp } = applyPoints(progress, 50); // earns 6
    expect(leveledUp).toBe(true);
    expect(next.level).toBe(2);
    expect(next.points).toBe(1); // 45 + 6 - 50 = 1
    expect(next.pointsToNextLevel).toBe(75); // 50 * 1.5
  });
});

describe("xpPercent", () => {
  it("returns 0 at start", () => expect(xpPercent(INITIAL_PROGRESS)).toBe(0));
  it("returns 0.5 at half", () => {
    expect(xpPercent({ level: 1, points: 25, pointsToNextLevel: 50 })).toBe(0.5);
  });
  it("caps at 1", () => {
    expect(xpPercent({ level: 1, points: 60, pointsToNextLevel: 50 })).toBe(1);
  });
});
```

**Step 5: Install jest + run tests**

```bash
cd apps/mobile
npm install --save-dev jest @types/jest ts-jest
```

Add to `apps/mobile/package.json` scripts:
```json
"test": "jest"
```

Add jest config to `apps/mobile/package.json`:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testPathPattern": "src/lib/__tests__"
}
```

```bash
npm test
```
Expected: All 11 tests pass.

**Step 6: Commit**

```bash
cd ../..
git add apps/mobile/src/ apps/mobile/package.json
git commit -m "feat: add utility functions and animations config"
```

---

## Task 5: Hooks — useTasks, useUserProgress, useSettings

**Files:**
- Create: `apps/mobile/src/hooks/useTasks.ts`
- Create: `apps/mobile/src/hooks/useUserProgress.ts`
- Create: `apps/mobile/src/hooks/useSettings.ts`

**Step 1: Create `apps/mobile/src/hooks/useTasks.ts`**

```bash
mkdir -p apps/mobile/src/hooks
```

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api";
import type { Task } from "@adhd-planner/types";

export type CreateTaskInput = {
  title: string;
  description?: string;
  difficulty: number;
  dueDate?: string;
  dueTime?: string;
};

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => apiClient.get<Task[]>("/api/tasks"),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      apiClient.post<{ id: string }>("/api/tasks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/api/tasks/${id}/complete`, { completed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
```

**Step 2: Create `apps/mobile/src/hooks/useUserProgress.ts`**

```ts
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import {
  UserProgress,
  INITIAL_PROGRESS,
  applyPoints,
} from "../lib/points";

const KEY = "@adhd_progress";

export function useUserProgress() {
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setProgress(JSON.parse(raw));
    });
  }, []);

  const addPoints = useCallback(
    async (difficulty: number): Promise<{ earned: number; leveledUp: boolean }> => {
      const { next, earned, leveledUp } = applyPoints(progress, difficulty);
      setProgress(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      return { earned, leveledUp };
    },
    [progress]
  );

  return { progress, addPoints };
}
```

**Step 3: Create `apps/mobile/src/hooks/useSettings.ts`**

```ts
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Settings {
  notifications: boolean;
  focusMode: boolean;
  soundEffects: boolean;
  smartScheduling: boolean;
}

const DEFAULT: Settings = {
  notifications: true,
  focusMode: false,
  soundEffects: true,
  smartScheduling: true,
};

const KEY = "@adhd_settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setSettings(JSON.parse(raw));
    });
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    },
    [settings]
  );

  return { settings, updateSetting };
}
```

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/
git commit -m "feat: add useTasks, useUserProgress, useSettings hooks"
```

---

## Task 6: XPBar component

**Files:**
- Create: `apps/mobile/src/components/XPBar.tsx`
- Create: `apps/mobile/src/components/PointsToast.tsx`

**Step 1: Create `apps/mobile/src/components/XPBar.tsx`**

```bash
mkdir -p apps/mobile/src/components
```

This component shows Level, points, next-level text, and an animated gradient progress bar. The bar width animates with a spring when `percent` changes.

```tsx
import { View, Text, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { UserProgress } from "../lib/points";
import { xpPercent } from "../lib/points";
import { SPRING_XP_BAR, SPRING_BOUNCY } from "../animations/springs";

interface Props {
  progress: UserProgress;
  onLevelUp?: () => void;
}

export function XPBar({ progress }: Props) {
  const percent = xpPercent(progress);
  const barWidth = useSharedValue(percent);
  const trophyScale = useSharedValue(1);

  useEffect(() => {
    barWidth.value = withSpring(percent, SPRING_XP_BAR);
  }, [percent]);

  // Call this from parent after level up to trigger trophy burst
  const animateLevelUp = () => {
    trophyScale.value = withSequence(
      withSpring(1.4, SPRING_BOUNCY),
      withSpring(1, SPRING_BOUNCY)
    );
  };

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  return (
    <View
      className="mx-6 rounded-3xl px-4 pt-4 pb-3"
      style={{
        backgroundImage: undefined,
        backgroundColor: "rgba(189,224,254,0.2)",
      }}
    >
      {/* Row: trophy + level info + next level */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Animated.View
            style={trophyStyle}
            className="w-10 h-10 rounded-full items-center justify-center"
            // pink gradient background
          >
            {/* Trophy icon — use lucide-react-native or inline SVG */}
            <View className="w-10 h-10 rounded-full bg-[#ffc8dd] items-center justify-center">
              <Text className="text-base">🏆</Text>
            </View>
          </Animated.View>
          <View>
            <Text className="text-sm font-semibold text-[#1e2939]">
              Level {progress.level}
            </Text>
            <Text className="text-xs text-[#6a7282]">{progress.points} points</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-xs text-[#6a7282]">Next level</Text>
          <Text className="text-sm font-semibold text-[#1e2939]">
            {progress.pointsToNextLevel - progress.points} pts
          </Text>
        </View>
      </View>

      {/* XP bar */}
      <View className="h-3 rounded-full bg-white/50 overflow-hidden">
        <Animated.View
          style={[
            barStyle,
            {
              height: "100%",
              borderRadius: 9999,
              background: undefined,
              backgroundColor: "#a2d2ff",
            },
          ]}
        />
      </View>
    </View>
  );
}
```

> **Note:** NativeWind v4 uses inline styles for gradients on React Native since `background-image` isn't supported. Use `LinearGradient` from `expo-linear-gradient` for the bar fill in the final implementation.

**Step 2: Install expo-linear-gradient**

```bash
cd apps/mobile && npx expo install expo-linear-gradient && cd ../..
```

**Step 3: Update XPBar to use LinearGradient for the bar fill**

Replace the `Animated.View` bar fill in `XPBar.tsx`:

```tsx
import { LinearGradient } from "expo-linear-gradient";

// Replace the inner Animated.View with:
<Animated.View style={[barStyle, { height: "100%", borderRadius: 9999, overflow: "hidden" }]}>
  <LinearGradient
    colors={["#a2d2ff", "#cdb4db"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{ flex: 1 }}
  />
</Animated.View>
```

**Step 4: Create `apps/mobile/src/components/PointsToast.tsx`**

```tsx
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Text } from "react-native";
import { TIMING_NORMAL } from "../animations/springs";

interface Props {
  points: number;
  visible: boolean;
  onDone: () => void;
}

export function PointsToast({ points, visible, onDone }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    translateY.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
    translateY.value = withSequence(
      withTiming(-40, { duration: 1100 })
    );
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={style}
      className="absolute top-0 self-center bg-white rounded-full px-4 py-1 shadow-sm"
    >
      <Text className="text-[#a2d2ff] font-semibold text-sm">+{points} pts</Text>
    </Animated.View>
  );
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/components/
git commit -m "feat: add XPBar and PointsToast components"
```

---

## Task 7: MoodSlider component

**Files:**
- Create: `apps/mobile/src/components/MoodSlider.tsx`

**Step 1: Install slider**

```bash
cd apps/mobile && npx expo install @react-native-community/slider && cd ../..
```

**Step 2: Create `apps/mobile/src/components/MoodSlider.tsx`**

```tsx
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { getMoodLabel } from "../lib/moodLabels";
import { TIMING_NORMAL } from "../animations/springs";
import { useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function MoodSlider({ value, onChange }: Props) {
  const label = getMoodLabel(value);

  return (
    <View className="w-full">
      {/* Cross-fading label */}
      <Animated.Text
        key={label}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="text-center text-lg font-medium text-[#364153] mb-3"
      >
        {label}
      </Animated.Text>

      {/* Gradient track with slider */}
      <View className="relative h-8 justify-center">
        <LinearGradient
          colors={["#a2d2ff", "#bde0fe", "#cdb4db", "#ffc8dd", "#ffafcc"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            height: 12,
            borderRadius: 9999,
          }}
        />
        <Slider
          style={{ width: "100%", height: 32 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#ffffff"
        />
      </View>
    </View>
  );
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/MoodSlider.tsx
git commit -m "feat: add MoodSlider component"
```

---

## Task 8: TaskCard component

**Files:**
- Create: `apps/mobile/src/components/TaskCard.tsx`

**Step 1: Create `apps/mobile/src/components/TaskCard.tsx`**

The card animates in (fade + slide up) when a task is selected, and out (slide down + fade) on dismiss.

```tsx
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import type { Task } from "@adhd-planner/types";
import { getDifficultyLabel } from "../lib/moodLabels";
import { SPRING_DEFAULT, SPRING_BOUNCY } from "../animations/springs";

interface Props {
  task: Task | null;
  onComplete: (task: Task) => void;
  onLater: () => void;
}

export function TaskCard({ task, onComplete, onLater }: Props) {
  const completeScale = useSharedValue(1);
  const laterScale = useSharedValue(1);

  const handleComplete = () => {
    completeScale.value = withSequence(
      withSpring(0.92, SPRING_BOUNCY),
      withSpring(1, SPRING_BOUNCY)
    );
    setTimeout(() => task && onComplete(task), 200);
  };

  const completeBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
  }));

  const laterBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: laterScale.value }],
  }));

  if (!task) {
    return (
      <View className="bg-white border border-[#f3f4f6] rounded-3xl px-6 py-6 items-center">
        <Text className="text-[#99a1af] text-base text-center">
          No task selected yet
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20)}
      exiting={FadeOutDown.duration(250)}
      className="bg-white border border-[#f3f4f6] rounded-3xl p-6 shadow-sm"
    >
      <Text className="text-lg font-medium text-[#1e2939] mb-1">{task.title}</Text>
      {task.description ? (
        <Text className="text-sm text-[#4a5565] mb-3">{task.description}</Text>
      ) : null}
      <Text className="text-xs text-[#6a7282] mb-4">
        {getDifficultyLabel(task.difficulty)}
      </Text>

      <View className="flex-row gap-3">
        <Animated.View style={[completeBtnStyle, { flex: 1 }]}>
          <Pressable
            onPress={handleComplete}
            className="bg-[#a2d2ff] rounded-3xl py-3 items-center flex-row justify-center gap-2"
          >
            <Text className="text-base font-medium text-[#0a0a0a]">✓ Complete</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={laterBtnStyle}>
          <Pressable
            onPress={onLater}
            onPressIn={() => { laterScale.value = withSpring(0.92, SPRING_BOUNCY); }}
            onPressOut={() => { laterScale.value = withSpring(1, SPRING_BOUNCY); }}
            className="bg-[#ffc8dd] rounded-3xl py-3 px-5 items-center"
          >
            <Text className="text-sm font-medium text-[#0a0a0a]">Later</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/TaskCard.tsx
git commit -m "feat: add animated TaskCard component"
```

---

## Task 9: BottomNav component

**Files:**
- Create: `apps/mobile/src/components/BottomNav.tsx`

**Step 1: Create `apps/mobile/src/components/BottomNav.tsx`**

```tsx
import { View, Pressable, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_BOUNCY } from "../animations/springs";

interface Props {
  onListPress: () => void;
  onAddPress: () => void;
  onSettingsPress: () => void;
}

function NavButton({
  onPress,
  children,
  gradient,
}: {
  onPress: () => void;
  children: React.ReactNode;
  gradient?: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        {gradient ? (
          <LinearGradient
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}
          >
            {children}
          </LinearGradient>
        ) : (
          <View className="w-14 h-14 bg-white rounded-full items-center justify-center shadow">
            {children}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BottomNav({ onListPress, onAddPress, onSettingsPress }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[#f3f4f6] px-6 pt-6 pb-8">
      <View className="flex-row items-center justify-center gap-8">
        <NavButton onPress={onListPress}>
          {/* List icon */}
          <View className="w-6 h-6 items-center justify-center">
            <View className="w-5 h-0.5 bg-[#364153] mb-1" />
            <View className="w-5 h-0.5 bg-[#364153] mb-1" />
            <View className="w-5 h-0.5 bg-[#364153]" />
          </View>
        </NavButton>

        <NavButton onPress={onAddPress} gradient>
          {/* Plus icon */}
          <View className="w-7 h-7 items-center justify-center">
            <View className="absolute w-5 h-0.5 bg-white" />
            <View className="absolute w-0.5 h-5 bg-white" />
          </View>
        </NavButton>

        <NavButton onPress={onSettingsPress}>
          {/* Settings gear — text fallback */}
          <View className="w-6 h-6 items-center justify-center">
            <Animated.Text className="text-[#364153] text-lg">⚙</Animated.Text>
          </View>
        </NavButton>
      </View>
    </View>
  );
}
```

> **Note:** Replace icon placeholders with `lucide-react-native` icons in final polish: `npm install lucide-react-native`.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/BottomNav.tsx
git commit -m "feat: add animated BottomNav component"
```

---

## Task 10: AddTaskSheet + RecordingSheet

**Files:**
- Create: `apps/mobile/src/components/sheets/AddTaskSheet.tsx`
- Create: `apps/mobile/src/components/sheets/RecordingSheet.tsx`

**Step 1: Create sheets directory**

```bash
mkdir -p apps/mobile/src/components/sheets
```

**Step 2: Create `apps/mobile/src/components/sheets/AddTaskSheet.tsx`**

```tsx
import { forwardRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

interface Props {
  onConfirm: (title: string) => void;
  onMicPress: () => void;
  onClose: () => void;
}

export const AddTaskSheet = forwardRef<BottomSheet, Props>(
  ({ onConfirm, onMicPress, onClose }, ref) => {
    const [text, setText] = useState("");
    const micScale = useSharedValue(1);
    const confirmScale = useSharedValue(1);

    const micStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micScale.value }],
    }));
    const confirmStyle = useAnimatedStyle(() => ({
      transform: [{ scale: confirmScale.value }],
    }));

    const handleConfirm = () => {
      if (!text.trim()) return;
      onConfirm(text.trim());
      setText("");
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">Add New Task</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>

          {/* Textarea */}
          <TextInput
            className="border border-[#e5e7eb] rounded-3xl p-4 text-base text-[#1e2939] min-h-[128px]"
            placeholder="Describe your task..."
            placeholderTextColor="#99a1af"
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />

          {/* Action buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-4">
            <Animated.View style={micStyle}>
              <Pressable
                onPress={onMicPress}
                onPressIn={() => { micScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                onPressOut={() => { micScale.value = withSpring(1, SPRING_BOUNCY); }}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: "#a2d2ff" }}
              >
                <Text className="text-2xl">🎤</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={confirmStyle}>
              <Pressable
                onPress={handleConfirm}
                onPressIn={() => { confirmScale.value = withSpring(0.92, SPRING_BOUNCY); }}
                onPressOut={() => { confirmScale.value = withSpring(1, SPRING_BOUNCY); }}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: text.trim() ? "#bde0fe" : "#bde0fe", opacity: text.trim() ? 1 : 0.5 }}
              >
                <Text className="text-2xl">✓</Text>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 3: Create `apps/mobile/src/components/sheets/RecordingSheet.tsx`**

```tsx
import { forwardRef, useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

interface Props {
  onStop: (transcription: string) => void;
  onClose: () => void;
}

// Animated waveform dot
function WaveDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 + delay }),
        withTiming(0.3, { duration: 400 + delay })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ffafcc", marginHorizontal: 3 }]}
    />
  );
}

export const RecordingSheet = forwardRef<BottomSheet, Props>(
  ({ onStop, onClose }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">Add New Task</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>

          {/* Waveform */}
          <View
            className="rounded-3xl overflow-hidden justify-center items-center"
            style={{ height: 64, backgroundColor: "rgba(162,210,255,0.2)" }}
          >
            <View className="flex-row items-center">
              {Array.from({ length: 45 }).map((_, i) => (
                <WaveDot key={i} delay={i * 20} />
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-6">
            <Pressable
              onPress={() => onStop("")}
              className="w-16 h-16 rounded-full items-center justify-center bg-[#a2d2ff]"
            >
              <Text className="text-xl">✕</Text>
            </Pressable>
            <Pressable
              onPress={() => onStop("")}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: "#bde0fe", opacity: 0.5 }}
            >
              <Text className="text-xl">✓</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/
git commit -m "feat: add AddTaskSheet and RecordingSheet"
```

---

## Task 11: SelectDaySheet + SelectTimeSheet

**Files:**
- Create: `apps/mobile/src/components/sheets/SelectDaySheet.tsx`
- Create: `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`

**Step 1: Create shared gradient option button**

At top of `SelectDaySheet.tsx`, define a reusable `GradientButton`:

```tsx
import { forwardRef, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

type GradientPair = [string, string];

const DAY_GRADIENTS: GradientPair[] = [
  ["#bde0fe", "#a2d2ff"],
  ["#a2d2ff", "#cdb4db"],
  ["#cdb4db", "#ffc8dd"],
  ["#ffc8dd", "#ffafcc"],
];

function GradientOption({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: GradientPair;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
        >
          <Text className="text-white font-medium text-base">{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onSelect: (day: "today" | "tomorrow" | "end_of_week" | "custom") => void;
  onClose: () => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  showCustomInput: boolean;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose, customValue, onCustomChange, showCustomInput }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["35%", "50%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">When is this due?</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="Today" colors={DAY_GRADIENTS[0]} onPress={() => onSelect("today")} />
              <GradientOption label="Tomorrow" colors={DAY_GRADIENTS[1]} onPress={() => onSelect("tomorrow")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="End of Week" colors={DAY_GRADIENTS[2]} onPress={() => onSelect("end_of_week")} />
              <GradientOption label="Custom" colors={DAY_GRADIENTS[3]} onPress={() => onSelect("custom")} />
            </View>
            {showCustomInput && (
              <TextInput
                className="border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939] mt-1"
                placeholder="e.g. March 15"
                placeholderTextColor="#99a1af"
                value={customValue}
                onChangeText={onCustomChange}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Create `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`**

Same structure as SelectDaySheet but with time options:

```tsx
import { forwardRef } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { SPRING_BOUNCY } from "../../animations/springs";

// Same GradientOption component as SelectDaySheet (extract to shared file in polish pass)
function GradientOption({ label, colors, onPress }: { label: string; colors: [string, string]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}>
          <Text className="text-white font-medium text-base">{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onSelect: (time: "noon" | "afternoon" | "end_of_day" | "custom") => void;
  onClose: () => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  showCustomInput: boolean;
}

export const SelectTimeSheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose, customValue, onCustomChange, showCustomInput }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["35%", "50%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">What time?</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="By Noon" colors={["#bde0fe", "#a2d2ff"]} onPress={() => onSelect("noon")} />
              <GradientOption label="By Afternoon" colors={["#a2d2ff", "#cdb4db"]} onPress={() => onSelect("afternoon")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="By End of Day" colors={["#cdb4db", "#ffc8dd"]} onPress={() => onSelect("end_of_day")} />
              <GradientOption label="Custom" colors={["#ffc8dd", "#ffafcc"]} onPress={() => onSelect("custom")} />
            </View>
            {showCustomInput && (
              <TextInput
                className="border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939] mt-1"
                placeholder="e.g. 14:30"
                placeholderTextColor="#99a1af"
                value={customValue}
                onChangeText={onCustomChange}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/
git commit -m "feat: add SelectDaySheet and SelectTimeSheet"
```

---

## Task 12: AllTasksSheet + SettingsSheet

**Files:**
- Create: `apps/mobile/src/components/sheets/AllTasksSheet.tsx`
- Create: `apps/mobile/src/components/sheets/SettingsSheet.tsx`

**Step 1: Create `apps/mobile/src/components/sheets/AllTasksSheet.tsx`**

```tsx
import { forwardRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInRight,
  FadeOutLeft,
  Layout,
} from "react-native-reanimated";
import type { Task } from "@adhd-planner/types";
import { getDifficultyLabel } from "../../lib/moodLabels";
import { SPRING_BOUNCY } from "../../animations/springs";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <Animated.View
      entering={FadeInRight.springify().damping(18)}
      exiting={FadeOutLeft.duration(200)}
      layout={Layout.springify()}
      className="bg-[#f5f7fa] rounded-3xl p-4 mb-3"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-medium text-[#1e2939] mb-1">{task.title}</Text>
          {task.description ? (
            <Text className="text-sm text-[#4a5565] mb-1">{task.description}</Text>
          ) : null}
          <Text className="text-xs text-[#6a7282]">{getDifficultyLabel(task.difficulty)}</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onEdit(task)}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Text className="text-[#364153]">✏</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(task.id)}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Text className="text-[#364153]">🗑</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const AllTasksSheet = forwardRef<BottomSheet, Props>(
  ({ tasks, onEdit, onDelete, onClose }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["80%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
          <Text className="text-lg font-medium text-[#1e2939]">All Tasks</Text>
          <Pressable onPress={onClose}>
            <Text className="text-[#364153] text-lg">✕</Text>
          </Pressable>
        </View>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && (
            <Text className="text-center text-[#99a1af] mt-8">No tasks yet</Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Create `apps/mobile/src/components/sheets/SettingsSheet.tsx`**

```tsx
import { forwardRef } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { Settings } from "../../hooks/useSettings";

interface SettingRowProps {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function SettingRow({ icon, color, title, subtitle, value, onChange }: SettingRowProps) {
  return (
    <View className="bg-[#f5f7fa] rounded-3xl px-4 py-4 flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Text className="text-base">{icon}</Text>
        </View>
        <View>
          <Text className="text-sm font-medium text-[#1e2939]">{title}</Text>
          <Text className="text-xs text-[#6a7282]">{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#e5e7eb", true: "#a2d2ff" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
}

export const SettingsSheet = forwardRef<BottomSheet, Props>(
  ({ settings, onUpdate, onClose }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["60%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-medium text-[#1e2939]">Settings</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>
          <SettingRow icon="🔔" color="#a2d2ff" title="Notifications" subtitle="Task reminders"
            value={settings.notifications} onChange={(v) => onUpdate("notifications", v)} />
          <SettingRow icon="🌙" color="#cdb4db" title="Focus Mode" subtitle="Minimize distractions"
            value={settings.focusMode} onChange={(v) => onUpdate("focusMode", v)} />
          <SettingRow icon="🔊" color="#ffc8dd" title="Sound Effects" subtitle="Audio feedback"
            value={settings.soundEffects} onChange={(v) => onUpdate("soundEffects", v)} />
          <SettingRow icon="⚡" color="#bde0fe" title="Smart Scheduling" subtitle="AI-powered task order"
            value={settings.smartScheduling} onChange={(v) => onUpdate("smartScheduling", v)} />
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/
git commit -m "feat: add AllTasksSheet and SettingsSheet"
```

---

## Task 13: Wire home screen (`app/index.tsx`)

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Step 1: Replace stub with full home screen**

```tsx
import { View, SafeAreaView, ScrollView } from "react-native";
import { useRef, useState, useCallback } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { XPBar } from "../src/components/XPBar";
import { MoodSlider } from "../src/components/MoodSlider";
import { TaskCard } from "../src/components/TaskCard";
import { BottomNav } from "../src/components/BottomNav";
import { PointsToast } from "../src/components/PointsToast";
import { AddTaskSheet } from "../src/components/sheets/AddTaskSheet";
import { RecordingSheet } from "../src/components/sheets/RecordingSheet";
import { SelectDaySheet } from "../src/components/sheets/SelectDaySheet";
import { SelectTimeSheet } from "../src/components/sheets/SelectTimeSheet";
import { AllTasksSheet } from "../src/components/sheets/AllTasksSheet";
import { SettingsSheet } from "../src/components/sheets/SettingsSheet";

import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "../src/hooks/useTasks";
import { useUserProgress } from "../src/hooks/useUserProgress";
import { useSettings } from "../src/hooks/useSettings";
import type { Task } from "@adhd-planner/types";

// Sheet names for state machine
type ActiveSheet =
  | "none"
  | "addTask"
  | "recording"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings";

export default function HomeScreen() {
  const [moodLevel, setMoodLevel] = useState(80);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>("none");
  const [toast, setToast] = useState<{ points: number; visible: boolean }>({
    points: 0,
    visible: false,
  });

  // Task creation flow state
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  // AI button animation
  const aiScale = useSharedValue(1);
  const aiRotate = useSharedValue(0);

  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const { progress, addPoints } = useUserProgress();
  const { settings, updateSetting } = useSettings();

  // Sheet refs
  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    setActiveSheet(sheet);
    if (sheet === "addTask") addSheetRef.current?.expand();
    if (sheet === "recording") recordingSheetRef.current?.expand();
    if (sheet === "selectDay") daySheetRef.current?.expand();
    if (sheet === "selectTime") timeSheetRef.current?.expand();
    if (sheet === "allTasks") allTasksSheetRef.current?.expand();
    if (sheet === "settings") settingsSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet("none");
    addSheetRef.current?.close();
    recordingSheetRef.current?.close();
    daySheetRef.current?.close();
    timeSheetRef.current?.close();
    allTasksSheetRef.current?.close();
    settingsSheetRef.current?.close();
  }, []);

  // AI pick task
  const handleAIPick = useCallback(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    if (!incomplete.length) return;

    // Animate sparkles button
    aiRotate.value = withSequence(
      withTiming(0.1, { duration: 100 }),
      withTiming(-0.1, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    aiScale.value = withSequence(
      withSpring(1.1, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );

    const best = incomplete.reduce((prev, curr) =>
      Math.abs(curr.difficulty - moodLevel) < Math.abs(prev.difficulty - moodLevel)
        ? curr
        : prev
    );
    setTimeout(() => setSelectedTask(best), 300);
  }, [tasks, moodLevel]);

  // Complete task
  const handleComplete = useCallback(
    async (task: Task) => {
      await completeTask.mutateAsync(task.id);
      const { earned } = await addPoints(task.difficulty);
      setSelectedTask(null);
      setToast({ points: earned, visible: true });
    },
    [completeTask, addPoints]
  );

  // Add task flow
  const handleTaskConfirmed = (title: string) => {
    setPendingTaskTitle(title);
    closeSheet();
    setTimeout(() => openSheet("selectDay"), 300);
  };

  const handleDaySelected = (day: string) => {
    if (day === "custom") {
      setShowCustomDay(true);
      return;
    }
    setSelectedDay(day);
    setShowCustomDay(false);
    closeSheet();
    setTimeout(() => openSheet("selectTime"), 300);
  };

  const handleTimeSelected = async (time: string) => {
    if (time === "custom") {
      setShowCustomTime(true);
      return;
    }
    closeSheet();
    await createTask.mutateAsync({
      title: pendingTaskTitle,
      difficulty: moodLevel, // default difficulty matches current mood
      dueDate: selectedDay || undefined,
      dueTime: time,
    });
    setPendingTaskTitle("");
    setSelectedDay("");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f7fa]">
      {/* Card container */}
      <View className="flex-1 mx-4 mt-5 bg-white rounded-[48px] shadow-2xl overflow-hidden">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {/* XP bar */}
          <View className="pt-8 pb-4">
            <View className="relative">
              <XPBar progress={progress} />
              <PointsToast
                points={toast.points}
                visible={toast.visible}
                onDone={() => setToast((t) => ({ ...t, visible: false }))}
              />
            </View>
          </View>

          {/* Mood slider */}
          <View className="px-6 pb-6">
            <MoodSlider value={moodLevel} onChange={setMoodLevel} />
          </View>

          {/* AI button */}
          <View className="items-center pb-6">
            <Animated.View
              style={{
                transform: [
                  { scale: aiScale },
                  { rotate: aiRotate.value + "rad" },
                ],
              }}
            >
              <Animated.View
                className="w-32 h-32 rounded-full items-center justify-center"
                style={{ backgroundColor: "#a2d2ff" }}
              >
                <Animated.Text
                  style={{ fontSize: 48 }}
                  onTouchEnd={handleAIPick}
                >
                  ✦
                </Animated.Text>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Task card */}
          <View className="px-6">
            <TaskCard
              task={selectedTask}
              onComplete={handleComplete}
              onLater={() => setSelectedTask(null)}
            />
          </View>
        </ScrollView>

        {/* Bottom nav */}
        <BottomNav
          onListPress={() => openSheet("allTasks")}
          onAddPress={() => openSheet("addTask")}
          onSettingsPress={() => openSheet("settings")}
        />
      </View>

      {/* Bottom sheets */}
      <AddTaskSheet
        ref={addSheetRef}
        onConfirm={handleTaskConfirmed}
        onMicPress={() => { closeSheet(); setTimeout(() => openSheet("recording"), 300); }}
        onClose={closeSheet}
      />
      <RecordingSheet
        ref={recordingSheetRef}
        onStop={(text) => { closeSheet(); if (text) setPendingTaskTitle(text); setTimeout(() => openSheet("selectDay"), 300); }}
        onClose={closeSheet}
      />
      <SelectDaySheet
        ref={daySheetRef}
        onSelect={handleDaySelected}
        onClose={closeSheet}
        customValue={customDay}
        onCustomChange={setCustomDay}
        showCustomInput={showCustomDay}
      />
      <SelectTimeSheet
        ref={timeSheetRef}
        onSelect={handleTimeSelected}
        onClose={closeSheet}
        customValue={customTime}
        onCustomChange={setCustomTime}
        showCustomInput={showCustomTime}
      />
      <AllTasksSheet
        ref={allTasksSheetRef}
        tasks={tasks}
        onEdit={() => {}}
        onDelete={(id) => deleteTask.mutate(id)}
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        settings={settings}
        onUpdate={updateSetting}
        onClose={closeSheet}
      />
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat: wire home screen with all sheets and animations"
```

---

## Task 14: Root install + typecheck + smoke test

**Step 1: Install all workspace deps from root**

```bash
cd /path/to/adhd-planner
npm install
```
Expected: workspaces linked, no errors.

**Step 2: Run typecheck across all packages**

```bash
npm run typecheck
```
Expected: 0 errors (or only the known `@ts-ignore` on Convex generated import).

**Step 3: Run mobile**

```bash
cd apps/mobile && npm run dev
```
Expected: Expo QR code, no red errors in Metro bundler output.

**Step 4: Run tests**

```bash
npm test
```
Expected: 11 tests pass.

**Step 5: Final commit**

```bash
cd ../..
git add package-lock.json
git commit -m "chore: finalize mobile frontend wiring"
```

---

## Notes

- **Icons:** All icon placeholders (✏, 🗑, 🏆, ⚙) should be replaced with `lucide-react-native` in a polish pass: `npm install lucide-react-native`. Import: `import { Pencil, Trash2, Trophy, Settings } from "lucide-react-native"`
- **AI button:** The sparkles icon in Figma is an image asset. Use the Figma MCP asset URL or replace with lucide's `Sparkles` icon.
- **Gradient duplicate:** `GradientOption` is duplicated between SelectDaySheet and SelectTimeSheet — extract to `src/components/GradientOption.tsx` in polish pass.
- **Task difficulty on create:** Currently defaults to `moodLevel`. In a future iteration, add a difficulty slider to the AddTaskSheet.
- **Edit task:** `AllTasksSheet` `onEdit` is a no-op stub — implement as a separate sheet in a future iteration.

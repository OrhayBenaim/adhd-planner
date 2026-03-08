# Home Screen Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the 315-line `index.tsx` into 5 files by concern, with a session gate that also fixes the Convex `Unauthenticated` race.

**Architecture:** `index.tsx` gates on session (loader vs app). `HomeProvider` holds all shared state in a React context. `MainContent` renders the scrollable UI + AI pick logic. `SheetManager` owns all 6 bottom-sheet refs and the multi-step task creation flow.

**Tech Stack:** React Native, Expo Router, Convex React, Reanimated, @gorhom/bottom-sheet, better-auth

---

### Task 1: Create `HomeProvider.tsx` — shared context

**Files:**
- Create: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Create the provider with context and types**

```tsx
// apps/mobile/src/components/home/HomeProvider.tsx
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { Task, UserProgress } from "@adhd-planner/types";
import type { Settings } from "../../hooks/useSettings";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "../../hooks/useTasks";
import { useUserProgress } from "../../hooks/useUserProgress";
import { useSettings } from "../../hooks/useSettings";
import type BottomSheet from "@gorhom/bottom-sheet";

export type ActiveSheet =
  | "none"
  | "addTask"
  | "recording"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings";

type SheetEntry = { name: ActiveSheet; ref: React.RefObject<BottomSheet | null> };

interface HomeContextValue {
  // Data
  tasks: Task[];
  progress: UserProgress;
  settings: Settings;
  moodLevel: number;
  selectedTask: Task | null;
  toast: { points: number; visible: boolean };

  // Actions
  setMoodLevel: (v: number) => void;
  setSelectedTask: (t: Task | null) => void;
  showToast: (points: number) => void;
  hideToast: () => void;
  completeTask: (id: string) => Promise<{ earned: number; leveledUp: boolean } | undefined>;
  createTask: (args: { title: string; difficulty: number; dueDate?: string; dueTime?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;

  // Sheet nav
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  registerSheet: (entry: SheetEntry) => void;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome must be used within HomeProvider");
  return ctx;
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const [moodLevel, setMoodLevel] = useState(50);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<{ points: number; visible: boolean }>({
    points: 0,
    visible: false,
  });

  const tasks = useTasks();
  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const { progress } = useUserProgress();
  const { settings, updateSetting } = useSettings();

  // Sheet registry — SheetManager registers its refs here
  const sheetsRef = useRef<Map<ActiveSheet, React.RefObject<BottomSheet | null>>>(new Map());

  const registerSheet = useCallback((entry: SheetEntry) => {
    sheetsRef.current.set(entry.name, entry.ref);
  }, []);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    sheetsRef.current.get(sheet)?.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    sheetsRef.current.forEach((ref) => ref.current?.close());
  }, []);

  const showToast = useCallback((points: number) => {
    setToast({ points, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  const completeTask = useCallback(
    async (id: string) => {
      const result = await completeTaskMutation({ id: id as Id<"tasks"> });
      return result ?? undefined;
    },
    [completeTaskMutation]
  );

  const createTask = useCallback(
    async (args: { title: string; difficulty: number; dueDate?: string; dueTime?: string }) => {
      await createTaskMutation(args);
    },
    [createTaskMutation]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskMutation({ id: id as Id<"tasks"> });
    },
    [deleteTaskMutation]
  );

  return (
    <HomeContext.Provider
      value={{
        tasks,
        progress,
        settings,
        moodLevel,
        selectedTask,
        toast,
        setMoodLevel,
        setSelectedTask,
        showToast,
        hideToast,
        completeTask,
        createTask,
        deleteTask,
        updateSetting,
        openSheet,
        closeSheet,
        registerSheet,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat(mobile): add HomeProvider context for shared home screen state"
```

---

### Task 2: Create `MainContent.tsx` — scrollable UI + AI pick

**Files:**
- Create: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Create the component**

```tsx
// apps/mobile/src/components/home/MainContent.tsx
import { View, ScrollView, Pressable, Text } from "react-native";
import { useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { XPBar } from "../XPBar";
import { MoodSlider } from "../MoodSlider";
import { TaskCard } from "../TaskCard";
import { BottomNav } from "../BottomNav";
import { PointsToast } from "../PointsToast";
import { useHome } from "./HomeProvider";

export function MainContent() {
  const {
    tasks,
    progress,
    moodLevel,
    setMoodLevel,
    selectedTask,
    setSelectedTask,
    toast,
    hideToast,
    completeTask,
    showToast,
    openSheet,
  } = useHome();

  // AI button animation — local to this component
  const aiScale = useSharedValue(1);
  const aiRotate = useSharedValue(0);

  const handleAIPick = useCallback(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    if (!incomplete.length) return;

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
  }, [tasks, moodLevel, setSelectedTask, aiRotate, aiScale]);

  const handleComplete = useCallback(
    async (task: typeof selectedTask) => {
      if (!task) return;
      const result = await completeTask(task._id);
      setSelectedTask(null);
      showToast(result?.earned ?? 0);
    },
    [completeTask, setSelectedTask, showToast]
  );

  const aiAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: aiScale.value },
      { rotate: `${aiRotate.value}rad` },
    ],
  }));

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center pt-8 pb-4 px-6">
          <Text className="text-2xl font-medium text-[#0a0a0a] text-center">How are you feeling?</Text>
          <Text className="text-sm text-[#6a7282] text-center mt-1">Let's find the perfect task for you</Text>
        </View>

        {/* XP bar */}
        <View className="py-6">
          <View className="relative">
            <XPBar progress={progress} />
            <PointsToast
              points={toast.points}
              visible={toast.visible}
              onDone={hideToast}
            />
          </View>
        </View>

        {/* Mood slider */}
        <View className="px-6 pt-2 pb-8">
          <MoodSlider value={moodLevel} onChange={setMoodLevel} />
        </View>

        {/* AI button */}
        <View className="items-center pb-6">
          <Animated.View style={aiAnimStyle}>
            <Pressable onPress={handleAIPick}>
              <View style={{ width: 154, height: 154, borderRadius: 77, backgroundColor: "#b9cbea", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 }}>
                <View style={{ width: 154, height: 154, borderRadius: 77, overflow: "hidden" }}>
                  <LinearGradient
                    colors={["#a2d2ff", "#cdb4db"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name="sparkles-outline" size={58} color="#fff" />
                  </LinearGradient>
                </View>
              </View>
            </Pressable>
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
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "feat(mobile): add MainContent component for home screen scrollable UI"
```

---

### Task 3: Create `SheetManager.tsx` — all bottom sheets + task creation flow

**Files:**
- Create: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Create the component**

```tsx
// apps/mobile/src/components/home/SheetManager.tsx
import { useRef, useState, useCallback, useEffect, type RefObject } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { useHome, type ActiveSheet } from "./HomeProvider";

export function SheetManager() {
  const {
    tasks,
    settings,
    moodLevel,
    createTask,
    deleteTask,
    updateSetting,
    openSheet,
    closeSheet,
    registerSheet,
  } = useHome();

  // Sheet refs
  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);

  // Register refs with HomeProvider so openSheet/closeSheet work
  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
  }, [registerSheet]);

  // Queue for chaining sheets (close one → open next)
  const nextSheetRef = useRef<ActiveSheet | null>(null);

  const onSheetClosed = useCallback(
    (sheetRef: RefObject<BottomSheet | null>) => () => {
      const next = nextSheetRef.current;
      nextSheetRef.current = null;
      sheetRef.current?.close();
      if (next) {
        openSheet(next);
      }
    },
    [openSheet]
  );

  // Task creation flow state
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  const handleTaskConfirmed = useCallback((title: string) => {
    setPendingTaskTitle(title);
    nextSheetRef.current = "selectDay";
    addSheetRef.current?.close();
  }, []);

  const handleDaySelected = useCallback((day: string) => {
    if (day === "custom") {
      setShowCustomDay(true);
      return;
    }
    setSelectedDay(day);
    setShowCustomDay(false);
    nextSheetRef.current = "selectTime";
    daySheetRef.current?.close();
  }, []);

  const handleTimeSelected = useCallback(
    async (time: string) => {
      if (time === "custom") {
        setShowCustomTime(true);
        return;
      }
      closeSheet();
      await createTask({
        title: pendingTaskTitle,
        difficulty: moodLevel,
        dueDate: selectedDay || undefined,
        dueTime: time,
      });
      setPendingTaskTitle("");
      setSelectedDay("");
    },
    [closeSheet, createTask, pendingTaskTitle, moodLevel, selectedDay]
  );

  return (
    <>
      <AddTaskSheet
        ref={addSheetRef}
        onConfirm={handleTaskConfirmed}
        onMicPress={() => {
          nextSheetRef.current = "recording";
          addSheetRef.current?.close();
        }}
        onClose={onSheetClosed(addSheetRef)}
      />
      <RecordingSheet
        ref={recordingSheetRef}
        onStop={(text) => {
          if (text) setPendingTaskTitle(text);
          nextSheetRef.current = "selectDay";
          recordingSheetRef.current?.close();
        }}
        onClose={onSheetClosed(recordingSheetRef)}
      />
      <SelectDaySheet
        ref={daySheetRef}
        onSelect={handleDaySelected}
        onClose={onSheetClosed(daySheetRef)}
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
        onDelete={(id) => deleteTask(id)}
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        settings={settings}
        onUpdate={updateSetting}
        onClose={closeSheet}
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/SheetManager.tsx
git commit -m "feat(mobile): add SheetManager component for bottom sheets and task creation flow"
```

---

### Task 4: Create `HomeScreen.tsx` — composition wrapper

**Files:**
- Create: `apps/mobile/src/components/home/HomeScreen.tsx`

**Step 1: Create the component**

```tsx
// apps/mobile/src/components/home/HomeScreen.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";

export function HomeScreen() {
  return (
    <HomeProvider>
      <SafeAreaView className="flex-1 bg-[#f5f7fa]">
        <MainContent />
        <SheetManager />
      </SafeAreaView>
    </HomeProvider>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/HomeScreen.tsx
git commit -m "feat(mobile): add HomeScreen composition wrapper"
```

---

### Task 5: Rewrite `index.tsx` as session gate + simplify `convexClient.ts`

**Files:**
- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/src/lib/convexClient.ts`

**Step 1: Rewrite index.tsx as session gate**

```tsx
// apps/mobile/app/index.tsx
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { authClient } from "../src/lib/authClient";
import { HomeScreen } from "../src/components/home/HomeScreen";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e) =>
        console.error("[index] sign-in error:", e)
      );
    }
  }, [session, isPending]);

  // Show loader until session is ready — Convex queries won't mount until then
  if (isPending || !session) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return <HomeScreen />;
}
```

**Step 2: Simplify convexClient.ts — remove pre-fetch logic, keep simple fetchAccessToken**

The session gate in `index.tsx` prevents Convex queries from mounting before auth is ready, so the complex pre-fetch/tokenReady logic is no longer needed.

```ts
// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const CONVEX_TOKEN_URL = `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`;

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session?.session?.token) return null;
      try {
        const res = await fetch(CONVEX_TOKEN_URL, {
          headers: { Authorization: `Bearer ${session.session.token}` },
        });
        const data = await res.json();
        return data.token ?? null;
      } catch (e) {
        console.error("[fetchAccessToken] error:", e);
        return null;
      }
    },
    [session]
  );

  return {
    isLoading: isPending,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}
```

**Step 3: Verify the app loads and no `Unauthenticated` error appears**

Run: Start the Expo dev server, open the app on device/emulator. Confirm:
- Loader appears briefly on cold start
- Home screen renders with no `Unauthenticated` console errors
- Tasks load, AI pick works, sheets open/close, task creation flow works

**Step 4: Commit**

```bash
git add apps/mobile/app/index.tsx apps/mobile/src/lib/convexClient.ts
git commit -m "feat(mobile): session gate in index.tsx, simplify convexClient

index.tsx now checks for a valid session before rendering HomeScreen.
This prevents Convex queries from mounting before auth is ready,
eliminating the Unauthenticated race condition at the source."
```

---

### Task 6: Create barrel export + cleanup

**Files:**
- Create: `apps/mobile/src/components/home/index.ts`

**Step 1: Add barrel export**

```ts
// apps/mobile/src/components/home/index.ts
export { HomeScreen } from "./HomeScreen";
export { HomeProvider, useHome } from "./HomeProvider";
```

**Step 2: Update index.tsx import to use barrel**

In `apps/mobile/app/index.tsx`, change:
```ts
import { HomeScreen } from "../src/components/home/HomeScreen";
```
to:
```ts
import { HomeScreen } from "../src/components/home";
```

**Step 3: Commit**

```bash
git add apps/mobile/src/components/home/index.ts apps/mobile/app/index.tsx
git commit -m "chore(mobile): add barrel export for home components"
```

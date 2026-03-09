# Tech Debt Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all dead code, dead state, and dead exports across the ADHD Planner codebase, then refactor SheetManager from 8 useState calls into a clean useReducer pattern.

**Architecture:** Work in three phases: (1) safe deletions of dead code that have zero behavioral impact, (2) refactor SheetManager state management into useReducer, (3) fix useEffect anti-patterns. Each phase has its own commit. The codebase uses Convex for backend, React Native / Expo for mobile, with bottom sheet navigation managed via refs.

**Tech Stack:** React Native, Expo, Convex, TypeScript, react-native-reanimated, @gorhom/bottom-sheet

**Reference:** `docs/tech-debt.md` for full analysis.

---

## Phase 1: Dead Code Removal (safe deletions)

### Task 1: Remove dead exports from useSpeechRecognition

**Files:**
- Modify: `apps/mobile/src/hooks/useSpeechRecognition.ts`
- Modify: `apps/mobile/src/components/sheets/RecordingSheet.tsx`

**Step 1: Remove `append`, `error`, and `SpeechState` export from useSpeechRecognition**

In `apps/mobile/src/hooks/useSpeechRecognition.ts`, make these changes:

1. Remove the exported type on line 3:
```ts
// DELETE: export type SpeechState = "idle" | "listening" | "stopped" | "error";
```
Keep it as a non-exported type since it's used internally:
```ts
type SpeechState = "idle" | "listening" | "stopped" | "error";
```

2. Remove `append` from the interface (line 12) and its implementation (lines 54-56):
```ts
// DELETE from interface:
//   append: () => Promise<void>;

// DELETE from implementation:
//   const append = useCallback(async () => {
//     setState("listening");
//   }, []);
```

3. Remove `error` from the interface (line 13) and from the return (line 58):
```ts
// DELETE from interface:
//   error: string | null;

// DELETE from return:
//   error: null
```

The final return should be:
```ts
return { state, transcript, volume, start, stop, cancel };
```

**Step 2: Remove dead error handling from RecordingSheet**

In `apps/mobile/src/components/sheets/RecordingSheet.tsx`:

1. Remove `error` from the destructured hook result (line 106):
```ts
// BEFORE:
const { state, transcript, volume, start, stop, cancel, error } = useSpeechRecognition();
// AFTER:
const { state, transcript, volume, start, stop, cancel } = useSpeechRecognition();
```

2. Remove the entire dead `useEffect` block (lines 126-147):
```ts
// DELETE this entire block:
// Handle permission errors
useEffect(() => {
  if (error === "permissions_denied") {
    Alert.alert(
      "Microphone Access Required",
      ...
    );
  }
}, [error]);
```

3. Remove the dead `showRetry` variable and its JSX (lines 161-163 and 208-212):
```ts
// DELETE:
const showRetry = state === "error" && error !== "permissions_denied";

// DELETE JSX block:
{showRetry && (
  <Text className="text-sm text-[#f87171] mb-2 text-center">
    Couldn't catch that. Tap the mic to try again.
  </Text>
)}
```

4. Clean up unused imports — remove `Alert`, `Linking`, `Platform` from the `react-native` import (line 2) since they are only used by the deleted code. Keep `View` and `Text`.

**Step 3: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useSpeechRecognition.ts apps/mobile/src/components/sheets/RecordingSheet.tsx
git commit -m "chore: remove dead error/append from useSpeechRecognition and RecordingSheet"
```

---

### Task 2: Remove dead exports from springs, moodLabels, useTasks, usePreferences

**Files:**
- Modify: `apps/mobile/src/animations/springs.ts`
- Modify: `apps/mobile/src/lib/moodLabels.ts`
- Modify: `apps/mobile/src/hooks/useTasks.ts`
- Modify: `apps/mobile/src/hooks/usePreferences.ts`
- Delete: `apps/mobile/src/components/home/index.ts`

**Step 1: Remove unused animation constants from springs.ts**

In `apps/mobile/src/animations/springs.ts`, delete `SPRING_DEFAULT` (lines 3-6, identical to `SPRING_BOUNCY`), `SPRING_XP_BAR` (lines 13-16), `TIMING_FAST` (line 18), `TIMING_NORMAL` (line 19), `TIMING_SLOW` (line 20).

Also remove the `WithTimingConfig` import since no timing constants remain.

Final file:
```ts
import { WithSpringConfig } from "react-native-reanimated";

export const SPRING_BOUNCY: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
};
```

**Step 2: Remove unused type exports from moodLabels.ts**

In `apps/mobile/src/lib/moodLabels.ts`, remove the `export` keyword from `MoodLabel` and `DifficultyLabel` types (they are used as return types within the file but never imported externally):

```ts
// BEFORE:
export type MoodLabel = ...
export type DifficultyLabel = ...

// AFTER:
type MoodLabel = ...
type DifficultyLabel = ...
```

**Step 3: Remove unused `CreateTaskInput` type from useTasks.ts**

In `apps/mobile/src/hooks/useTasks.ts`, delete lines 5-10:
```ts
// DELETE:
export type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate: string;
  dueTime: string;
};
```

**Step 4: Remove unused `usePreferences` hook from usePreferences.ts**

In `apps/mobile/src/hooks/usePreferences.ts`, delete lines 4-6:
```ts
// DELETE:
export function usePreferences() {
  return useQuery(api.preferences.get);
}
```

**Step 5: Delete unused barrel export file**

Delete `apps/mobile/src/components/home/index.ts` — the re-exports `HomeProvider` and `useHome` are never imported via this barrel. Consumers import directly from `HomeProvider.tsx`.

**Step 6: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git rm apps/mobile/src/components/home/index.ts
git add apps/mobile/src/animations/springs.ts apps/mobile/src/lib/moodLabels.ts apps/mobile/src/hooks/useTasks.ts apps/mobile/src/hooks/usePreferences.ts
git commit -m "chore: remove dead exports from springs, moodLabels, useTasks, usePreferences, barrel"
```

---

### Task 3: Remove dead backend functions

**Files:**
- Modify: `apps/convex/convex/settings.ts`
- Modify: `apps/convex/convex/ai.ts`
- Modify: `apps/convex/convex/lib/validation.ts`

**Step 1: Delete `setSttSettings` mutation from settings.ts**

In `apps/convex/convex/settings.ts`, delete lines 42-78 (the entire `setSttSettings` export) and remove `MAX_STT_MODEL`, `MAX_STT_LOCALE` from the import on line 3.

Final import line:
```ts
import { assertMaxLength } from "./lib/validation";
```

Wait — `assertMaxLength` is only used inside the deleted function. Check if `setUserAiEnabled` uses it. It does NOT. So remove the entire import of validation utils:

```ts
// BEFORE:
import { assertMaxLength, MAX_STT_MODEL, MAX_STT_LOCALE } from "./lib/validation";

// AFTER: (delete the entire import line)
```

**Step 2: Delete `getStaleScoringTasks` from ai.ts**

In `apps/convex/convex/ai.ts`, delete lines 195-204 (the entire `getStaleScoringTasks` export).

**Step 3: Remove `MAX_STT_MODEL` and `MAX_STT_LOCALE` from validation.ts**

In `apps/convex/convex/lib/validation.ts`, delete lines 7-8:
```ts
// DELETE:
export const MAX_STT_MODEL = 50;
export const MAX_STT_LOCALE = 10;
```

**Step 4: Regenerate Convex types**

Run: `cd apps/convex && npx convex dev --once`
Expected: Convex functions re-generated without the deleted functions

**Step 5: Verify backend compiles**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/convex/convex/settings.ts apps/convex/convex/ai.ts apps/convex/convex/lib/validation.ts apps/convex/convex/_generated/
git commit -m "chore: remove dead backend functions setSttSettings, getStaleScoringTasks"
```

---

### Task 4: Remove dead `onEdit` no-op from AllTasksSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/AllTasksSheet.tsx`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Remove `onEdit` from AllTasksSheet interface and component**

In `apps/mobile/src/components/sheets/AllTasksSheet.tsx`:

1. Remove `onEdit` from `TaskItemProps` interface (line 16):
```ts
// BEFORE:
interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

// AFTER:
interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
}
```

2. Remove `onEdit` from `TaskItem` destructuring (line 20) and remove the edit button (lines 37-41):
```ts
// BEFORE:
function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  ...
  <View className="flex-row gap-2">
    <Pressable
      onPress={() => onEdit(task)}
      className="w-8 h-8 rounded-full items-center justify-center"
    >
      <Ionicons name="create-outline" size={20} color="#364153" />
    </Pressable>
    <Pressable ...

// AFTER:
function TaskItem({ task, onDelete }: TaskItemProps) {
  ...
  <View className="flex-row gap-2">
    <Pressable
```

Just remove the edit Pressable entirely (lines 37-41). Keep the delete button.

3. Remove `onEdit` from the `Props` interface (line 57):
```ts
// BEFORE:
interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// AFTER:
interface Props {
  tasks: Task[];
  onDelete: (id: string) => void;
  onClose: () => void;
}
```

4. Remove `onEdit` from the component destructuring (line 63) and from `TaskItem` usage (line 82):
```ts
// BEFORE:
({ tasks, onEdit, onDelete, onClose }, ref) => {
  ...
  <TaskItem key={task._id} task={task} onEdit={onEdit} onDelete={onDelete} />

// AFTER:
({ tasks, onDelete, onClose }, ref) => {
  ...
  <TaskItem key={task._id} task={task} onDelete={onDelete} />
```

**Step 2: Remove `onEdit` prop from SheetManager**

In `apps/mobile/src/components/home/SheetManager.tsx`, remove line 271:
```ts
// BEFORE:
<AllTasksSheet
  ref={allTasksSheetRef}
  tasks={tasks}
  onEdit={() => {}}
  onDelete={(id) => deleteTask(id)}
  onClose={closeSheet}
/>

// AFTER:
<AllTasksSheet
  ref={allTasksSheetRef}
  tasks={tasks}
  onDelete={(id) => deleteTask(id)}
  onClose={closeSheet}
/>
```

**Step 3: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/AllTasksSheet.tsx apps/mobile/src/components/home/SheetManager.tsx
git commit -m "chore: remove dead onEdit no-op callback from AllTasksSheet"
```

---

## Phase 2: SheetManager Refactor

### Task 5: Extract useSheetFlow reducer from SheetManager

This is the core refactor. We replace 8 `useState` calls with a single `useReducer` and extract it to a dedicated hook. We also remove the dead `customDay`/`customTime` state (the custom input values are tracked by the sheet components themselves via `onCustomChange`, but SheetManager never reads them back for task creation — so they are dead write-only state).

**Important decision:** The custom day/time inputs in SelectDaySheet/SelectTimeSheet call `onSelect(customValue.trim())` when submitted. This passes the raw user text (e.g., "March 15") through `daySelectionToDate()` / `timeSelectionToTime()` in SheetManager. So the custom VALUE flows through `onSelect` — not through `customValue` state. The `customValue` state is only needed as controlled input state for the TextInput inside the sheet. We keep that controlled input state INSIDE the sheet components by making them own it, removing it from SheetManager entirely.

**Files:**
- Create: `apps/mobile/src/hooks/useSheetFlow.ts`
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`
- Modify: `apps/mobile/src/components/sheets/SelectDaySheet.tsx`
- Modify: `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`

**Step 1: Make SelectDaySheet own its custom input state**

In `apps/mobile/src/components/sheets/SelectDaySheet.tsx`:

1. Replace external `customValue`/`onCustomChange`/`showCustomInput` props with internal state:

```ts
import { forwardRef, useState } from "react";
// ... other imports stay the same

interface Props {
  onSelect: (day: string) => void;
  onClose: () => void;
}

export const SelectDaySheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose }, ref) => {
    const [customValue, setCustomValue] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const handleSelect = (day: string) => {
      if (day === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      onSelect(day);
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        onSelect(customValue.trim());
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["28%", "40%"]}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">When is this due?</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="Today" colors={DAY_GRADIENTS[0]} onPress={() => handleSelect("today")} />
              <GradientOption label="Tomorrow" colors={DAY_GRADIENTS[1]} onPress={() => handleSelect("tomorrow")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="End of Week" colors={DAY_GRADIENTS[2]} onPress={() => handleSelect("end_of_week")} />
              <GradientOption label="Custom" colors={DAY_GRADIENTS[3]} onPress={() => handleSelect("custom")} />
            </View>
            {showCustomInput && (
              <View className="flex-row items-center gap-2 mt-1">
                <BottomSheetTextInput
                  className="flex-1 border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939]"
                  placeholder="e.g. March 15"
                  placeholderTextColor="#99a1af"
                  value={customValue}
                  onChangeText={setCustomValue}
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSubmit}
                />
                <Pressable
                  onPress={handleCustomSubmit}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#a2d2ff", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 2: Make SelectTimeSheet own its custom input state**

Apply the same pattern to `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`:

```ts
import { forwardRef, useState } from "react";
// ... other imports stay the same

interface Props {
  onSelect: (time: string) => void;
  onClose: () => void;
}

export const SelectTimeSheet = forwardRef<BottomSheet, Props>(
  ({ onSelect, onClose }, ref) => {
    const [customValue, setCustomValue] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const handleSelect = (time: string) => {
      if (time === "custom") {
        setShowCustomInput(true);
        return;
      }
      setShowCustomInput(false);
      setCustomValue("");
      onSelect(time);
    };

    const handleCustomSubmit = () => {
      if (customValue.trim()) {
        setShowCustomInput(false);
        onSelect(customValue.trim());
        setCustomValue("");
      }
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["28%", "40%"]}
        enablePanDownToClose
        onClose={onClose}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">What time?</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
              <Ionicons name="close" size={24} color="#364153" />
            </Pressable>
          </View>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <GradientOption label="By Noon" colors={["#bde0fe", "#a2d2ff"]} onPress={() => handleSelect("noon")} />
              <GradientOption label="By Afternoon" colors={["#a2d2ff", "#cdb4db"]} onPress={() => handleSelect("afternoon")} />
            </View>
            <View className="flex-row gap-3">
              <GradientOption label="By End of Day" colors={["#cdb4db", "#ffc8dd"]} onPress={() => handleSelect("end_of_day")} />
              <GradientOption label="Custom" colors={["#ffc8dd", "#ffafcc"]} onPress={() => handleSelect("custom")} />
            </View>
            {showCustomInput && (
              <View className="flex-row items-center gap-2 mt-1">
                <BottomSheetTextInput
                  className="flex-1 border border-[#e5e7eb] rounded-3xl px-4 py-3 text-base text-[#1e2939]"
                  placeholder="e.g. 14:30"
                  placeholderTextColor="#99a1af"
                  value={customValue}
                  onChangeText={setCustomValue}
                  returnKeyType="done"
                  onSubmitEditing={handleCustomSubmit}
                />
                <Pressable
                  onPress={handleCustomSubmit}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#a2d2ff", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);
```

**Step 3: Create the useSheetFlow hook**

Create `apps/mobile/src/hooks/useSheetFlow.ts`:

```ts
import { useReducer, useCallback } from "react";
import type { PendingTask } from "../components/sheets/TaskSummarySheet";

interface SheetFlowState {
  pendingTaskTitle: string;
  selectedDay: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
}

type SheetFlowAction =
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_DAY"; day: string }
  | { type: "SET_PENDING_TASKS"; tasks: PendingTask[] }
  | { type: "UPDATE_PENDING_TASKS"; updater: (tasks: PendingTask[]) => PendingTask[] }
  | { type: "SET_EDITING_TASK"; taskId: string | null }
  | { type: "RESET" };

const initialState: SheetFlowState = {
  pendingTaskTitle: "",
  selectedDay: "",
  pendingTasks: [],
  editingTaskId: null,
};

function reducer(state: SheetFlowState, action: SheetFlowAction): SheetFlowState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, pendingTaskTitle: action.title };
    case "SET_DAY":
      return { ...state, selectedDay: action.day };
    case "SET_PENDING_TASKS":
      return { ...state, pendingTasks: action.tasks };
    case "UPDATE_PENDING_TASKS":
      return { ...state, pendingTasks: action.updater(state.pendingTasks) };
    case "SET_EDITING_TASK":
      return { ...state, editingTaskId: action.taskId };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useSheetFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setTitle = useCallback((title: string) => {
    dispatch({ type: "SET_TITLE", title });
  }, []);

  const setDay = useCallback((day: string) => {
    dispatch({ type: "SET_DAY", day });
  }, []);

  const setPendingTasks = useCallback((tasks: PendingTask[]) => {
    dispatch({ type: "SET_PENDING_TASKS", tasks });
  }, []);

  const updatePendingTasks = useCallback((updater: (tasks: PendingTask[]) => PendingTask[]) => {
    dispatch({ type: "UPDATE_PENDING_TASKS", updater });
  }, []);

  const setEditingTask = useCallback((taskId: string | null) => {
    dispatch({ type: "SET_EDITING_TASK", taskId });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    ...state,
    setTitle,
    setDay,
    setPendingTasks,
    updatePendingTasks,
    setEditingTask,
    reset,
  };
}
```

**Step 4: Rewrite SheetManager to use useSheetFlow**

Replace `apps/mobile/src/components/home/SheetManager.tsx` with:

```ts
// apps/mobile/src/components/home/SheetManager.tsx
import { useRef, useCallback, useEffect, type RefObject } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { TaskSummarySheet, type PendingTask } from "../sheets/TaskSummarySheet";
import { useHome, type ActiveSheet } from "./HomeProvider";
import { daySelectionToDate, timeSelectionToTime } from "../../lib/dateTimeConvert";
import { splitTranscription } from "../../lib/taskSplitter";
import { getLocales } from "react-native-localize";
import { useSheetFlow } from "../../hooks/useSheetFlow";

let nextId = 0;
function genId() {
  return `pending-${++nextId}`;
}

function getDeviceLocale(): string {
  try {
    const locales = getLocales();
    return locales[0]?.languageCode ?? "en";
  } catch {
    return "en";
  }
}

export function SheetManager() {
  const {
    tasks,
    settings,
    adminAiEnabled,
    createTask,
    deleteTask,
    updateSetting,
    openSheet,
    closeSheet,
    registerSheet,
  } = useHome();

  const flow = useSheetFlow();

  // Sheet refs
  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);

  // Register refs with HomeProvider so openSheet/closeSheet work
  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
  }, [registerSheet]);

  // Queue for chaining sheets (close one -> open next)
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

  // When recording produces text, decide single vs multi flow
  const handleRecordingStop = useCallback(
    (text: string) => {
      if (!text.trim()) {
        nextSheetRef.current = null;
        recordingSheetRef.current?.close();
        return;
      }

      const locale = getDeviceLocale();
      const splitTasks = splitTranscription(text, locale);

      if (splitTasks.length <= 1) {
        flow.setTitle(splitTasks[0] || text);
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      } else {
        const pending: PendingTask[] = splitTasks.map((title) => ({
          id: genId(),
          title,
          dueDate: "",
          dueTime: "",
        }));
        flow.setPendingTasks(pending);
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      }
    },
    [flow]
  );

  const handleTaskConfirmed = useCallback((title: string) => {
    flow.setTitle(title);
    nextSheetRef.current = "selectDay";
    addSheetRef.current?.close();
  }, [flow]);

  const handleDaySelected = useCallback((day: string) => {
    const dateStr = daySelectionToDate(day);

    if (flow.editingTaskId) {
      flow.updatePendingTasks((prev) =>
        prev.map((t) => (t.id === flow.editingTaskId ? { ...t, dueDate: dateStr } : t))
      );
      flow.setEditingTask(null);
      nextSheetRef.current = "taskSummary";
      daySheetRef.current?.close();
    } else if (flow.pendingTasks.length > 0) {
      flow.updatePendingTasks((prev) => prev.map((t) => ({ ...t, dueDate: dateStr })));
      flow.setDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    } else {
      flow.setDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    }
  }, [flow]);

  const handleTimeSelected = useCallback(
    async (time: string) => {
      const timeStr = timeSelectionToTime(time);

      if (flow.editingTaskId) {
        flow.updatePendingTasks((prev) =>
          prev.map((t) => (t.id === flow.editingTaskId ? { ...t, dueTime: timeStr } : t))
        );
        flow.setEditingTask(null);
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else if (flow.pendingTasks.length > 0) {
        flow.updatePendingTasks((prev) => prev.map((t) => ({ ...t, dueTime: timeStr })));
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else {
        closeSheet();
        await createTask({
          title: flow.pendingTaskTitle,
          dueDate: flow.selectedDay,
          dueTime: timeStr,
        });
        flow.reset();
      }
    },
    [closeSheet, createTask, flow]
  );

  const handleEditDateTime = useCallback(
    (taskId: string, field: "dueDate" | "dueTime") => {
      flow.setEditingTask(taskId);
      nextSheetRef.current = field === "dueDate" ? "selectDay" : "selectTime";
      taskSummaryRef.current?.close();
    },
    [flow]
  );

  const handleCreateAll = useCallback(
    async (tasksToCreate: PendingTask[]) => {
      closeSheet();
      for (const task of tasksToCreate) {
        await createTask({
          title: task.title,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
        });
      }
      flow.reset();
    },
    [closeSheet, createTask, flow]
  );

  const handleSummaryClose = useCallback(() => {
    flow.reset();
    closeSheet();
  }, [closeSheet, flow]);

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
        onStop={handleRecordingStop}
        onClose={onSheetClosed(recordingSheetRef)}
      />
      <SelectDaySheet
        ref={daySheetRef}
        onSelect={handleDaySelected}
        onClose={onSheetClosed(daySheetRef)}
      />
      <SelectTimeSheet
        ref={timeSheetRef}
        onSelect={handleTimeSelected}
        onClose={closeSheet}
      />
      <TaskSummarySheet
        ref={taskSummaryRef}
        tasks={flow.pendingTasks}
        onTasksChange={flow.setPendingTasks}
        onCreateAll={handleCreateAll}
        onEditDateTime={handleEditDateTime}
        onClose={handleSummaryClose}
      />
      <AllTasksSheet
        ref={allTasksSheetRef}
        tasks={tasks}
        onDelete={(id) => deleteTask(id)}
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        settings={settings}
        onUpdate={updateSetting}
        onClose={closeSheet}
        adminAiEnabled={adminAiEnabled}
      />
    </>
  );
}
```

**Step 5: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 6: Manually test the flows**

Test these scenarios on a device/simulator:
1. **Single task flow:** Tap add -> type title -> confirm -> select day -> select time -> task created
2. **Multi task flow:** Tap mic -> speak multiple tasks -> select day -> select time -> summary -> create all
3. **Custom day/time:** Tap add -> confirm -> select "Custom" day -> type date -> submit -> select "Custom" time -> type time -> submit -> task created
4. **Edit in summary:** Multi-task flow -> summary -> tap date pill -> change day -> returns to summary

**Step 7: Commit**

```bash
git add apps/mobile/src/hooks/useSheetFlow.ts apps/mobile/src/components/home/SheetManager.tsx apps/mobile/src/components/sheets/SelectDaySheet.tsx apps/mobile/src/components/sheets/SelectTimeSheet.tsx
git commit -m "refactor: replace 8 useState with useReducer in SheetManager, internalize custom input state"
```

---

## Phase 3: Fix useEffect Anti-Patterns

### Task 6: Fix useSettings async effect and RecordingSheet ref sync

**Files:**
- Modify: `apps/mobile/src/hooks/useSettings.ts`
- Modify: `apps/mobile/src/components/sheets/RecordingSheet.tsx`

**Step 1: Add error handling and unmount guard to useSettings**

In `apps/mobile/src/hooks/useSettings.ts`, replace lines 34-48:

```ts
// BEFORE:
useEffect(() => {
  Promise.all([
    AsyncStorage.getItem(LOCAL_KEY),
    Notifications.getPermissionsAsync(),
  ]).then(([raw, { status }]) => {
    const stored = raw ? JSON.parse(raw) : {};
    setLocalSettings({
      notificationsDesired: stored.notificationsDesired ?? true,
      notificationsGranted: status === "granted",
      soundEffects: stored.soundEffects ?? true,
      sttModel: stored.sttModel ?? "default",
    });
  });
}, []);

// AFTER:
useEffect(() => {
  let mounted = true;
  Promise.all([
    AsyncStorage.getItem(LOCAL_KEY),
    Notifications.getPermissionsAsync(),
  ]).then(([raw, { status }]) => {
    if (!mounted) return;
    const stored = raw ? JSON.parse(raw) : {};
    setLocalSettings({
      notificationsDesired: stored.notificationsDesired ?? true,
      notificationsGranted: status === "granted",
      soundEffects: stored.soundEffects ?? true,
      sttModel: stored.sttModel ?? "default",
    });
  }).catch(() => {
    // Settings load failure is non-fatal — defaults are already set
  });
  return () => { mounted = false; };
}, []);
```

**Step 2: Replace ref-sync useEffect with inline assignment in RecordingSheet**

In `apps/mobile/src/components/sheets/RecordingSheet.tsx`, in the `ScrollingWaveform` component:

```ts
// BEFORE (lines 39-41):
useEffect(() => {
  volumeRef.current = volume;
}, [volume]);

// AFTER (inline, right after the ref declaration):
volumeRef.current = volume;
```

Also remove `useEffect` from the import on line 1 if it's no longer used (check: the interval effect on line 51 still uses it, so keep it).

**Step 3: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useSettings.ts apps/mobile/src/components/sheets/RecordingSheet.tsx
git commit -m "fix: add error handling to useSettings async effect, inline ref sync in RecordingSheet"
```

---

### Task 7: Extract rate limit constants and fix ProgressBar keys

**Files:**
- Modify: `apps/convex/convex/ai.ts`
- Modify: `apps/mobile/src/components/onboarding/ProgressBar.tsx`

**Step 1: Extract rate limit magic numbers in ai.ts**

At the top of `apps/convex/convex/ai.ts` (after imports), add:

```ts
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SCORES_PER_WINDOW = 10;
```

Then replace the usages in `scoreTaskDifficulty` (lines 75-81):

```ts
// BEFORE:
const oneMinuteAgo = Date.now() - 60_000;
const recentCount = await ctx.runQuery(internal.ai.countRecentScores, {
  userId,
  since: oneMinuteAgo,
});
if (recentCount >= 10) {

// AFTER:
const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
const recentCount = await ctx.runQuery(internal.ai.countRecentScores, {
  userId,
  since: windowStart,
});
if (recentCount >= MAX_SCORES_PER_WINDOW) {
```

**Step 2: Fix array index keys in ProgressBar**

In `apps/mobile/src/components/onboarding/ProgressBar.tsx`, replace index keys with step-based keys:

```ts
// BEFORE:
{Array.from({ length: TOTAL_STEPS }, (_, i) => {
  const filled = i < currentStep;
  return filled ? (
    <LinearGradient key={i} ... />
  ) : (
    <View key={i} ... />
  );
})}

// AFTER:
{Array.from({ length: TOTAL_STEPS }, (_, i) => {
  const filled = i < currentStep;
  return filled ? (
    <LinearGradient key={`step-${i}`} ... />
  ) : (
    <View key={`step-${i}`} ... />
  );
})}
```

Note: For a static-length progress bar that never reorders, index keys are technically safe. But using `step-${i}` silences the lint warning and is clearer about intent.

**Step 3: Verify both apps compile**

Run: `cd apps/mobile && npx tsc --noEmit`
Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/convex/convex/ai.ts apps/mobile/src/components/onboarding/ProgressBar.tsx
git commit -m "chore: extract rate limit constants, fix ProgressBar array index keys"
```

---

## Summary

| Task | What | Files Changed | Risk |
|------|------|---------------|------|
| 1 | Remove dead error/append from speech hook + RecordingSheet | 2 | Low |
| 2 | Remove dead exports from springs, moodLabels, useTasks, usePreferences, barrel | 5 | Low |
| 3 | Remove dead backend functions | 3 | Low |
| 4 | Remove dead onEdit no-op from AllTasksSheet | 2 | Low |
| 5 | SheetManager useReducer refactor + internalize custom input state | 4 (+1 new) | Medium |
| 6 | Fix useSettings async effect + RecordingSheet ref sync | 2 | Low |
| 7 | Extract rate limit constants + fix ProgressBar keys | 2 | Low |

**Total: 7 tasks, 7 commits, ~18 files touched**

### Out of scope (separate plans)
These items from tech-debt.md are intentionally excluded as they are larger migrations:
- `@expo/vector-icons` -> `expo-symbols` (16 files, needs package install + API research)
- Legacy shadow styles -> `boxShadow` (20 occurrences, mechanical but wide-reaching)
- Hardcoded color palette extraction (50 occurrences, 23 files)
- `sign-in.tsx` split (386 lines, separate feature-focused refactor)
- `RecordingSheet.tsx` ScrollingWaveform extraction (low priority)

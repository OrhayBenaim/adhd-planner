# SheetManager Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move business logic out of SheetManager into individual sheets via a new SheetFlowProvider context with step-based `next()` navigation.

**Architecture:** SheetFlowProvider (new context) wraps all sheets inside HomeProvider. It manages multi-step task creation flow state and navigation via `next()`. Each sheet uses `useSheetFlow()` to set data and advance. SheetManager becomes a thin renderer (~40 lines).

**Tech Stack:** React Native, @gorhom/bottom-sheet, Convex, TypeScript

**Design doc:** `docs/plans/2026-03-09-sheet-manager-refactor-design.md`

---

### Task 1: Create SheetFlowProvider

**Files:**
- Create: `apps/mobile/src/components/home/SheetFlowProvider.tsx`

**Step 1: Create the provider with reducer, context, and full API**

The provider uses a `stateRef` pattern: a ref kept in sync with the reducer via `syncDispatch`, so that `next()` always reads the latest state even when called immediately after `setDay()`/`setTime()` in the same synchronous block.

`next()` handles all branching:
- `addTask`/`recording` → `selectDay`
- `selectDay` → if editing: update task, go `taskSummary`. if multi: update all tasks, go `selectTime`. else: go `selectTime`
- `selectTime` → if editing: update task, go `taskSummary`. if multi: update all tasks, go `taskSummary`. else: create single task, reset
- `taskSummary` → create all tasks, reset

Navigation uses `closeSheet()` then `openSheet(nextStep)` from HomeProvider. These are different BottomSheet instances so the close/open animations run in parallel without conflict.

```tsx
import { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from "react";
import { useHome } from "./HomeProvider";

export interface PendingTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
}

type FlowStep = "idle" | "addTask" | "recording" | "selectDay" | "selectTime" | "taskSummary";

interface FlowState {
  step: FlowStep;
  title: string;
  selectedDay: string;
  selectedTime: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
}

type FlowAction =
  | { type: "START"; step: "addTask" | "recording" }
  | { type: "SET_STEP"; step: FlowStep }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_DAY"; day: string }
  | { type: "SET_TIME"; time: string }
  | { type: "SET_PENDING_TASKS"; tasks: PendingTask[] }
  | { type: "UPDATE_PENDING_TASKS"; updater: (tasks: PendingTask[]) => PendingTask[] }
  | { type: "SET_EDITING_TASK"; taskId: string | null }
  | { type: "RESET" };

const initialState: FlowState = {
  step: "idle",
  title: "",
  selectedDay: "",
  selectedTime: "",
  pendingTasks: [],
  editingTaskId: null,
};

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "START":
      return { ...initialState, step: action.step };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_DAY":
      return { ...state, selectedDay: action.day };
    case "SET_TIME":
      return { ...state, selectedTime: action.time };
    case "SET_PENDING_TASKS":
      return { ...state, pendingTasks: action.tasks };
    case "UPDATE_PENDING_TASKS":
      return { ...state, pendingTasks: action.updater(state.pendingTasks) };
    case "SET_EDITING_TASK":
      return { ...state, editingTaskId: action.taskId };
    case "RESET":
      return initialState;
  }
}

interface SheetFlowContextValue {
  // State
  step: FlowStep;
  title: string;
  selectedDay: string;
  selectedTime: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;

  // Data setters
  setTitle: (title: string) => void;
  setDay: (day: string) => void;
  setTime: (time: string) => void;
  setPendingTasks: (tasks: PendingTask[]) => void;
  updatePendingTasks: (updater: (tasks: PendingTask[]) => PendingTask[]) => void;

  // Navigation
  start: (sheet: "addTask" | "recording") => void;
  next: () => Promise<void>;
  editDateTime: (taskId: string, field: "dueDate" | "dueTime") => void;
  reset: () => void;
}

const SheetFlowContext = createContext<SheetFlowContextValue | null>(null);

export function useSheetFlow() {
  const ctx = useContext(SheetFlowContext);
  if (!ctx) throw new Error("useSheetFlow must be used within SheetFlowProvider");
  return ctx;
}

export function SheetFlowProvider({ children }: { children: ReactNode }) {
  const { openSheet, closeSheet, createTask } = useHome();
  const [state, dispatch] = useReducer(flowReducer, initialState);

  // Ref kept in sync so next() reads fresh state after setDay/setTime dispatches
  const stateRef = useRef(state);
  stateRef.current = state;

  const syncDispatch = useCallback((action: FlowAction) => {
    dispatch(action);
    stateRef.current = flowReducer(stateRef.current, action);
  }, []);

  // Data setters
  const setTitle = useCallback((title: string) => syncDispatch({ type: "SET_TITLE", title }), [syncDispatch]);
  const setDay = useCallback((day: string) => syncDispatch({ type: "SET_DAY", day }), [syncDispatch]);
  const setTime = useCallback((time: string) => syncDispatch({ type: "SET_TIME", time }), [syncDispatch]);
  const setPendingTasks = useCallback((tasks: PendingTask[]) => syncDispatch({ type: "SET_PENDING_TASKS", tasks }), [syncDispatch]);
  const updatePendingTasks = useCallback((updater: (tasks: PendingTask[]) => PendingTask[]) => syncDispatch({ type: "UPDATE_PENDING_TASKS", updater }), [syncDispatch]);

  // Navigation
  const start = useCallback((sheet: "addTask" | "recording") => {
    syncDispatch({ type: "START", step: sheet });
    openSheet(sheet);
  }, [syncDispatch, openSheet]);

  const next = useCallback(async () => {
    const s = stateRef.current;
    switch (s.step) {
      case "addTask":
      case "recording":
        syncDispatch({ type: "SET_STEP", step: "selectDay" });
        closeSheet();
        openSheet("selectDay");
        break;

      case "selectDay":
        if (s.editingTaskId) {
          syncDispatch({ type: "UPDATE_PENDING_TASKS", updater: (prev) => prev.map((t) => t.id === s.editingTaskId ? { ...t, dueDate: s.selectedDay } : t) });
          syncDispatch({ type: "SET_EDITING_TASK", taskId: null });
          syncDispatch({ type: "SET_STEP", step: "taskSummary" });
          closeSheet();
          openSheet("taskSummary");
        } else if (s.pendingTasks.length > 0) {
          syncDispatch({ type: "UPDATE_PENDING_TASKS", updater: (prev) => prev.map((t) => ({ ...t, dueDate: s.selectedDay })) });
          syncDispatch({ type: "SET_STEP", step: "selectTime" });
          closeSheet();
          openSheet("selectTime");
        } else {
          syncDispatch({ type: "SET_STEP", step: "selectTime" });
          closeSheet();
          openSheet("selectTime");
        }
        break;

      case "selectTime":
        if (s.editingTaskId) {
          syncDispatch({ type: "UPDATE_PENDING_TASKS", updater: (prev) => prev.map((t) => t.id === s.editingTaskId ? { ...t, dueTime: s.selectedTime } : t) });
          syncDispatch({ type: "SET_EDITING_TASK", taskId: null });
          syncDispatch({ type: "SET_STEP", step: "taskSummary" });
          closeSheet();
          openSheet("taskSummary");
        } else if (s.pendingTasks.length > 0) {
          syncDispatch({ type: "UPDATE_PENDING_TASKS", updater: (prev) => prev.map((t) => ({ ...t, dueTime: s.selectedTime })) });
          syncDispatch({ type: "SET_STEP", step: "taskSummary" });
          closeSheet();
          openSheet("taskSummary");
        } else {
          closeSheet();
          await createTask({ title: s.title, dueDate: s.selectedDay, dueTime: s.selectedTime });
          syncDispatch({ type: "RESET" });
        }
        break;

      case "taskSummary": {
        const tasks = stateRef.current.pendingTasks;
        closeSheet();
        for (const task of tasks) {
          await createTask({ title: task.title, dueDate: task.dueDate, dueTime: task.dueTime });
        }
        syncDispatch({ type: "RESET" });
        break;
      }
    }
  }, [syncDispatch, closeSheet, openSheet, createTask]);

  const editDateTime = useCallback((taskId: string, field: "dueDate" | "dueTime") => {
    syncDispatch({ type: "SET_EDITING_TASK", taskId });
    const sheet = field === "dueDate" ? "selectDay" : "selectTime";
    syncDispatch({ type: "SET_STEP", step: sheet });
    closeSheet();
    openSheet(sheet);
  }, [syncDispatch, closeSheet, openSheet]);

  const reset = useCallback(() => {
    syncDispatch({ type: "RESET" });
    closeSheet();
  }, [syncDispatch, closeSheet]);

  return (
    <SheetFlowContext.Provider value={{
      step: state.step, title: state.title, selectedDay: state.selectedDay, selectedTime: state.selectedTime,
      pendingTasks: state.pendingTasks, editingTaskId: state.editingTaskId,
      setTitle, setDay, setTime, setPendingTasks, updatePendingTasks,
      start, next, editDateTime, reset,
    }}>
      {children}
    </SheetFlowContext.Provider>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors related to SheetFlowProvider (it's not imported yet)

**Step 3: Commit**

```bash
git add apps/mobile/src/components/home/SheetFlowProvider.tsx
git commit -m "feat: add SheetFlowProvider with step-based flow navigation"
```

---

### Task 2: Wire SheetFlowProvider into HomeScreen

**Files:**
- Modify: `apps/mobile/src/components/home/HomeScreen.tsx`

**Step 1: Add SheetFlowProvider wrapper inside HomeProvider**

```tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetFlowProvider } from "./SheetFlowProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";

export function HomeScreen() {
  return (
    <HomeProvider>
      <SheetFlowProvider>
        <SafeAreaView className="flex-1 bg-[#f5f7fa]">
          <MainContent />
          <SheetManager />
        </SafeAreaView>
      </SheetFlowProvider>
    </HomeProvider>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/HomeScreen.tsx
git commit -m "feat: wire SheetFlowProvider into HomeScreen"
```

---

### Task 3: Update MainContent to use flow.start()

**Files:**
- Modify: `apps/mobile/src/components/home/MainContent.tsx`

**Step 1: Import useSheetFlow and replace openSheet("addTask") with flow.start("addTask")**

Add import:
```tsx
import { useSheetFlow } from "./SheetFlowProvider";
```

Inside `MainContent`, add:
```tsx
const flow = useSheetFlow();
```

Change BottomNav from:
```tsx
onAddPress={() => openSheet("addTask")}
```
to:
```tsx
onAddPress={() => flow.start("addTask")}
```

`openSheet("allTasks")` and `openSheet("settings")` stay unchanged — they're not part of the flow.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/MainContent.tsx
git commit -m "refactor: MainContent uses flow.start for addTask"
```

---

### Task 4: Refactor AllTasksSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/AllTasksSheet.tsx`

**Step 1: Remove data/callback props, use useHome() directly**

Remove `tasks` and `onDelete` from Props interface (keep only `onClose`):
```tsx
interface Props {
  onClose: () => void;
}
```

Add import and hook call:
```tsx
import { useHome } from "../home/HomeProvider";

// Inside the component:
const { tasks, deleteTask } = useHome();
```

Update the forwardRef signature and destructuring:
```tsx
export const AllTasksSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { tasks, deleteTask } = useHome();
    // ...
```

Replace `onDelete` usage with `deleteTask`:
```tsx
<TaskItem key={task._id} task={task} onDelete={deleteTask} />
```

Also update `TaskItemProps` — change `onDelete: (id: string) => void` to `onDelete: (id: string) => Promise<void>` (since `deleteTask` is async) or just use `(id: string) => void` since we don't await it.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/AllTasksSheet.tsx
git commit -m "refactor: AllTasksSheet uses useHome() directly"
```

---

### Task 5: Refactor SettingsSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SettingsSheet.tsx`

**Step 1: Remove all data/callback props, use useHome() directly**

Change Props to only `onClose`:
```tsx
interface Props {
  onClose: () => void;
}
```

Add import and hook:
```tsx
import { useHome } from "../home/HomeProvider";

// Inside component:
const { settings, updateSetting, adminAiEnabled } = useHome();
```

Update forwardRef:
```tsx
export const SettingsSheet = forwardRef<BottomSheet, Props>(
  ({ onClose }, ref) => {
    const { settings, updateSetting, adminAiEnabled } = useHome();
    // ... rest unchanged
```

Remove `import type { Settings } from "../../hooks/useSettings"` — it's no longer needed as a prop type. The `SettingRow` onChange callbacks use `updateSetting` directly, which is already typed via `SettingsEntry`.

Note: there's a typo in SettingsSheet.tsx — `Iconicons` on the close button should be `Ionicons`. Fix if present.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/SettingsSheet.tsx
git commit -m "refactor: SettingsSheet uses useHome() directly"
```

---

### Task 6: Refactor AddTaskSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/AddTaskSheet.tsx`

**Step 1: Remove onConfirm/onMicPress props, use useSheetFlow()**

Change Props:
```tsx
interface Props {
  onClose: () => void;
}
```

Add import and hook:
```tsx
import { useSheetFlow } from "../home/SheetFlowProvider";

// Inside component:
const flow = useSheetFlow();
```

Update `handleConfirm`:
```tsx
const handleConfirm = () => {
  if (!text.trim()) return;
  Keyboard.dismiss();
  flow.setTitle(text.trim());
  flow.next();
  setText("");
};
```

Update mic button `onPress`:
```tsx
onPress={() => flow.start("recording")}
```

Update close button `onPress`:
```tsx
onPress={() => flow.reset()}
```

Update forwardRef to remove `onConfirm` and `onMicPress` from destructuring.

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/AddTaskSheet.tsx
git commit -m "refactor: AddTaskSheet uses useSheetFlow()"
```

---

### Task 7: Refactor RecordingSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/RecordingSheet.tsx`

**Step 1: Remove onStop prop, move logic from SheetManager, use useSheetFlow()**

Add imports:
```tsx
import { useSheetFlow, type PendingTask } from "../home/SheetFlowProvider";
import { splitTranscription } from "../../lib/taskSplitter";
import { getLocales } from "react-native-localize";
```

Add helpers (moved from SheetManager):
```tsx
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
```

Change Props:
```tsx
interface Props {
  onClose: () => void;
}
```

Inside component:
```tsx
const flow = useSheetFlow();
```

Update `handleConfirm` (was `onStop` callback):
```tsx
const handleConfirm = () => {
  stop();
  const text = transcript.trim();
  if (!text) return;

  const locale = getDeviceLocale();
  const splitTasks = splitTranscription(text, locale);

  if (splitTasks.length <= 1) {
    flow.setTitle(splitTasks[0] || text);
  } else {
    const pending: PendingTask[] = splitTasks.map((title) => ({
      id: genId(),
      title,
      dueDate: "",
      dueTime: "",
    }));
    flow.setPendingTasks(pending);
  }
  flow.next();
};
```

Update `handleStop` (cancel/dismiss):
```tsx
const handleStop = () => {
  cancel();
  flow.reset();
};
```

Update `onClose` on BottomSheet:
```tsx
onClose={() => {
  cancel();
  onClose();
}}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/RecordingSheet.tsx
git commit -m "refactor: RecordingSheet owns transcription logic, uses useSheetFlow()"
```

---

### Task 8: Refactor SelectDaySheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SelectDaySheet.tsx`

**Step 1: Remove onSelect prop, use useSheetFlow()**

Add imports:
```tsx
import { useSheetFlow } from "../home/SheetFlowProvider";
import { daySelectionToDate } from "../../lib/dateTimeConvert";
```

Change Props:
```tsx
interface Props {
  onClose: () => void;
}
```

Inside component:
```tsx
const flow = useSheetFlow();
```

Update `handleSelect`:
```tsx
const handleSelect = (day: string) => {
  if (day === "custom") {
    setShowCustomInput(true);
    return;
  }
  setShowCustomInput(false);
  setCustomValue("");
  const dateStr = daySelectionToDate(day);
  flow.setDay(dateStr);
  flow.next();
};
```

Update `handleCustomSubmit`:
```tsx
const handleCustomSubmit = () => {
  if (customValue.trim()) {
    setShowCustomInput(false);
    const dateStr = daySelectionToDate(customValue.trim());
    flow.setDay(dateStr);
    flow.next();
    setCustomValue("");
  }
};
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/SelectDaySheet.tsx
git commit -m "refactor: SelectDaySheet owns date conversion, uses useSheetFlow()"
```

---

### Task 9: Refactor SelectTimeSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`

**Step 1: Remove onSelect prop, use useSheetFlow()**

Add imports:
```tsx
import { useSheetFlow } from "../home/SheetFlowProvider";
import { timeSelectionToTime } from "../../lib/dateTimeConvert";
```

Change Props:
```tsx
interface Props {
  onClose: () => void;
}
```

Inside component:
```tsx
const flow = useSheetFlow();
```

Update `handleSelect`:
```tsx
const handleSelect = (time: string) => {
  if (time === "custom") {
    setShowCustomInput(true);
    return;
  }
  setShowCustomInput(false);
  setCustomValue("");
  const timeStr = timeSelectionToTime(time);
  flow.setTime(timeStr);
  flow.next();
};
```

Update `handleCustomSubmit`:
```tsx
const handleCustomSubmit = () => {
  if (customValue.trim()) {
    setShowCustomInput(false);
    const timeStr = timeSelectionToTime(customValue.trim());
    flow.setTime(timeStr);
    flow.next();
    setCustomValue("");
  }
};
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/SelectTimeSheet.tsx
git commit -m "refactor: SelectTimeSheet owns time conversion, uses useSheetFlow()"
```

---

### Task 10: Refactor TaskSummarySheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/TaskSummarySheet.tsx`

**Step 1: Remove data/callback props, use useSheetFlow()**

Remove `PendingTask` export (it now lives in SheetFlowProvider). Remove Props interface data fields.

Add import:
```tsx
import { useSheetFlow, type PendingTask } from "../home/SheetFlowProvider";
```

Change Props:
```tsx
interface Props {
  onClose: () => void;
}
```

Inside component:
```tsx
const flow = useSheetFlow();
```

Replace `tasks` prop with `flow.pendingTasks`, `onTasksChange` with `flow.setPendingTasks`, etc:

```tsx
const updateTitle = useCallback(
  (id: string, title: string) => {
    flow.setPendingTasks(
      flow.pendingTasks.map((t) => (t.id === id ? { ...t, title } : t))
    );
  },
  [flow]
);

const removeTask = useCallback(
  (id: string) => {
    const updated = flow.pendingTasks.filter((t) => t.id !== id);
    if (updated.length === 0) {
      flow.reset();
    } else {
      flow.setPendingTasks(updated);
    }
  },
  [flow]
);
```

Update "Create All" button:
```tsx
onPress={() => flow.next()}
```

Update edit callbacks on TaskCard:
```tsx
onEditDate={() => flow.editDateTime(task.id, "dueDate")}
onEditTime={() => flow.editDateTime(task.id, "dueTime")}
```

Update Cancel button and close:
```tsx
onPress={() => flow.reset()}
```

Use `flow.pendingTasks` everywhere instead of `tasks` prop. Header text:
```tsx
We detected {flow.pendingTasks.length} tasks
```

Create All button text:
```tsx
Create All ({flow.pendingTasks.length})
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/sheets/TaskSummarySheet.tsx
git commit -m "refactor: TaskSummarySheet uses useSheetFlow() directly"
```

---

### Task 11: Simplify SheetManager

**Files:**
- Modify: `apps/mobile/src/components/home/SheetManager.tsx`

**Step 1: Strip to thin renderer**

Remove all imports except BottomSheet, sheet components, and useHome. Remove all handler functions, `nextSheetRef`, `useSheetFlow`, `genId`, `getDeviceLocale`, `splitTranscription`, `daySelectionToDate`, `timeSelectionToTime`.

```tsx
import { useRef, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { TaskSummarySheet } from "../sheets/TaskSummarySheet";
import { useHome } from "./HomeProvider";

export function SheetManager() {
  const { closeSheet, registerSheet } = useHome();

  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);

  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
  }, [registerSheet]);

  return (
    <>
      <AddTaskSheet ref={addSheetRef} onClose={closeSheet} />
      <RecordingSheet ref={recordingSheetRef} onClose={closeSheet} />
      <SelectDaySheet ref={daySheetRef} onClose={closeSheet} />
      <SelectTimeSheet ref={timeSheetRef} onClose={closeSheet} />
      <TaskSummarySheet ref={taskSummaryRef} onClose={closeSheet} />
      <AllTasksSheet ref={allTasksSheetRef} onClose={closeSheet} />
      <SettingsSheet ref={settingsSheetRef} onClose={closeSheet} />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/home/SheetManager.tsx
git commit -m "refactor: SheetManager stripped to thin renderer"
```

---

### Task 12: Delete old useSheetFlow hook

**Files:**
- Delete: `apps/mobile/src/hooks/useSheetFlow.ts`

**Step 1: Verify no remaining imports**

Search for any remaining imports of the old hook:
```bash
grep -r "useSheetFlow" apps/mobile/src/hooks/
grep -r "from.*hooks/useSheetFlow" apps/mobile/src/
```

The only import should be the file itself. All other files now import from `../home/SheetFlowProvider`.

**Step 2: Delete the file**

```bash
rm apps/mobile/src/hooks/useSheetFlow.ts
```

**Step 3: Commit**

```bash
git add -A apps/mobile/src/hooks/useSheetFlow.ts
git commit -m "chore: delete old useSheetFlow hook, replaced by SheetFlowProvider"
```

---

### Task 13: Fix PendingTask imports

**Files:**
- Verify: all files that imported `PendingTask` from `TaskSummarySheet` now import from `SheetFlowProvider`

**Step 1: Search for old PendingTask imports**

```bash
grep -r "PendingTask" apps/mobile/src/ --include="*.tsx" --include="*.ts"
```

Files that previously imported `PendingTask` from `TaskSummarySheet`:
- `SheetManager.tsx` — already updated (Task 11, no longer needs it)
- `useSheetFlow.ts` — deleted (Task 12)

If `TaskSummarySheet` still exports `PendingTask`, remove the export. The type now lives in `SheetFlowProvider.tsx`.

**Step 2: Commit if changes needed**

```bash
git add -A
git commit -m "chore: consolidate PendingTask type in SheetFlowProvider"
```

---

### Task 14: TypeScript verification and cleanup

**Step 1: Run TypeScript check**

```bash
cd apps/mobile && npx tsc --noEmit
```

Fix any type errors.

**Step 2: Check for unused imports across changed files**

Verify no dead imports remain in:
- `SheetManager.tsx` — should not import `useSheetFlow`, `daySelectionToDate`, `timeSelectionToTime`, `splitTranscription`, `getLocales`, `PendingTask`
- All sheet files — should not import removed props types

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "chore: fix type errors and remove unused imports"
```

---

### Key implementation notes

**stateRef pattern:** The `syncDispatch` + `stateRef` pattern in SheetFlowProvider is critical. Without it, calling `flow.setDay(dateStr)` then `flow.next()` in the same synchronous block would cause `next()` to read the OLD state (before setDay). The ref is updated synchronously by replaying the action through the reducer.

**Close-then-open timing:** `closeSheet()` (closes all sheets) followed by `openSheet(nextStep)` works because they target different BottomSheet instances. The close animation on the old sheet and open animation on the new sheet run in parallel. If this causes visual issues, the fallback is the `onSheetClosed` callback pattern (set a `pendingStep`, open it on the BottomSheet `onClose` event).

**Terminal steps:** `selectTime` (single task) and `taskSummary` call `createTask` and `reset` — no next sheet to open. These close the sheet and don't navigate.

# SheetManager Refactor — Move Logic Into Sheets

## Problem

`SheetManager.tsx` (247 lines) is a god component that owns all business logic for 7 sheets: recording flow, task splitting, day/time selection, sheet chaining, and task creation. Sheets are dumb — they receive callbacks and know nothing about navigation or flow.

## Design

### SheetFlowProvider (new context)

Replace `hooks/useSheetFlow.ts` with `components/home/SheetFlowProvider.tsx`. The flow context manages multi-step task creation state and navigation.

**State:**

```ts
interface FlowState {
  step: "idle" | "addTask" | "recording" | "selectDay" | "selectTime" | "taskSummary";
  title: string;
  selectedDay: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
}
```

**API via `useSheetFlow()`:**

```ts
// Read state
step, title, selectedDay, pendingTasks, editingTaskId

// Set data (sheet sets its result before calling next)
setTitle(title)
setDay(day)
setPendingTasks(tasks)
updatePendingTasks(updater)

// Navigation
start(sheet: "addTask" | "recording")  // begins flow, opens sheet
next()                                  // closes current, opens next
editDateTime(taskId, field)             // from taskSummary → selectDay/selectTime
reset()                                 // closes all, resets to idle
```

**`next()` branching logic:**

- `addTask` | `recording` → open `selectDay`
- `selectDay` → if `editingTaskId` → open `taskSummary`, else → open `selectTime`
- `selectTime` → if `editingTaskId` → open `taskSummary`, if `pendingTasks.length > 0` → open `taskSummary`, else → `createTask` + `reset`
- `taskSummary` → create all tasks + `reset`

### Provider nesting

`SheetFlowProvider` needs `useHome()` (for `openSheet`, `closeSheet`, `createTask`), so it nests inside `HomeProvider`. Change in `HomeScreen.tsx`:

```tsx
<HomeProvider>
  <SheetFlowProvider>
    <SafeAreaView>
      <MainContent />
      <SheetManager />
    </SafeAreaView>
  </SheetFlowProvider>
</HomeProvider>
```

### Sheet changes

Each sheet switches from callback props to hooks:

- **AddTaskSheet** — uses `useSheetFlow()`. Calls `flow.setTitle()` + `flow.next()` on confirm. Calls `flow.start("recording")` on mic press. Removes `onConfirm`, `onMicPress` props.
- **RecordingSheet** — uses `useSheetFlow()`. Owns `splitTranscription` + `getDeviceLocale` logic. Sets title or pending tasks, then calls `flow.next()`. Removes `onStop` prop.
- **SelectDaySheet** — uses `useSheetFlow()`. Owns `daySelectionToDate` conversion. Calls `flow.setDay()` + `flow.next()`. Removes `onSelect` prop.
- **SelectTimeSheet** — uses `useSheetFlow()`. Owns `timeSelectionToTime` conversion. `next()` handles single-create vs multi-summary branching. Removes `onSelect` prop.
- **TaskSummarySheet** — uses `useSheetFlow()`. Reads/updates `pendingTasks` directly. Calls `flow.editDateTime()` for editing, `flow.next()` to create all. Removes `onCreateAll`, `onEditDateTime`, `onTasksChange` props.
- **AllTasksSheet** — uses `useHome()` directly for `tasks` and `deleteTask`. Removes `tasks`, `onDelete` props.
- **SettingsSheet** — uses `useHome()` directly for `settings`, `updateSetting`, `adminAiEnabled`. Removes all props.

All sheets keep `ref` (forwardRef) and `onClose`.

### Simplified SheetManager

Becomes ~40 lines. Only responsibilities: create refs, register them, render sheets. All handler functions, `nextSheetRef`, flow imports, and utility functions are removed. `genId` moves into `RecordingSheet`.

### Files changed

- **New:** `components/home/SheetFlowProvider.tsx`
- **Delete:** `hooks/useSheetFlow.ts`
- **Modify:** `HomeScreen.tsx` (add SheetFlowProvider wrapper)
- **Modify:** `SheetManager.tsx` (strip to thin renderer)
- **Modify:** All 7 sheet components (use hooks instead of callback props)

# Task Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the ability to edit existing tasks (title, due date, due time) from AllTasksSheet, reusing the existing sheet flow with pre-filled values and a checkmark indicator on default selections.

**Architecture:** New `tasks.update` Convex mutation with Levenshtein-based diff to conditionally retrigger AI scoring. SheetFlowProvider gets a new `editExistingTask()` entry point that pre-fills state and sets `editingExistingTaskId`. The `next()` terminal step branches on this field to call `updateTask` instead of `createTask`. GradientOption components in SelectDay/SelectTimeSheet gain a `selected` prop for the checkmark indicator.

**Tech Stack:** React Native, Convex, TypeScript, @gorhom/bottom-sheet

**Design doc:** `docs/plans/2026-03-09-task-editing-design.md`

---

### Task 1: Add Levenshtein distance utility

**Files:**
- Create: `apps/convex/convex/lib/levenshtein.ts`

**Step 1: Create the utility**

```typescript
/**
 * Normalized Levenshtein distance between two strings.
 * Returns a ratio 0..1 where 0 = identical, 1 = completely different.
 */
export function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;

  const la = a.length;
  const lb = b.length;
  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i);

  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }

  return dp[lb] / maxLen;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/convex/convex/lib/levenshtein.ts
git commit -m "feat: add normalized Levenshtein distance utility"
```

---

### Task 2: Add `tasks.update` mutation

**Files:**
- Modify: `apps/convex/convex/tasks.ts`

**Step 1: Add the update mutation after the existing `remove` mutation (line 127)**

Add import at top of file:
```typescript
import { normalizedLevenshtein } from "./lib/levenshtein";
```

Add constant near the top (after `requireAuth`):
```typescript
const RESCORE_THRESHOLD = 0.3;
```

Add mutation after `remove`:
```typescript
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    dueDate: v.string(),
    dueTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== userId) throw new ConvexError("Not found");

    assertMaxLength(args.title, MAX_TITLE, "title");
    assertDateFormat(args.dueDate);
    assertTimeFormat(args.dueTime);

    const oldTitle = task.title;
    await ctx.db.patch(args.id, {
      title: args.title,
      dueDate: args.dueDate,
      dueTime: args.dueTime,
    });

    // Re-score difficulty if title changed significantly
    const diff = normalizedLevenshtein(oldTitle, args.title);
    if (diff >= RESCORE_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.ai.scoreTaskDifficulty, {
        taskId: args.id,
        userId,
        title: args.title,
      });
    }
  },
});
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/convex && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/convex/convex/tasks.ts apps/convex/convex/lib/levenshtein.ts
git commit -m "feat: add tasks.update mutation with diff-based rescoring"
```

---

### Task 3: Add `useUpdateTask` hook and wire into HomeProvider

**Files:**
- Modify: `apps/mobile/src/hooks/useTasks.ts`
- Modify: `apps/mobile/src/components/home/HomeProvider.tsx`

**Step 1: Add useUpdateTask hook**

In `apps/mobile/src/hooks/useTasks.ts`, add after `useDeleteTask`:

```typescript
export function useUpdateTask() {
  return useMutation(api.tasks.update);
}
```

**Step 2: Wire into HomeProvider**

In `apps/mobile/src/components/home/HomeProvider.tsx`:

Add `useUpdateTask` to the import from useTasks (line 6):
```typescript
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from "../../hooks/useTasks";
```

Add to `HomeContextValue` interface (after `deleteTask` on line 39):
```typescript
  updateTask: (args: { id: string; title: string; dueDate: string; dueTime: string }) => Promise<void>;
```

Inside `HomeProvider`, after `const deleteTaskMutation = useDeleteTask();` (line 69):
```typescript
  const updateTaskMutation = useUpdateTask();
```

Add the callback after the existing `deleteTask` callback (after line 116):
```typescript
  const updateTask = useCallback(
    async (args: { id: string; title: string; dueDate: string; dueTime: string }) => {
      await updateTaskMutation({ id: args.id as Id<"tasks">, title: args.title, dueDate: args.dueDate, dueTime: args.dueTime });
    },
    [updateTaskMutation]
  );
```

Add `updateTask` to the Provider value object (after `deleteTask` on line 134):
```typescript
        updateTask,
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useTasks.ts apps/mobile/src/components/home/HomeProvider.tsx
git commit -m "feat: add useUpdateTask hook and wire into HomeProvider"
```

---

### Task 4: Add edit mode to SheetFlowProvider

**Files:**
- Modify: `apps/mobile/src/components/home/SheetFlowProvider.tsx`

**Step 1: Add `editingExistingTaskId` to state and reducer**

Add to `FlowState` interface (after `editingTaskId` on line 19):
```typescript
  editingExistingTaskId: string | null;
```

Add to `FlowAction` union (after `SET_EDITING_TASK`):
```typescript
  | { type: "EDIT_EXISTING"; taskId: string; title: string; day: string; time: string }
```

Add to `initialState` (after `editingTaskId: null`):
```typescript
  editingExistingTaskId: null,
```

Add case to `flowReducer` (before `RESET`):
```typescript
    case "EDIT_EXISTING":
      return { ...initialState, step: "addTask", editingExistingTaskId: action.taskId, title: action.title, selectedDay: action.day, selectedTime: action.time };
```

Update the `RESET` case — `initialState` already has `editingExistingTaskId: null` so no change needed.

**Step 2: Add `editingExistingTaskId` to context value**

Add to `SheetFlowContextValue` interface, in the State section (after `editingTaskId`):
```typescript
  editingExistingTaskId: string | null;
```

Add to Navigation section (after `reset`):
```typescript
  editExistingTask: (task: { _id: string; title: string; dueDate: string; dueTime: string }) => void;
```

**Step 3: Add `editExistingTask` function and `updateTask` to the provider**

Update the destructuring from `useHome()` (line 97):
```typescript
  const { openSheet, closeSheet, createTask, updateTask } = useHome();
```

Add the `editExistingTask` callback after `reset`:
```typescript
  const editExistingTask = useCallback((task: { _id: string; title: string; dueDate: string; dueTime: string }) => {
    syncDispatch({ type: "EDIT_EXISTING", taskId: task._id, title: task.title, day: task.dueDate, time: task.dueTime });
    closeSheet();
    openSheet("addTask");
  }, [syncDispatch, closeSheet, openSheet]);
```

**Step 4: Update `next()` terminal step for edit mode**

In the `next()` function, update the `selectTime` single-task terminal branch (currently lines 163-167):

Replace:
```typescript
        } else {
          closeSheet();
          await createTask({ title: s.title, dueDate: s.selectedDay, dueTime: s.selectedTime });
          syncDispatch({ type: "RESET" });
        }
```

With:
```typescript
        } else if (s.editingExistingTaskId) {
          closeSheet();
          await updateTask({ id: s.editingExistingTaskId, title: s.title, dueDate: s.selectedDay, dueTime: s.selectedTime });
          syncDispatch({ type: "RESET" });
        } else {
          closeSheet();
          await createTask({ title: s.title, dueDate: s.selectedDay, dueTime: s.selectedTime });
          syncDispatch({ type: "RESET" });
        }
```

**Step 5: Update Provider value**

Add `editingExistingTaskId` and `editExistingTask` to the Provider value object:
```typescript
      editingExistingTaskId: state.editingExistingTaskId,
```
and:
```typescript
      editExistingTask,
```

**Step 6: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add apps/mobile/src/components/home/SheetFlowProvider.tsx
git commit -m "feat: add edit mode to SheetFlowProvider with editExistingTask"
```

---

### Task 5: Update AddTaskSheet for edit mode

**Files:**
- Modify: `apps/mobile/src/components/sheets/AddTaskSheet.tsx`

**Step 1: Pre-fill text and adapt UI for edit mode**

Add `useEffect` to the imports (line 1):
```typescript
import { forwardRef, useState, useEffect } from "react";
```

Inside the component, after `const flow = useSheetFlow();` (line 21), add:
```typescript
    const isEditing = !!flow.editingExistingTaskId;
```

After `const [text, setText] = useState("");` (line 22), add effect to pre-fill:
```typescript
    useEffect(() => {
      if (flow.editingExistingTaskId && flow.title) {
        setText(flow.title);
      }
    }, [flow.editingExistingTaskId, flow.title]);
```

Update the header text (line 57):
```tsx
            <Text className="text-xl font-semibold text-[#1e2939]">{isEditing ? "Edit Task" : "Add New Task"}</Text>
```

Conditionally hide the mic button — wrap the mic `Animated.View` (lines 76-101) with:
```tsx
            {!isEditing && (
              <Animated.View style={micStyle}>
                {/* ... existing mic button ... */}
              </Animated.View>
            )}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/AddTaskSheet.tsx
git commit -m "feat: AddTaskSheet supports edit mode with pre-filled title"
```

---

### Task 6: Add `selected` checkmark to GradientOption in SelectDaySheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SelectDaySheet.tsx`

**Step 1: Add `selected` prop to GradientOption and show checkmark**

Update the `GradientOption` component to accept and display a `selected` prop:

```tsx
function GradientOption({
  label,
  colors,
  onPress,
  selected,
}: {
  label: string;
  colors: GradientPair;
  onPress: () => void;
  selected?: boolean;
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
        <View style={{ position: "relative" }}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
          </LinearGradient>
          {selected && (
            <View style={{
              position: "absolute", top: -4, right: -4,
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: "#fff",
              alignItems: "center", justifyContent: "center",
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3,
            }}>
              <Ionicons name="checkmark" size={14} color="#a2d2ff" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
```

**Step 2: Pass `selected` prop based on `flow.selectedDay`**

Inside `SelectDaySheet`, after `const flow = useSheetFlow();`, add a helper to check if an option matches the current default:

```typescript
    const isSelected = (day: string) => {
      if (!flow.selectedDay) return false;
      return daySelectionToDate(day) === flow.selectedDay;
    };
```

Update each `GradientOption` to pass `selected`:

```tsx
              <GradientOption label="Today" colors={DAY_GRADIENTS[0]} onPress={() => handleSelect("today")} selected={isSelected("today")} />
              <GradientOption label="Tomorrow" colors={DAY_GRADIENTS[1]} onPress={() => handleSelect("tomorrow")} selected={isSelected("tomorrow")} />
```
```tsx
              <GradientOption label="End of Week" colors={DAY_GRADIENTS[2]} onPress={() => handleSelect("end_of_week")} selected={isSelected("end_of_week")} />
              <GradientOption label="Custom" colors={DAY_GRADIENTS[3]} onPress={() => handleSelect("custom")} />
```

Note: "Custom" never shows selected — the user's custom date won't match an enum.

**Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/SelectDaySheet.tsx
git commit -m "feat: SelectDaySheet shows checkmark on default selected day"
```

---

### Task 7: Add `selected` checkmark to GradientOption in SelectTimeSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/SelectTimeSheet.tsx`

**Step 1: Add `selected` prop to GradientOption (same pattern as SelectDaySheet)**

Update the `GradientOption` in SelectTimeSheet to match the same pattern — add `selected?: boolean` prop, wrap `LinearGradient` in a `View` with `position: "relative"`, add the checkmark badge:

```tsx
function GradientOption({ label, colors, onPress, selected }: { label: string; colors: [string, string]; onPress: () => void; selected?: boolean }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        <View style={{ position: "relative" }}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ borderRadius: 24, paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 15 }}>{label}</Text>
          </LinearGradient>
          {selected && (
            <View style={{
              position: "absolute", top: -4, right: -4,
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: "#fff",
              alignItems: "center", justifyContent: "center",
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3,
            }}>
              <Ionicons name="checkmark" size={14} color="#a2d2ff" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
```

**Step 2: Pass `selected` prop based on `flow.selectedTime`**

Inside `SelectTimeSheet`, after `const flow = useSheetFlow();`, add:

```typescript
    const isSelected = (time: string) => {
      if (!flow.selectedTime) return false;
      return timeSelectionToTime(time) === flow.selectedTime;
    };
```

Update each `GradientOption`:

```tsx
              <GradientOption label="By Noon" colors={["#bde0fe", "#a2d2ff"]} onPress={() => handleSelect("noon")} selected={isSelected("noon")} />
              <GradientOption label="By Afternoon" colors={["#a2d2ff", "#cdb4db"]} onPress={() => handleSelect("afternoon")} selected={isSelected("afternoon")} />
```
```tsx
              <GradientOption label="By End of Day" colors={["#cdb4db", "#ffc8dd"]} onPress={() => handleSelect("end_of_day")} selected={isSelected("end_of_day")} />
              <GradientOption label="Custom" colors={["#ffc8dd", "#ffafcc"]} onPress={() => handleSelect("custom")} />
```

**Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/components/sheets/SelectTimeSheet.tsx
git commit -m "feat: SelectTimeSheet shows checkmark on default selected time"
```

---

### Task 8: Add edit button to AllTasksSheet

**Files:**
- Modify: `apps/mobile/src/components/sheets/AllTasksSheet.tsx`

**Step 1: Import useSheetFlow and add edit button**

Add import:
```typescript
import { useSheetFlow } from "../home/SheetFlowProvider";
```

Inside the `AllTasksSheet` component (after the `useHome()` call), add:
```typescript
    const flow = useSheetFlow();
```

Update `TaskItemProps` to add `onEdit`:
```typescript
interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}
```

Update `TaskItem` to accept and render the edit button. Add the edit button before the delete button in the `flex-row gap-2` View:

```tsx
function TaskItem({ task, onDelete, onEdit }: TaskItemProps) {
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
            <Ionicons name="create-outline" size={20} color="#364153" />
          </Pressable>
          <Pressable
            onPress={() => onDelete(task._id)}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#364153" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
```

Update the `TaskItem` usage in the render to pass `onEdit`:
```tsx
            <TaskItem key={task._id} task={task} onDelete={deleteTask} onEdit={(t) => flow.editExistingTask(t)} />
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/mobile/src/components/sheets/AllTasksSheet.tsx
git commit -m "feat: AllTasksSheet edit button launches edit flow"
```

---

### Task 9: TypeScript verification and cleanup

**Step 1: Run full TypeScript check**

Run: `cd apps/mobile && npx tsc --noEmit`
Fix any type errors.

Run: `cd apps/convex && npx tsc --noEmit`
Fix any type errors.

**Step 2: Verify no unused imports**

Check changed files for dead imports:
- `SheetFlowProvider.tsx` — should import `updateTask` from HomeProvider
- `AllTasksSheet.tsx` — should import `useSheetFlow`
- `AddTaskSheet.tsx` — should import `useEffect`

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "chore: fix type errors and remove unused imports"
```

---

### Key implementation notes

**Levenshtein threshold:** `RESCORE_THRESHOLD = 0.3` means ~30% of the longer string must differ to trigger rescoring. This avoids AI calls for typo fixes ("Buy grocereis" → "Buy groceries") while catching meaningful changes ("Buy groceries" → "File quarterly taxes").

**Edit flow path:** `editExistingTask(task)` → AddTaskSheet (pre-filled, no mic) → SelectDaySheet (checkmark on current) → SelectTimeSheet (checkmark on current) → `updateTask` instead of `createTask` → reset.

**Checkmark indicator:** White circle with blue checkmark, positioned at top-right of the gradient pill with slight overflow (-4px). Uses shadow for depth. Only shown when the option's resolved value matches `flow.selectedDay`/`flow.selectedTime`.

**No multi-task edit:** `editExistingTask` always enters the single-task path (no `pendingTasks`), so it bypasses `taskSummary` entirely.

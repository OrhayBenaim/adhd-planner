# Task Editing Design

## Overview

Add the ability to edit existing tasks (title, due date, due time) from the AllTasksSheet. Reuses the existing SheetFlowProvider create flow in an "edit mode" — same sheets, pre-filled with current values, saves via a new `updateTask` mutation.

## Section 1: Backend — `updateTask` mutation + diff-based rescoring

**New Convex mutation: `tasks.update`**

```typescript
update({ id, title, dueDate, dueTime })
```

- Updates the specified fields on the task
- Computes a simple diff: compares old title vs new title using normalized Levenshtein distance (edit distance / max length). If the ratio exceeds a threshold constant (`RESCORE_THRESHOLD = 0.3` — meaning 30%+ of the title changed), schedules async AI difficulty rescoring. Date/time changes alone don't trigger rescoring.
- Returns the updated task

**Why Levenshtein:** Simple, deterministic, no dependencies. "Buy groceries" → "Buy groceries and milk" is a small change (no rescore). "Buy groceries" → "Prepare tax documents" is a large change (rescore).

## Section 2: SheetFlowProvider — edit mode

**New entry point: `editExistingTask(task: Task)`**

- Sets flow state: `title` = task.title, `selectedDay` = task.dueDate, `selectedTime` = task.dueTime
- Sets `editingExistingTaskId` = task._id (new field in FlowState, `string | null`, default `null`)
- Sets step to `"addTask"` and opens the AddTask sheet (pre-filled)

**Flow changes:**

- `next()` at the `selectTime` terminal step (single task path): if `editingExistingTaskId` is set, calls `updateTask` instead of `createTask`, then resets
- `start("recording")` is hidden/disabled during edit mode — editing is text-only, no voice re-recording
- `reset()` clears `editingExistingTaskId` as part of the normal reset

**HomeProvider:**

- Expose a new `updateTask` function wrapping the new Convex mutation, alongside the existing `createTask`

## Section 3: Sheet UI changes

**AddTaskSheet — edit mode awareness:**

- When `flow.editingExistingTaskId` is set, pre-fill the text input with `flow.title`
- Hide the mic button (no voice re-recording for edits)
- Header changes from "Add New Task" to "Edit Task"

**SelectDaySheet — `defaultValue` indicator:**

- SheetFlowProvider exposes `selectedDay` which is pre-filled during edit mode
- Each gradient option button checks if its resolved date matches `flow.selectedDay`
- If matched: show a small checkmark icon at the top-right corner of the gradient pill (white, ~14px, slightly overlapping the corner)
- Selecting a different option moves the checkmark to the new selection

**SelectTimeSheet — same pattern:**

- Same checkmark indicator using `flow.selectedTime`

**AllTasksSheet — edit button:**

- Add a pencil/edit icon button next to the existing delete button on each task card
- Tapping it calls `flow.editExistingTask(task)` which closes AllTasksSheet and opens the edit flow pre-filled

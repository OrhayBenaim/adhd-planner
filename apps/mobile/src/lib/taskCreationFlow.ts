/**
 * Task Creation flow — pure core.
 *
 * The whole multi-step wizard (add → day → time → summary) is modeled as
 * pure transition functions: (state, input) -> { state, effects }.
 * Effects (open/close sheets, create/update tasks) are interpreted by
 * TaskCreationFlowProvider; everything here is testable without React
 * or BottomSheet refs.
 */
import { splitTranscription } from "./taskSplitter";
import { daySelectionToDate, timeSelectionToTime } from "./dateTimeConvert";

export interface PendingTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
}

export type FlowStep = "idle" | "addTask" | "selectDay" | "selectTime" | "taskSummary";
export type FlowSheet = Exclude<FlowStep, "idle">;

export interface FlowState {
  step: FlowStep;
  title: string;
  selectedDay: string;
  selectedTime: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
  editingExistingTaskId: string | null;
}

export type FlowEffect =
  | { type: "openSheet"; sheet: FlowSheet }
  | { type: "closeSheet" }
  | { type: "createTask"; task: { title: string; dueDate: string; dueTime: string }; source: "text" | "voice" }
  | { type: "updateTask"; task: { id: string; title: string; dueDate: string; dueTime: string } };

export interface FlowTransition {
  state: FlowState;
  effects: FlowEffect[];
}

export const initialFlowState: FlowState = {
  step: "idle",
  title: "",
  selectedDay: "",
  selectedTime: "",
  pendingTasks: [],
  editingTaskId: null,
  editingExistingTaskId: null,
};

let nextId = 0;
function genId() {
  return `pending-${++nextId}`;
}

export function buildPendingTasks(titles: string[]): PendingTask[] {
  return titles.map((title) => ({ id: genId(), title, dueDate: "", dueTime: "" }));
}

function goTo(state: FlowState, sheet: FlowSheet): FlowTransition {
  return {
    state: { ...state, step: sheet },
    effects: [{ type: "closeSheet" }, { type: "openSheet", sheet }],
  };
}

/** Begin a fresh flow at the add-task sheet. */
export function start(): FlowTransition {
  return {
    state: { ...initialFlowState, step: "addTask" },
    effects: [{ type: "openSheet", sheet: "addTask" }],
  };
}

/**
 * Submit raw input (typed or transcribed). Splits it into one title or
 * several pending tasks, then advances to day selection.
 */
export function submitInput(state: FlowState, rawText: string): FlowTransition {
  const trimmed = rawText.trim();
  const titles = splitTranscription(trimmed);

  const withInput: FlowState =
    titles.length <= 1
      ? { ...state, title: titles[0] || trimmed }
      : { ...state, pendingTasks: buildPendingTasks(titles) };

  return goTo(withInput, "selectDay");
}

/**
 * Apply a day selection (preset like "today"/"tomorrow"/"end_of_week" or a
 * custom string) and advance.
 */
export function selectDay(state: FlowState, selection: string): FlowTransition {
  const day = daySelectionToDate(selection);

  if (state.editingTaskId) {
    const editingId = state.editingTaskId;
    return goTo(
      {
        ...state,
        selectedDay: day,
        pendingTasks: state.pendingTasks.map((t) => (t.id === editingId ? { ...t, dueDate: day } : t)),
        editingTaskId: null,
      },
      "taskSummary"
    );
  }

  if (state.pendingTasks.length > 0) {
    return goTo(
      {
        ...state,
        selectedDay: day,
        pendingTasks: state.pendingTasks.map((t) => ({ ...t, dueDate: day })),
      },
      "selectTime"
    );
  }

  return goTo({ ...state, selectedDay: day }, "selectTime");
}

/**
 * Apply a time selection (preset like "noon"/"afternoon"/"end_of_day" or a
 * custom "HH:mm") and advance. For a single task this ends the flow with a
 * create (or update when editing an existing task).
 */
export function selectTime(state: FlowState, selection: string): FlowTransition {
  const time = timeSelectionToTime(selection);

  if (state.editingTaskId) {
    const editingId = state.editingTaskId;
    return goTo(
      {
        ...state,
        selectedTime: time,
        pendingTasks: state.pendingTasks.map((t) => (t.id === editingId ? { ...t, dueTime: time } : t)),
        editingTaskId: null,
      },
      "taskSummary"
    );
  }

  if (state.pendingTasks.length > 0) {
    return goTo(
      {
        ...state,
        selectedTime: time,
        pendingTasks: state.pendingTasks.map((t) => ({ ...t, dueTime: time })),
      },
      "taskSummary"
    );
  }

  if (state.editingExistingTaskId) {
    return {
      state: initialFlowState,
      effects: [
        { type: "closeSheet" },
        {
          type: "updateTask",
          task: {
            id: state.editingExistingTaskId,
            title: state.title,
            dueDate: state.selectedDay,
            dueTime: time,
          },
        },
      ],
    };
  }

  return {
    state: initialFlowState,
    effects: [
      { type: "closeSheet" },
      {
        type: "createTask",
        task: { title: state.title, dueDate: state.selectedDay, dueTime: time },
        source: "text",
      },
    ],
  };
}

/** Create all pending tasks from the summary sheet and end the flow. */
export function confirmSummary(state: FlowState): FlowTransition {
  return {
    state: initialFlowState,
    effects: [
      { type: "closeSheet" },
      ...state.pendingTasks.map(
        (task): FlowEffect => ({
          type: "createTask",
          task: { title: task.title, dueDate: task.dueDate, dueTime: task.dueTime },
          source: "voice",
        })
      ),
    ],
  };
}

/** From the summary sheet, jump to day/time selection for one pending task. */
export function editDateTime(state: FlowState, taskId: string, field: "dueDate" | "dueTime"): FlowTransition {
  const sheet: FlowSheet = field === "dueDate" ? "selectDay" : "selectTime";
  return goTo({ ...state, editingTaskId: taskId }, sheet);
}

/** Re-open the flow pre-filled with an existing task for editing. */
export function editExistingTask(task: { _id: string; title: string; dueDate: string; dueTime: string }): FlowTransition {
  return {
    state: {
      ...initialFlowState,
      step: "addTask",
      editingExistingTaskId: task._id,
      title: task.title,
      selectedDay: task.dueDate,
      selectedTime: task.dueTime,
    },
    effects: [{ type: "closeSheet" }, { type: "openSheet", sheet: "addTask" }],
  };
}

/** Rename a pending task on the summary sheet. */
export function updatePendingTitle(state: FlowState, taskId: string, title: string): FlowTransition {
  return {
    state: {
      ...state,
      pendingTasks: state.pendingTasks.map((t) => (t.id === taskId ? { ...t, title } : t)),
    },
    effects: [],
  };
}

/** Remove a pending task; removing the last one abandons the flow. */
export function removePendingTask(state: FlowState, taskId: string): FlowTransition {
  const remaining = state.pendingTasks.filter((t) => t.id !== taskId);
  if (remaining.length === 0) {
    return reset();
  }
  return { state: { ...state, pendingTasks: remaining }, effects: [] };
}

/** Abandon the flow and close everything. */
export function reset(): FlowTransition {
  return { state: initialFlowState, effects: [{ type: "closeSheet" }] };
}

/**
 * One back step in the creation wizard.
 * From add-task (or idle), abandons the flow. From day/time while editing a
 * pending task, returns to summary. Otherwise rewinds to the previous sheet.
 */
export function goBack(state: FlowState): FlowTransition {
  switch (state.step) {
    case "idle":
    case "addTask":
      return reset();
    case "selectDay":
      if (state.editingTaskId) {
        return goTo({ ...state, editingTaskId: null }, "taskSummary");
      }
      return goTo(state, "addTask");
    case "selectTime":
      if (state.editingTaskId) {
        return goTo({ ...state, editingTaskId: null }, "taskSummary");
      }
      return goTo(state, "selectDay");
    case "taskSummary":
      return goTo(state, "selectTime");
    default: {
      const _exhaustive: never = state.step;
      return _exhaustive;
    }
  }
}

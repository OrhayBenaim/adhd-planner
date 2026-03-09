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

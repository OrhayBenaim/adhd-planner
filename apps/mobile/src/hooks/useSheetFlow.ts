import { useReducer, useCallback } from "react";
import type { PendingTask } from "../components/home/SheetFlowProvider";

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

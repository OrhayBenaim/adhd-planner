// apps/mobile/src/components/home/TaskCreationFlowProvider.tsx
import { Alert } from "react-native";
import { ConvexError } from "convex/values";
import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useHome } from "./HomeProvider";
import { useSheetNav } from "./SheetNavProvider";
import { track } from "../../lib/analytics";
import {
  initialFlowState,
  type FlowState,
  type FlowTransition,
  type PendingTask,
  start as startFlow,
  submitInput as submitInputFlow,
  selectDay as selectDayFlow,
  selectTime as selectTimeFlow,
  confirmSummary as confirmSummaryFlow,
  editDateTime as editDateTimeFlow,
  editExistingTask as editExistingTaskFlow,
  updatePendingTitle as updatePendingTitleFlow,
  removePendingTask as removePendingTaskFlow,
  reset as resetFlow,
} from "../../lib/taskCreationFlow";

export type { PendingTask };

interface TaskCreationFlowContextValue {
  // State
  step: FlowState["step"];
  title: string;
  selectedDay: string;
  selectedTime: string;
  pendingTasks: PendingTask[];
  editingTaskId: string | null;
  editingExistingTaskId: string | null;

  // Flow inputs
  start: () => void;
  submitInput: (rawText: string) => Promise<void>;
  selectDay: (selection: string) => Promise<void>;
  selectTime: (selection: string) => Promise<void>;
  confirmSummary: () => Promise<void>;
  editDateTime: (taskId: string, field: "dueDate" | "dueTime") => void;
  editExistingTask: (task: { _id: string; title: string; dueDate: string; dueTime: string }) => void;
  updatePendingTitle: (taskId: string, title: string) => void;
  removePendingTask: (taskId: string) => void;
  reset: () => void;
}

const TaskCreationFlowContext = createContext<TaskCreationFlowContextValue | null>(null);

export function useTaskCreationFlow() {
  const ctx = useContext(TaskCreationFlowContext);
  if (!ctx) throw new Error("useTaskCreationFlow must be used within TaskCreationFlowProvider");
  return ctx;
}

/**
 * Interprets the pure Task Creation flow (src/lib/taskCreationFlow.ts):
 * applies state transitions and runs their effects against the sheet
 * navigator and task mutations. Sheets only feed inputs and render state.
 */
export function TaskCreationFlowProvider({ children }: { children: ReactNode }) {
  const { createTask, updateTask } = useHome();
  const { openSheet, closeSheet } = useSheetNav();
  const [state, setState] = useState<FlowState>(initialFlowState);

  // Fresh state for async sequences regardless of render timing
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback(
    async ({ state: newState, effects }: FlowTransition) => {
      stateRef.current = newState;
      setState(newState);
      // Mutations are dispatched in effect order (Convex executes them in
      // submission order) and awaited together.
      const mutations: Promise<unknown>[] = [];
      for (const effect of effects) {
        switch (effect.type) {
          case "closeSheet":
            closeSheet();
            break;
          case "openSheet":
            openSheet(effect.sheet);
            break;
          case "createTask":
            track("Created item", { source: effect.source });
            mutations.push(createTask(effect.task));
            break;
          case "updateTask":
            mutations.push(updateTask(effect.task));
            break;
        }
      }
      try {
        await Promise.all(mutations);
      } catch (error) {
        Alert.alert(
          "Couldn't save task",
          error instanceof ConvexError && typeof error.data === "string"
            ? error.data
            : "Couldn't save changes. Please try again.",
        );
      }
    },
    [closeSheet, openSheet, createTask, updateTask]
  );

  const start = useCallback(() => {
    void apply(startFlow());
  }, [apply]);

  const submitInput = useCallback(
    (rawText: string) => apply(submitInputFlow(stateRef.current, rawText)),
    [apply]
  );

  const selectDay = useCallback(
    (selection: string) => apply(selectDayFlow(stateRef.current, selection)),
    [apply]
  );

  const selectTime = useCallback(
    (selection: string) => apply(selectTimeFlow(stateRef.current, selection)),
    [apply]
  );

  const confirmSummary = useCallback(
    () => apply(confirmSummaryFlow(stateRef.current)),
    [apply]
  );

  const editDateTime = useCallback(
    (taskId: string, field: "dueDate" | "dueTime") => {
      void apply(editDateTimeFlow(stateRef.current, taskId, field));
    },
    [apply]
  );

  const editExistingTask = useCallback(
    (task: { _id: string; title: string; dueDate: string; dueTime: string }) => {
      void apply(editExistingTaskFlow(task));
    },
    [apply]
  );

  const updatePendingTitle = useCallback(
    (taskId: string, title: string) => {
      void apply(updatePendingTitleFlow(stateRef.current, taskId, title));
    },
    [apply]
  );

  const removePendingTask = useCallback(
    (taskId: string) => {
      void apply(removePendingTaskFlow(stateRef.current, taskId));
    },
    [apply]
  );

  const reset = useCallback(() => {
    void apply(resetFlow());
  }, [apply]);

  const value = useMemo(
    () => ({
      step: state.step,
      title: state.title,
      selectedDay: state.selectedDay,
      selectedTime: state.selectedTime,
      pendingTasks: state.pendingTasks,
      editingTaskId: state.editingTaskId,
      editingExistingTaskId: state.editingExistingTaskId,
      start,
      submitInput,
      selectDay,
      selectTime,
      confirmSummary,
      editDateTime,
      editExistingTask,
      updatePendingTitle,
      removePendingTask,
      reset,
    }),
    [
      state,
      start,
      submitInput,
      selectDay,
      selectTime,
      confirmSummary,
      editDateTime,
      editExistingTask,
      updatePendingTitle,
      removePendingTask,
      reset,
    ]
  );

  return (
    <TaskCreationFlowContext.Provider value={value}>
      {children}
    </TaskCreationFlowContext.Provider>
  );
}

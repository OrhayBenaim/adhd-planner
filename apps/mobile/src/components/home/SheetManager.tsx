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
        onClose={closeSheet}
      />
      <SettingsSheet
        ref={settingsSheetRef}
        onClose={closeSheet}
      />
    </>
  );
}

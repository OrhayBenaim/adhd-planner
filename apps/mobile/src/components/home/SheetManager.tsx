// apps/mobile/src/components/home/SheetManager.tsx
import { useRef, useState, useCallback, useEffect, type RefObject } from "react";
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

  // Queue for chaining sheets (close one → open next)
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

  // === Single-task flow state ===
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

  // === Multi-task flow state ===
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

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
        // Single task — existing flow
        setPendingTaskTitle(splitTasks[0] || text);
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      } else {
        // Multiple tasks — go to day/time selection first, then summary
        const pending: PendingTask[] = splitTasks.map((title) => ({
          id: genId(),
          title,
          dueDate: "",
          dueTime: "",
        }));
        setPendingTasks(pending);
        // Go to day selection (will apply to all tasks)
        nextSheetRef.current = "selectDay";
        recordingSheetRef.current?.close();
      }
    },
    []
  );

  const handleTaskConfirmed = useCallback((title: string) => {
    setPendingTaskTitle(title);
    nextSheetRef.current = "selectDay";
    addSheetRef.current?.close();
  }, []);

  const handleDaySelected = useCallback((day: string) => {
    if (day === "custom") {
      setShowCustomDay(true);
      return;
    }
    const dateStr = daySelectionToDate(day);
    setShowCustomDay(false);

    if (editingTaskId) {
      // Editing a specific task in summary
      setPendingTasks((prev) =>
        prev.map((t) => (t.id === editingTaskId ? { ...t, dueDate: dateStr } : t))
      );
      setEditingTaskId(null);
      nextSheetRef.current = "taskSummary";
      daySheetRef.current?.close();
    } else if (pendingTasks.length > 0) {
      // Multi-task: apply same date to all, go to time
      setPendingTasks((prev) => prev.map((t) => ({ ...t, dueDate: dateStr })));
      setSelectedDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    } else {
      // Single task flow
      setSelectedDay(dateStr);
      nextSheetRef.current = "selectTime";
      daySheetRef.current?.close();
    }
  }, [editingTaskId, pendingTasks.length]);

  const handleTimeSelected = useCallback(
    async (time: string) => {
      if (time === "custom") {
        setShowCustomTime(true);
        return;
      }
      const timeStr = timeSelectionToTime(time);
      setShowCustomTime(false);

      if (editingTaskId) {
        // Editing a specific task in summary
        setPendingTasks((prev) =>
          prev.map((t) => (t.id === editingTaskId ? { ...t, dueTime: timeStr } : t))
        );
        setEditingTaskId(null);
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else if (pendingTasks.length > 0) {
        // Multi-task: apply same time to all, go to summary
        setPendingTasks((prev) => prev.map((t) => ({ ...t, dueTime: timeStr })));
        nextSheetRef.current = "taskSummary";
        timeSheetRef.current?.close();
      } else {
        // Single task flow — create immediately
        closeSheet();
        await createTask({
          title: pendingTaskTitle,
          dueDate: selectedDay,
          dueTime: timeStr,
        });
        setPendingTaskTitle("");
        setSelectedDay("");
      }
    },
    [closeSheet, createTask, pendingTaskTitle, selectedDay, editingTaskId, pendingTasks.length]
  );

  const handleEditDateTime = useCallback(
    (taskId: string, field: "dueDate" | "dueTime") => {
      setEditingTaskId(taskId);
      nextSheetRef.current = field === "dueDate" ? "selectDay" : "selectTime";
      taskSummaryRef.current?.close();
    },
    []
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
      setPendingTasks([]);
    },
    [closeSheet, createTask]
  );

  const handleSummaryClose = useCallback(() => {
    setPendingTasks([]);
    setEditingTaskId(null);
    closeSheet();
  }, [closeSheet]);

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
        customValue={customDay}
        onCustomChange={setCustomDay}
        showCustomInput={showCustomDay}
      />
      <SelectTimeSheet
        ref={timeSheetRef}
        onSelect={handleTimeSelected}
        onClose={closeSheet}
        customValue={customTime}
        onCustomChange={setCustomTime}
        showCustomInput={showCustomTime}
      />
      <TaskSummarySheet
        ref={taskSummaryRef}
        tasks={pendingTasks}
        onTasksChange={setPendingTasks}
        onCreateAll={handleCreateAll}
        onEditDateTime={handleEditDateTime}
        onClose={handleSummaryClose}
      />
      <AllTasksSheet
        ref={allTasksSheetRef}
        tasks={tasks}
        onEdit={() => {}}
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

// apps/mobile/src/components/home/SheetManager.tsx
import { useRef, useState, useCallback, useEffect, type RefObject } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { useHome, type ActiveSheet } from "./HomeProvider";

export function SheetManager() {
  const {
    tasks,
    settings,
    moodLevel,
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

  // Register refs with HomeProvider so openSheet/closeSheet work
  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
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

  // Task creation flow state
  const [pendingTaskTitle, setPendingTaskTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [customDay, setCustomDay] = useState("");
  const [showCustomDay, setShowCustomDay] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTime, setShowCustomTime] = useState(false);

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
    setSelectedDay(day);
    setShowCustomDay(false);
    nextSheetRef.current = "selectTime";
    daySheetRef.current?.close();
  }, []);

  const handleTimeSelected = useCallback(
    async (time: string) => {
      if (time === "custom") {
        setShowCustomTime(true);
        return;
      }
      closeSheet();
      await createTask({
        title: pendingTaskTitle,
        difficulty: moodLevel,
        dueDate: selectedDay || undefined,
        dueTime: time,
      });
      setPendingTaskTitle("");
      setSelectedDay("");
    },
    [closeSheet, createTask, pendingTaskTitle, moodLevel, selectedDay]
  );

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
        onStop={(text) => {
          if (text) setPendingTaskTitle(text);
          nextSheetRef.current = "selectDay";
          recordingSheetRef.current?.close();
        }}
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
      />
    </>
  );
}

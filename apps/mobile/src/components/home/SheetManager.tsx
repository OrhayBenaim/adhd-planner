import { useRef, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { RecordingSheet } from "../sheets/RecordingSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { TaskSummarySheet } from "../sheets/TaskSummarySheet";
import { useHome } from "./HomeProvider";

export function SheetManager() {
  const { onSheetClose, registerSheet } = useHome();

  const addSheetRef = useRef<BottomSheet>(null);
  const recordingSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);

  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "recording", ref: recordingSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
  }, [registerSheet]);

  return (
    <>
      <AddTaskSheet ref={addSheetRef} onClose={onSheetClose} />
      <RecordingSheet ref={recordingSheetRef} onClose={onSheetClose} />
      <SelectDaySheet ref={daySheetRef} onClose={onSheetClose} />
      <SelectTimeSheet ref={timeSheetRef} onClose={onSheetClose} />
      <TaskSummarySheet ref={taskSummaryRef} onClose={onSheetClose} />
      <AllTasksSheet ref={allTasksSheetRef} onClose={onSheetClose} />
      <SettingsSheet ref={settingsSheetRef} onClose={onSheetClose} />
    </>
  );
}

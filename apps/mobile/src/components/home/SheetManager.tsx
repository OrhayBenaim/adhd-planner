import { useRef, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { AllTasksSheet } from "../sheets/AllTasksSheet";
import { SettingsSheet } from "../sheets/SettingsSheet";
import { PreferencesSheet } from "../sheets/PreferencesSheet";
import { TaskSummarySheet } from "../sheets/TaskSummarySheet";
import { ProfileSheet } from "../sheets/ProfileSheet";
import { InsightsSheet } from "../sheets/InsightsSheet";
import { useSheetNav } from "./SheetNavProvider";

export function SheetManager() {
  const { onSheetClose, registerSheet } = useSheetNav();

  const addSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const preferencesSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);
  const profileSheetRef = useRef<BottomSheet>(null);
  const insightsSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "preferences", ref: preferencesSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
    registerSheet({ name: "profile", ref: profileSheetRef });
    registerSheet({ name: "insights", ref: insightsSheetRef });
  }, [registerSheet]);

  return (
    <>
      <AddTaskSheet ref={addSheetRef} onClose={() => onSheetClose("addTask")} />
      <SelectDaySheet ref={daySheetRef} onClose={() => onSheetClose("selectDay")} />
      <SelectTimeSheet ref={timeSheetRef} onClose={() => onSheetClose("selectTime")} />
      <TaskSummarySheet ref={taskSummaryRef} onClose={() => onSheetClose("taskSummary")} />
      <AllTasksSheet ref={allTasksSheetRef} onClose={() => onSheetClose("allTasks")} />
      <SettingsSheet ref={settingsSheetRef} onClose={() => onSheetClose("settings")} />
      <PreferencesSheet ref={preferencesSheetRef} onClose={() => onSheetClose("preferences")} />
      <ProfileSheet ref={profileSheetRef} onClose={() => onSheetClose("profile")} />
      <InsightsSheet ref={insightsSheetRef} onClose={() => onSheetClose("insights")} />
    </>
  );
}

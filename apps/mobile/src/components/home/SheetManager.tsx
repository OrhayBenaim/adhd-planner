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
import { PaywallSheet } from "../sheets/PaywallSheet";
import { useHome } from "./HomeProvider";

export function SheetManager() {
  const { onSheetClose, registerSheet } = useHome();

  const addSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const allTasksSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const preferencesSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);
  const profileSheetRef = useRef<BottomSheet>(null);
  const paywallSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "allTasks", ref: allTasksSheetRef });
    registerSheet({ name: "settings", ref: settingsSheetRef });
    registerSheet({ name: "preferences", ref: preferencesSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
    registerSheet({ name: "profile", ref: profileSheetRef });
    registerSheet({ name: "paywall", ref: paywallSheetRef });
  }, [registerSheet]);

  return (
    <>
      <AddTaskSheet ref={addSheetRef} onClose={onSheetClose} />
      <SelectDaySheet ref={daySheetRef} onClose={onSheetClose} />
      <SelectTimeSheet ref={timeSheetRef} onClose={onSheetClose} />
      <TaskSummarySheet ref={taskSummaryRef} onClose={onSheetClose} />
      <AllTasksSheet ref={allTasksSheetRef} onClose={onSheetClose} />
      <SettingsSheet ref={settingsSheetRef} onClose={onSheetClose} />
      <PreferencesSheet ref={preferencesSheetRef} onClose={onSheetClose} />
      <ProfileSheet ref={profileSheetRef} onClose={onSheetClose} />
      <PaywallSheet ref={paywallSheetRef} onClose={onSheetClose} />
    </>
  );
}

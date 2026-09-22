import { useRef, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import { AddTaskSheet } from "../sheets/AddTaskSheet";
import { SelectDaySheet } from "../sheets/SelectDaySheet";
import { SelectTimeSheet } from "../sheets/SelectTimeSheet";
import { TaskSummarySheet } from "../sheets/TaskSummarySheet";
import { useSheetNav } from "./SheetNavProvider";

export function SheetManager() {
  const { onSheetClose, registerSheet } = useSheetNav();

  const addSheetRef = useRef<BottomSheet>(null);
  const daySheetRef = useRef<BottomSheet>(null);
  const timeSheetRef = useRef<BottomSheet>(null);
  const taskSummaryRef = useRef<BottomSheet>(null);

  useEffect(() => {
    registerSheet({ name: "addTask", ref: addSheetRef });
    registerSheet({ name: "selectDay", ref: daySheetRef });
    registerSheet({ name: "selectTime", ref: timeSheetRef });
    registerSheet({ name: "taskSummary", ref: taskSummaryRef });
  }, [registerSheet]);

  return (
    <>
      <AddTaskSheet ref={addSheetRef} onClose={() => onSheetClose("addTask")} />
      <SelectDaySheet ref={daySheetRef} onClose={() => onSheetClose("selectDay")} />
      <SelectTimeSheet ref={timeSheetRef} onClose={() => onSheetClose("selectTime")} />
      <TaskSummarySheet ref={taskSummaryRef} onClose={() => onSheetClose("taskSummary")} />
    </>
  );
}

// apps/mobile/src/components/home/HomeProvider.tsx
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { Task, UserProgress } from "@adhd-planner/types";
import type {  Settings, SettingsEntry } from "../../hooks/useSettings";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from "../../hooks/useTasks";
import { useUserProgress } from "../../hooks/useUserProgress";
import { useSettings } from "../../hooks/useSettings";
import type BottomSheet from "@gorhom/bottom-sheet";

export type ActiveSheet =
  | "none"
  | "addTask"
  | "recording"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "taskSummary";

type SheetEntry = { name: ActiveSheet; ref: React.RefObject<BottomSheet | null> };

interface HomeContextValue {
  // Data
  tasks: Task[];
  progress: UserProgress;
  settings: Settings;
  moodLevel: number;
  selectedTask: Task | null;
  toast: { points: number; visible: boolean };

  // Actions
  setMoodLevel: (v: number) => void;
  setSelectedTask: (t: Task | null) => void;
  showToast: (points: number) => void;
  hideToast: () => void;
  completeTask: (id: string) => Promise<{ earned: number; leveledUp: boolean } | undefined>;
  createTask: (args: { title: string; dueDate: string; dueTime: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (args: { id: string; title: string; dueDate: string; dueTime: string }) => Promise<void>;
  updateSetting: (...[key, value]: SettingsEntry) => Promise<void>;

  adminAiEnabled: boolean;

  // Sheet nav
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  onSheetClose: () => void;
  registerSheet: (entry: SheetEntry) => void;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome must be used within HomeProvider");
  return ctx;
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const [moodLevel, setMoodLevel] = useState(50);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<{ points: number; visible: boolean }>({
    points: 0,
    visible: false,
  });

  const tasks = useTasks();
  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();
  const { progress } = useUserProgress();
  const { settings, updateSetting, adminAiEnabled } = useSettings();

  // Sheet registry — SheetManager registers its refs here
  const sheetsRef = useRef<Map<ActiveSheet, React.RefObject<BottomSheet | null>>>(new Map());
  const activeSheetRef = useRef<ActiveSheet | null>(null);

  const registerSheet = useCallback((entry: SheetEntry) => {
    sheetsRef.current.set(entry.name, entry.ref);
  }, []);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    activeSheetRef.current = sheet;
    sheetsRef.current.forEach((ref, name) => {
      if (name !== sheet) ref.current?.close();
    });
    sheetsRef.current.get(sheet)?.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    activeSheetRef.current = null;
    sheetsRef.current.forEach((ref) => ref.current?.close());
  }, []);

  // Guarded version for onClose callbacks — won't close a newly-opened sheet
  const onSheetClose = useCallback(() => {
    if (activeSheetRef.current === null) {
      closeSheet();
    }
  }, [closeSheet]);

  const showToast = useCallback((points: number) => {
    setToast({ points, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  const completeTask = useCallback(
    async (id: string) => {
      const result = await completeTaskMutation({ id: id as Id<"tasks"> });
      return result ?? undefined;
    },
    [completeTaskMutation]
  );

  const createTask = useCallback(
    async (args: { title: string; dueDate: string; dueTime: string }) => {
      await createTaskMutation(args);
    },
    [createTaskMutation]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskMutation({ id: id as Id<"tasks"> });
    },
    [deleteTaskMutation]
  );

  const updateTask = useCallback(
    async (args: { id: string; title: string; dueDate: string; dueTime: string }) => {
      await updateTaskMutation({ id: args.id as Id<"tasks">, title: args.title, dueDate: args.dueDate, dueTime: args.dueTime });
    },
    [updateTaskMutation]
  );

  return (
    <HomeContext.Provider
      value={{
        tasks,
        progress,
        settings,
        adminAiEnabled,
        moodLevel,
        selectedTask,
        toast,
        setMoodLevel,
        setSelectedTask,
        showToast,
        hideToast,
        completeTask,
        createTask,
        deleteTask,
        updateTask,
        updateSetting,
        openSheet,
        closeSheet,
        onSheetClose,
        registerSheet,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}

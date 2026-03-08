// apps/mobile/src/components/home/HomeProvider.tsx
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { Task, UserProgress } from "@adhd-planner/types";
import type { Settings } from "../../hooks/useSettings";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "../../hooks/useTasks";
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
  | "settings";

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
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;

  // Sheet nav
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
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
  const { progress } = useUserProgress();
  const { settings, updateSetting } = useSettings();

  // Sheet registry — SheetManager registers its refs here
  const sheetsRef = useRef<Map<ActiveSheet, React.RefObject<BottomSheet | null>>>(new Map());

  const registerSheet = useCallback((entry: SheetEntry) => {
    sheetsRef.current.set(entry.name, entry.ref);
  }, []);

  const openSheet = useCallback((sheet: ActiveSheet) => {
    sheetsRef.current.get(sheet)?.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    sheetsRef.current.forEach((ref) => ref.current?.close());
  }, []);

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

  return (
    <HomeContext.Provider
      value={{
        tasks,
        progress,
        settings,
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
        updateSetting,
        openSheet,
        closeSheet,
        registerSheet,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}

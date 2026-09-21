// apps/mobile/src/components/home/HomeProvider.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { StreakData, Task, UserProgress } from "@adhd-planner/types";
import { usePersistedSelectedTask } from "../../hooks/usePersistedSelectedTask";
import { useWidgetSync } from "../../hooks/useWidgetSync";
import { usePremium } from "../../hooks/usePremium";
import { useQueryTime } from "../../hooks/useQueryTime";

const DEFAULT_PROGRESS: UserProgress = {
  level: 1,
  points: 0,
  pointsToNextLevel: 50,
};

interface HomeContextValue {
  // Data
  tasks: Task[];
  progress: UserProgress;
  streak: StreakData | undefined;
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
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome must be used within HomeProvider");
  return ctx;
}

/**
 * Home data: tasks, progress, mood, selected task, points toast.
 * Sheet navigation lives in SheetNavProvider; widget bridging in useWidgetSync.
 */
export function HomeProvider({ children }: { children: ReactNode }) {
  const [moodLevel, setMoodLevel] = useState(50);
  const [toast, setToast] = useState<{ points: number; visible: boolean }>({
    points: 0,
    visible: false,
  });

  const tasksData = useQuery(api.tasks.list);
  const tasks = useMemo(() => tasksData ?? [], [tasksData]);
  const [selectedTask, setSelectedTask] = usePersistedSelectedTask(tasksData);
  const createTaskMutation = useMutation(api.tasks.create);
  const completeTaskMutation = useMutation(api.tasks.completeTask);
  const deleteTaskMutation = useMutation(api.tasks.remove);
  const updateTaskMutation = useMutation(api.tasks.update);
  const progressData = useQuery(api.progress.get);
  const progress = useMemo(
    () => progressData ?? DEFAULT_PROGRESS,
    [progressData],
  );
  const nowMs = useQueryTime();
  const streak = useQuery(api.streaks.get, { nowMs });
  const { isPremium } = usePremium();

  const completeFromWidget = useCallback(
    (taskId: string) => {
      completeTaskMutation({ id: taskId as Id<"tasks"> }).catch(() => {});
    },
    [completeTaskMutation],
  );

  useWidgetSync({
    tasks,
    progress,
    selectedTask,
    moodLevel,
    streak: streak?.currentStreak ?? 0,
    isPremium,
    onMoodUpdate: setMoodLevel,
    onTaskCompleted: completeFromWidget,
  });

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
    [completeTaskMutation],
  );

  const createTask = useCallback(
    async (args: { title: string; dueDate: string; dueTime: string }) => {
      await createTaskMutation(args);
    },
    [createTaskMutation],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await deleteTaskMutation({ id: id as Id<"tasks"> });
    },
    [deleteTaskMutation],
  );

  const updateTask = useCallback(
    async (args: { id: string; title: string; dueDate: string; dueTime: string }) => {
      await updateTaskMutation({
        id: args.id as Id<"tasks">,
        title: args.title,
        dueDate: args.dueDate,
        dueTime: args.dueTime,
      });
    },
    [updateTaskMutation],
  );

  const value = useMemo(
    () => ({
      tasks,
      progress,
      streak,
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
    }),
    [
      tasks,
      progress,
      streak,
      moodLevel,
      selectedTask,
      toast,
      setSelectedTask,
      showToast,
      hideToast,
      completeTask,
      createTask,
      deleteTask,
      updateTask,
    ],
  );

  return (
    <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
  );
}

// apps/mobile/src/hooks/useWidgetSync.ts
import { useEffect } from "react";
import { AppState } from "react-native";
import type { Task, UserProgress } from "@adhd-planner/types";
import { syncWidgetData, readWidgetMoodUpdate, readWidgetTaskCompletions } from "../lib/widgetSync";
import { getLocalToday } from "../lib/dateTimeConvert";

interface WidgetSyncInputs {
  tasks: Task[];
  progress: UserProgress;
  selectedTask: Task | null;
  moodLevel: number;
  streak: number;
  isPremium: boolean;
  onMoodUpdate: (level: number) => void;
  onTaskCompleted: (taskId: string) => void;
}

/**
 * Bridges home data to the native home-screen widgets:
 * - pushes a debounced snapshot to shared storage whenever data changes
 * - replays mood updates and task completions made from the widget
 *   on mount and whenever the app returns to the foreground
 */
export function useWidgetSync({
  tasks,
  progress,
  selectedTask,
  moodLevel,
  streak,
  isPremium,
  onMoodUpdate,
  onTaskCompleted,
}: WidgetSyncInputs) {
  // Debounced to avoid flooding the main thread with rapid widget reloads
  useEffect(() => {
    const timer = setTimeout(() => {
      const todayStr = getLocalToday();
      const todayTasks = tasks.filter((t) => t.dueDate === todayStr);

      syncWidgetData({
        isPremium,
        streak,
        suggestedTask: selectedTask?.title ?? null,
        level: progress.level,
        points: progress.points,
        pointsToNextLevel: progress.pointsToNextLevel,
        moodLevel,
        todayTaskCount: todayTasks.length,
        todayCompletedCount: todayTasks.filter((t) => t.completed).length,
        tasks: todayTasks.slice(0, 10).map((t) => ({
          id: t._id,
          title: t.title,
          completed: t.completed,
        })),
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [isPremium, progress, selectedTask, streak, moodLevel, tasks]);

  useEffect(() => {
    const processWidgetUpdates = () => {
      const pendingMood = readWidgetMoodUpdate();
      if (pendingMood !== null) {
        onMoodUpdate(pendingMood);
      }

      for (const taskId of readWidgetTaskCompletions()) {
        onTaskCompleted(taskId);
      }
    };

    processWidgetUpdates();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        processWidgetUpdates();
      }
    });
    return () => subscription.remove();
  }, [onMoodUpdate, onTaskCompleted]);
}

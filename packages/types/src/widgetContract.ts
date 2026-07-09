export interface WidgetTaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface WidgetData {
  isPremium: boolean;
  streak: number;
  suggestedTask: string | null;
  level: number;
  points: number;
  pointsToNextLevel: number;
  moodLevel: number;
  todayTaskCount: number;
  todayCompletedCount: number;
  tasks?: WidgetTaskItem[];
}

export const WIDGET_STORAGE_KEYS = {
  widgetData: "@widget_data",
  pendingMood: "@pending_mood",
  pendingTaskCompletions: "@pending_task_completions",
} as const;

export type MoodLabel =
  | "Exhausted"
  | "Low Energy"
  | "Focused"
  | "Motivated"
  | "Super Motivated";

/** ponytail: thresholds are the widget contract; upgrade path is codegen from manifest */
export function getMoodLabel(value: number): MoodLabel {
  if (value <= 20) return "Exhausted";
  if (value <= 40) return "Low Energy";
  if (value <= 60) return "Focused";
  if (value <= 80) return "Motivated";
  return "Super Motivated";
}

/** Matches iOS WidgetData.moodEmoji band edges (≤ convention). */
export function getMoodEmoji(value: number): string {
  if (value <= 20) return "😢";
  if (value <= 40) return "😔";
  if (value <= 60) return "😐";
  if (value <= 80) return "🙂";
  return "😊";
}

export function formatWidgetData(data: WidgetData): string {
  return JSON.stringify(data);
}

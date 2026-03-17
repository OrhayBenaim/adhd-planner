const WIDGET_KEY = "@widget_data";
const PENDING_MOOD_KEY = "@pending_mood";
const PENDING_TASK_COMPLETIONS_KEY = "@pending_task_completions";

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
  tasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export function formatWidgetData(data: WidgetData): string {
  return JSON.stringify(data);
}

export async function syncWidgetData(data: WidgetData) {
  const json = formatWidgetData(data);

  try {
    const { setWidgetData, reloadWidgets } = require("../../modules/widget-bridge");
    setWidgetData(WIDGET_KEY, json);
    await reloadWidgets();
  } catch {
    // WidgetBridge not available (e.g. Expo Go) — no-op
  }
}

/**
 * Read a pending mood update from the widget (set via interactive mood buttons).
 * Returns the mood level (0-100) or null if no pending update.
 * Clears the pending value after reading.
 */
export function readWidgetMoodUpdate(): number | null {
  try {
    const { getWidgetData, clearWidgetData } = require("../../modules/widget-bridge");
    const value = getWidgetData(PENDING_MOOD_KEY);
    if (value == null) return null;
    clearWidgetData(PENDING_MOOD_KEY);
    const level = parseInt(value, 10);
    return isNaN(level) ? null : level;
  } catch {
    return null;
  }
}

/**
 * Read pending task completions from the widget.
 * Returns an array of task IDs or empty array.
 * Clears the pending value after reading.
 */
export function readWidgetTaskCompletions(): string[] {
  try {
    const { getWidgetData, clearWidgetData } = require("../../modules/widget-bridge");
    const value = getWidgetData(PENDING_TASK_COMPLETIONS_KEY);
    if (value == null) return [];
    clearWidgetData(PENDING_TASK_COMPLETIONS_KEY);
    const ids = JSON.parse(value);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

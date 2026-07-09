import {
  formatWidgetData,
  WIDGET_STORAGE_KEYS,
  type WidgetData,
} from "@adhd-planner/types";

export type { WidgetData } from "@adhd-planner/types";
export { formatWidgetData };

export async function syncWidgetData(data: WidgetData) {
  const json = formatWidgetData(data);

  try {
    const { setWidgetData, reloadWidgets } = require("../../modules/widget-bridge");
    setWidgetData(WIDGET_STORAGE_KEYS.widgetData, json);
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
    const value = getWidgetData(WIDGET_STORAGE_KEYS.pendingMood);
    if (value == null) return null;
    clearWidgetData(WIDGET_STORAGE_KEYS.pendingMood);
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
    const value = getWidgetData(WIDGET_STORAGE_KEYS.pendingTaskCompletions);
    if (value == null) return [];
    clearWidgetData(WIDGET_STORAGE_KEYS.pendingTaskCompletions);
    const ids = JSON.parse(value);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

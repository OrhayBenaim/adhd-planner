const WIDGET_KEY = "@widget_data";

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
}

export function formatWidgetData(data: WidgetData): string {
  return JSON.stringify(data);
}

export async function syncWidgetData(data: WidgetData) {
  const json = formatWidgetData(data);

  try {
    const { setWidgetData, reloadWidgets } = require("../../modules/widget-bridge");
    setWidgetData(WIDGET_KEY, json);
    reloadWidgets();
  } catch {
    // WidgetBridge not available (e.g. Expo Go) — no-op
  }
}

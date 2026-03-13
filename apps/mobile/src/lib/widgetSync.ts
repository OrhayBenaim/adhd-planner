import AsyncStorage from "@react-native-async-storage/async-storage";

const WIDGET_KEY = "@widget_data";

interface WidgetData {
  streak: number;
  suggestedTask: string | null;
  level: number;
  points: number;
  pointsToNextLevel: number;
}

export async function syncWidgetData(data: WidgetData) {
  await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(data));
  // TODO: Once native widget extensions are added:
  // iOS: WidgetKit.reloadAllTimelines()
  // Android: requestWidgetUpdate() via react-native-android-widget
}

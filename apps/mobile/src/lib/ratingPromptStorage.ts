import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lullio.ratingPromptHandled";

export async function readRatingPromptHandled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === "true";
}

export async function markRatingPromptHandled(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}

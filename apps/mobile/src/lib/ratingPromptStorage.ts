import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "lullio.ratingPromptHandled";
const FIRST_SEEN_AT_KEY = "lullio.ratingPromptFirstSeenAt";

export async function readRatingPromptHandled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === "true";
}

export async function markRatingPromptHandled(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}

export async function readRatingPromptFirstSeenAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(FIRST_SEEN_AT_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function writeRatingPromptFirstSeenAt(now: number): Promise<void> {
  await AsyncStorage.setItem(FIRST_SEEN_AT_KEY, String(now));
}

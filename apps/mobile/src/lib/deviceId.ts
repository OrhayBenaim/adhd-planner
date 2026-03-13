import * as Application from "expo-application";
import { Platform } from "react-native";

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  if (Platform.OS === "android") {
    cachedId = Application.getAndroidId();
  } else {
    cachedId = await Application.getIosIdForVendorAsync();
  }

  if (!cachedId) {
    throw new Error("Failed to get device ID");
  }

  return cachedId;
}

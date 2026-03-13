import * as SecureStore from "expo-secure-store";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "@adhd_device_id";

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) {
    cachedId = stored;
    return stored;
  }

  const id = uuidv4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cachedId = id;
  return id;
}

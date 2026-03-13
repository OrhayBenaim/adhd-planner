import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function usePushToken() {
  const registerToken = useMutation(api.pushTokens.register);

  useEffect(() => {
    async function register() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("[PushToken] No EAS projectId found — skipping registration");
        return;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      await registerToken({
        token,
        platform: Platform.OS,
      });
    }
    register().catch((err) => {
      console.warn("[PushToken] Registration failed:", err);
    });
  }, [registerToken]);
}

import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function usePushToken() {
  const registerToken = useMutation(api.pushTokens.register);

  useEffect(() => {
    async function register() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;

      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await registerToken({
        token,
        platform: Platform.OS,
      });
    }
    register().catch(() => {
      // Non-fatal — token registration can retry next launch
    });
  }, [registerToken]);
}

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { setSoundEnabled } from "../lib/soundStore";

export interface Settings {
  notifications: boolean;
  soundEffects: boolean;
  smartScheduling: boolean;
  sttModel: string;
}

const LOCAL_KEY = "@adhd_settings";

export function useSettings() {
  const [localSettings, setLocalSettings] = useState({
    notificationsDesired: true,
    notificationsGranted: false,
    soundEffects: true,
    sttModel: "default",
  });

  const convexSettings = useQuery(api.settings.get);
  const setUserAiEnabled = useMutation(api.settings.setUserAiEnabled);
  const setNotificationsEnabled = useMutation(api.preferences.setNotificationsEnabled);

  // Admin override — if aiEnabled is false, smart scheduling is forced off
  const adminAiEnabled = convexSettings?.aiEnabled ?? true;
  const userAiEnabled = convexSettings?.userAiEnabled ?? true;

  // Load stored preferences and OS permission status in a single effect
  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(LOCAL_KEY),
      Notifications.getPermissionsAsync(),
    ]).then(([raw, { status }]) => {
      if (!mounted) return;
      const stored = raw ? JSON.parse(raw) : {};
      setLocalSettings({
        notificationsDesired: stored.notificationsDesired ?? true,
        notificationsGranted: status === "granted",
        soundEffects: stored.soundEffects ?? true,
        sttModel: stored.sttModel ?? "default",
      });
    }).catch(() => {
      // Settings load failure is non-fatal — defaults are already set
    });
    return () => { mounted = false; };
  }, []);

  const settings: Settings = {
    notifications: localSettings.notificationsDesired && localSettings.notificationsGranted,
    soundEffects: localSettings.soundEffects,
    smartScheduling: adminAiEnabled && userAiEnabled,
    sttModel: localSettings.sttModel,
  };

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      if (key === "notifications") {
        if (value) {
          const { status } = await Notifications.requestPermissionsAsync();
          const granted = status === "granted";
          if (!granted) {
            Alert.alert(
              "Permissions required",
              "Please enable notifications in your device settings.",
            );
          }
          setLocalSettings((prev) => {
            const next = { ...prev, notificationsDesired: true, notificationsGranted: granted };
            AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
            return next;
          });
          await setNotificationsEnabled({ enabled: granted });
        } else {
          setLocalSettings((prev) => {
            const next = { ...prev, notificationsDesired: false };
            AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
            return next;
          });
          await setNotificationsEnabled({ enabled: false });
        }
      } else if (key === "smartScheduling") {
        await setUserAiEnabled({ enabled: value as boolean });
      } else if (key === "soundEffects") {
        setSoundEnabled(value as boolean);
        setLocalSettings((prev) => {
          const next = { ...prev, soundEffects: value as boolean };
          AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          return next;
        });
      } else if (key === "sttModel") {
        setLocalSettings((prev) => {
          const next = { ...prev, sttModel: value as string };
          AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
          AsyncStorage.setItem("@adhd_stt_model", value as string);
          return next;
        });
      }
    },
    [setUserAiEnabled, setNotificationsEnabled],
  );

  return { settings, updateSetting, adminAiEnabled };
}

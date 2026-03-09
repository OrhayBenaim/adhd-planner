import { useReducer, useEffect, useCallback } from "react";
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

export type SettingsEntry = {
  [K in keyof Settings]: [key: K, value: Settings[K]];
}[keyof Settings];

interface LocalSettings {
  notificationsDesired: boolean;
  notificationsGranted: boolean;
  soundEffects: boolean;
  sttModel: string;
}

type SettingsAction =
  | { type: "loaded"; stored: Partial<LocalSettings>; granted: boolean }
  | { type: "notifications_requested"; granted: boolean }
  | { type: "notifications_disabled" }
  | { type: "sound"; enabled: boolean }
  | { type: "stt_model"; model: string };

const initialState: LocalSettings = {
  notificationsDesired: true,
  notificationsGranted: false,
  soundEffects: true,
  sttModel: "default",
};



function settingsReducer(state: LocalSettings, action: SettingsAction): LocalSettings {
  let changedState = {}
  switch (action.type) {
    case "loaded":
      changedState = {
        notificationsDesired: action.stored.notificationsDesired ?? true,
        notificationsGranted: action.granted,
        soundEffects: action.stored.soundEffects ?? true,
        sttModel: action.stored.sttModel ?? "default",
      };
      break;
    case "notifications_requested":
      changedState = { notificationsDesired: true, notificationsGranted: action.granted };
      break;
    case "notifications_disabled":
      changedState = { notificationsDesired: false };
      break;
    case "sound":
      changedState = { soundEffects: action.enabled };
      break;
    case "stt_model":
      AsyncStorage.setItem("@adhd_stt_model", action.model);
      changedState = { sttModel: action.model };
      break;
  }

  const newState = {...state, ...changedState}
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(newState));

      return newState
}




export function useSettings() {
  const [localSettings, dispatch] = useReducer(settingsReducer, initialState);

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
      dispatch({ type: "loaded", stored, granted: status === "granted" });
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
    async (...[key, value]: SettingsEntry) => {
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
          dispatch({ type: "notifications_requested", granted });
          await setNotificationsEnabled({ enabled: granted });
        } else {
          dispatch({ type: "notifications_disabled" });
          await setNotificationsEnabled({ enabled: false });
        }
      } else if (key === "smartScheduling") {
        await setUserAiEnabled({ enabled: value });
      } else if (key === "soundEffects") {
        setSoundEnabled(value);
        dispatch({ type: "sound", enabled: value });
      } else if (key === "sttModel") {
        dispatch({ type: "stt_model", model: value });
      }
    },
    [setUserAiEnabled, setNotificationsEnabled],
  );

  return { settings, updateSetting, adminAiEnabled };
}

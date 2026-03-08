import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Settings {
  notifications: boolean;
  focusMode: boolean;
  soundEffects: boolean;
  smartScheduling: boolean;
}

const DEFAULT: Settings = {
  notifications: true,
  focusMode: false,
  soundEffects: true,
  smartScheduling: true,
};

const KEY = "@adhd_settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setSettings(JSON.parse(raw));
    });
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    },
    [settings]
  );

  return { settings, updateSetting };
}

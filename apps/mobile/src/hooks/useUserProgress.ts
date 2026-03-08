import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProgress, INITIAL_PROGRESS, applyPoints } from "../lib/points";

const KEY = "@adhd_progress";

export function useUserProgress() {
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setProgress(JSON.parse(raw));
    });
  }, []);

  const addPoints = useCallback(
    async (difficulty: number): Promise<{ earned: number; leveledUp: boolean }> => {
      const { next, earned, leveledUp } = applyPoints(progress, difficulty);
      setProgress(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      return { earned, leveledUp };
    },
    [progress]
  );

  return { progress, addPoints };
}

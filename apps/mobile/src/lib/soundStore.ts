import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

let soundEnabled = true;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setSoundEnabled(v: boolean) {
  soundEnabled = v;
  emit();
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => soundEnabled,
  );
}

// Hydrate from AsyncStorage on module load
AsyncStorage.getItem("@adhd_settings").then((raw) => {
  if (raw) {
    const stored = JSON.parse(raw);
    if (stored.soundEffects === false) {
      soundEnabled = false;
      emit();
    }
  }
});

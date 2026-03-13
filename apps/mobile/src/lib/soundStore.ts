import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

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

// Hydrate from SecureStore on module load
const raw = SecureStore.getItem("adhd_settings");
if (raw) {
  try {
    const stored = JSON.parse(raw);
    if (stored.soundEffects === false) {
      soundEnabled = false;
      emit();
    }
  } catch {}
}

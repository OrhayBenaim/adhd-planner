/**
 * Android hardware back for root screens (Home, first onboarding Welcome).
 *
 * BackHandler listeners are LIFO: the last-registered handler that returns
 * true wins. Each dismissible surface registers a back step with useBackStep
 * while it is open; useExitArming registers first (on focus) and is the
 * fallback when nothing is open. Both are focus-gated so stack routes
 * (achievements, later onboarding, paywall) keep Expo Router's pop behavior.
 *
 * RN Modals (survey invite/form) handle Android back themselves via
 * onRequestClose, so they never reach these handlers.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { useFocusEffect } from "expo-router";

export const EXIT_ARMING_MS = 2000;

/**
 * While `enabled` and the screen is focused, Android back runs `onBack`
 * (one back step) instead of the default behavior.
 */
export function useBackStep(enabled: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || !enabled) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onBackRef.current();
        return true;
      });
      return () => sub.remove();
    }, [enabled]),
  );
}

/**
 * Root-screen exit arming: first back shows a toast and arms exit for
 * ~2s; a second back within the window exits the app. Call this BEFORE any
 * useBackStep in the same component so surface handlers register later and win.
 *
 * `suppressed` should be true while any dismissible surface is open — it
 * clears arming so closing UI can never accidentally exit.
 */
export function useExitArming(suppressed: boolean): { exitToastVisible: boolean } {
  const [armedUntil, setArmedUntil] = useState<number | null>(null);
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const armedRef = useRef(armedUntil);
  armedRef.current = armedUntil;

  useEffect(() => {
    if (suppressed) {
      setArmedUntil(null);
      setExitToastVisible(false);
    }
  }, [suppressed]);

  useEffect(() => {
    if (!exitToastVisible) return;
    const t = setTimeout(() => setExitToastVisible(false), EXIT_ARMING_MS);
    return () => clearTimeout(t);
  }, [exitToastVisible]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (armedRef.current != null && Date.now() < armedRef.current) {
          BackHandler.exitApp();
        } else {
          setArmedUntil(Date.now() + EXIT_ARMING_MS);
          setExitToastVisible(true);
        }
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return { exitToastVisible };
}

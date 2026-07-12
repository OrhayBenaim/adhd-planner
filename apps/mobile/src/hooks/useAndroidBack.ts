/**
 * Android hardware back on root screens (Home, first Welcome).
 *
 * Pattern from React Navigation / RN docs: one focus-gated BackHandler.
 * If `onDismiss` returns true, the press was consumed (e.g. sheet closed).
 * Otherwise first press arms exit (~2s toast); second exits the app.
 *
 * Stack routes keep Expo Router's pop. RN Modals handle back via onRequestClose.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { useFocusEffect } from "expo-router";

const EXIT_ARMING_MS = 2000;

export function useAndroidRootBack(
  onDismiss: () => boolean,
): { exitToastVisible: boolean } {
  const [armedUntil, setArmedUntil] = useState<number | null>(null);
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const armedRef = useRef(armedUntil);
  armedRef.current = armedUntil;

  useEffect(() => {
    if (!exitToastVisible) return;
    const t = setTimeout(() => setExitToastVisible(false), EXIT_ARMING_MS);
    return () => clearTimeout(t);
  }, [exitToastVisible]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (onDismissRef.current()) {
          setArmedUntil(null);
          setExitToastVisible(false);
          return true;
        }
        if (armedRef.current != null && Date.now() < armedRef.current) {
          BackHandler.exitApp();
          return true;
        }
        setArmedUntil(Date.now() + EXIT_ARMING_MS);
        setExitToastVisible(true);
        return true;
      });

      return () => sub.remove();
    }, []),
  );

  return { exitToastVisible };
}

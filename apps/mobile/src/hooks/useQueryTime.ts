import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Query arguments must stay stable across renders, but time-based limits
// still need to refresh while the app is open and after returning to it.
export function useQueryTime() {
  const [nowMs, setNowMs] = useState(Date.now);

  useEffect(() => {
    const refresh = () => setNowMs(Date.now());
    const timer = setInterval(() => {
      if (AppState.currentState === "active") refresh();
    }, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return nowMs;
}

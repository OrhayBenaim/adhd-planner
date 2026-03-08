// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const CONVEX_TOKEN_URL = `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`;

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);

  // When app returns to foreground, block Convex queries until session is refreshed
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        setIsRefreshing(true);
        authClient.getSession().finally(() => setIsRefreshing(false));
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      let token = session?.session?.token;

      if (forceRefreshToken || !token) {
        const fresh = await authClient.getSession();
        token = fresh?.data?.session?.token;
      }

      if (!token) return null;
      try {
        const res = await fetch(CONVEX_TOKEN_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return data.token ?? null;
      } catch (e) {
        console.error("[fetchAccessToken] error:", e);
        return null;
      }
    },
    [session]
  );

  return {
    isLoading: isPending || isRefreshing,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

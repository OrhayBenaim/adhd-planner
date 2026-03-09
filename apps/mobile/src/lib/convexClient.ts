// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const CONVEX_TOKEN_URL = `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`;

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();
  const appState = useRef(AppState.currentState);

  // Pre-warm the session cache on resume so fetchAccessToken has a fresh token
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current === "background" &&
        nextState === "active"
      ) {
        authClient.getSession();
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
        if (__DEV__) console.error("[fetchAccessToken] error:", e);
        return null;
      }
    },
    [session]
  );

  return {
    isLoading: isPending,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

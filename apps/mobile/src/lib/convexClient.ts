// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const CONVEX_TOKEN_URL = `${process.env.EXPO_PUBLIC_CONVEX_SITE_URL}/api/auth/convex/token`;

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session?.session?.token) return null;
      try {
        const res = await fetch(CONVEX_TOKEN_URL, {
          headers: { Authorization: `Bearer ${session.session.token}` },
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
    isLoading: isPending,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  const fetchAccessToken = useCallback(
    async (_opts: { forceRefreshToken: boolean }) => {
      try {
        const res = await authClient.$fetch<{ token: string }>(
          "/api/auth/convex/token"
        );
        return res.data?.token ?? null;
      } catch {
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

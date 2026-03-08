// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isPending && !session && !isSigningIn) {
      setIsSigningIn(true);
      authClient.signIn
        .anonymous()
        .catch(console.error)
        .finally(() => setIsSigningIn(false));
    }
  }, [session, isPending, isSigningIn]);

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
    isLoading: isPending || isSigningIn,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

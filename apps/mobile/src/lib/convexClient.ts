// apps/mobile/src/lib/convexClient.ts
import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect } from "react";
import { authClient } from "./authClient";

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

export function useConvexAuth() {
  const { data: session, isPending } = authClient.useSession();

  // Trigger anonymous sign-in as a side effect — no state needed
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch(console.error);
    }
  }, [session, isPending]);

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

  // Treat "no session yet" as loading — prevents Convex from firing
  // unauthenticated queries during the sign-in window.
  // useEffect runs after render, so we can't use state for this — it
  // would create a one-render gap where isLoading is briefly false.
  const needsSignIn = !isPending && !session;

  return {
    isLoading: isPending || needsSignIn,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

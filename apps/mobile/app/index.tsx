import * as Sentry from "@sentry/react-native";
import { useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding, usePreferences } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home/HomeScreen";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { identify } from "../src/lib/analytics";
import {
  hasLinkedAccountSession,
  markHadLinkedAccount,
  readHadLinkedAccountMarker,
} from "../src/lib/sessionState";

const SESSION_RECOVERY_HREF =
  "/sign-in-gate?mode=signIn&returnTo=home&reason=session";
const SESSION_RECOVERY_GRACE_MS = 15_000;

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
  const needsOnboarding = useNeedsOnboarding();
  const preferences = usePreferences();
  const [hadLinkedAccount, setHadLinkedAccount] = useState<boolean | null>(null);
  const [sessionRecoveryTimedOut, setSessionRecoveryTimedOut] = useState(false);
  const anonymousSignInAttemptedRef = useRef(false);
  const hasLinkedSession = hasLinkedAccountSession(session);
  const isWaitingForLinkedSession =
    !isPending && !session && hadLinkedAccount === true;

  useEffect(() => {
    let isCancelled = false;

    async function syncAuthBootstrapState() {
      if (isPending) return;

      if (hasLinkedSession) {
        setSessionRecoveryTimedOut(false);
        setHadLinkedAccount(true);
        await markHadLinkedAccount();
        return;
      }

      const marker = await readHadLinkedAccountMarker();
      if (isCancelled) return;

      setHadLinkedAccount(marker);
      if (!session && !marker && !anonymousSignInAttemptedRef.current) {
        anonymousSignInAttemptedRef.current = true;
        await authClient.signIn.anonymous();
      }
    }

    syncAuthBootstrapState().catch((e: unknown) => {
      Sentry.captureException(e);
      if (!isCancelled) {
        setHadLinkedAccount(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [hasLinkedSession, isPending, session]);

  useEffect(() => {
    if (!isWaitingForLinkedSession) {
      setSessionRecoveryTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setSessionRecoveryTimedOut(true);
    }, SESSION_RECOVERY_GRACE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [isWaitingForLinkedSession]);

  // Identify user in PostHog when session is available
  useEffect(() => {
    if (session?.user?.id) {
      identify(session.user.id);
    }
  }, [session?.user?.id]);

  if (isWaitingForLinkedSession && sessionRecoveryTimedOut) {
    return <Redirect href={SESSION_RECOVERY_HREF} />;
  }

  // Show loader until both better-auth session AND Convex auth are ready.
  // This prevents auth-requiring queries from running during session transitions
  // (sign-out, account linking) when the Convex JWT is briefly invalid.
  if (
    isPending ||
    hadLinkedAccount === null ||
    !session ||
    isConvexLoading ||
    !isAuthenticated ||
    needsOnboarding === undefined ||
    preferences === undefined
  ) {
    return <LoadingScreen />;
  }

  if (needsOnboarding === true) return <Redirect href={"/(onboarding)/welcome"} />;

  return <HomeScreen />;
}

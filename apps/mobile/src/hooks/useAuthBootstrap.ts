import * as Sentry from "@sentry/react-native";
import { useEffect, useRef, useState } from "react";
import { useConvexAuth } from "convex/react";
import { authClient } from "../lib/authClient";
import { identify } from "../lib/analytics";
import {
  deriveAuthBootstrapStatus,
  SESSION_RECOVERY_GRACE_MS,
  SESSION_RECOVERY_HREF,
  type AuthBootstrapStatus,
} from "../lib/authBootstrap";
import {
  hasLinkedAccountSession,
  markHadLinkedAccount,
  readHadLinkedAccountMarker,
} from "../lib/sessionState";
import { useNeedsOnboarding, usePreferences } from "./usePreferences";

export interface AuthBootstrapResult {
  status: AuthBootstrapStatus;
  recoveryHref: typeof SESSION_RECOVERY_HREF;
}

export function useAuthBootstrap(): AuthBootstrapResult {
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
        const { error } = await authClient.signIn.anonymous();
        if (error) throw error;
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

  useEffect(() => {
    if (session?.user?.id) {
      identify(session.user.id);
    }
  }, [session?.user?.id]);

  const status = deriveAuthBootstrapStatus({
    sessionPending: isPending,
    hasSession: !!session,
    hadLinkedAccountMarker: hadLinkedAccount,
    isConvexLoading,
    isAuthenticated,
    needsOnboarding,
    preferencesReady: preferences !== undefined,
    sessionRecoveryTimedOut,
  });

  return { status, recoveryHref: SESSION_RECOVERY_HREF };
}

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

const ANONYMOUS_SIGN_IN_RETRY_MS = 5_000;

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
  const [anonymousSignInRetry, setAnonymousSignInRetry] = useState(0);
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
        if (error) {
          // A brand-new user has no account to recover — retry instead of
          // falling into the linked-session recovery path.
          Sentry.captureException(
            new Error(`Anonymous sign-in failed (${error.status})`),
            { extra: { error } },
          );
          anonymousSignInAttemptedRef.current = false;
          if (!isCancelled) {
            retryTimeout = setTimeout(
              () => setAnonymousSignInRetry((n) => n + 1),
              ANONYMOUS_SIGN_IN_RETRY_MS,
            );
          }
        }
      }
    }

    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    syncAuthBootstrapState().catch((e: unknown) => {
      Sentry.captureException(e);
      if (!isCancelled) {
        setHadLinkedAccount(true);
      }
    });

    return () => {
      isCancelled = true;
      clearTimeout(retryTimeout);
    };
  }, [hasLinkedSession, isPending, session, anonymousSignInRetry]);

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

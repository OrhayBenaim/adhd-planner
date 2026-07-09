export type AuthBootstrapStatus = "loading" | "recovery" | "onboarding" | "home";

export interface AuthBootstrapInputs {
  sessionPending: boolean;
  hasSession: boolean;
  hadLinkedAccountMarker: boolean | null;
  isConvexLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean | undefined;
  preferencesReady: boolean;
  sessionRecoveryTimedOut: boolean;
}

export const SESSION_RECOVERY_HREF =
  "/sign-in-gate?mode=signIn&returnTo=home&reason=session";
export const SESSION_RECOVERY_GRACE_MS = 15_000;

export function deriveAuthBootstrapStatus(
  inputs: AuthBootstrapInputs,
): AuthBootstrapStatus {
  const isWaitingForLinkedSession =
    !inputs.sessionPending &&
    !inputs.hasSession &&
    inputs.hadLinkedAccountMarker === true;

  if (isWaitingForLinkedSession && inputs.sessionRecoveryTimedOut) {
    return "recovery";
  }

  if (
    inputs.sessionPending ||
    inputs.hadLinkedAccountMarker === null ||
    !inputs.hasSession ||
    inputs.isConvexLoading ||
    !inputs.isAuthenticated ||
    inputs.needsOnboarding === undefined ||
    !inputs.preferencesReady
  ) {
    return "loading";
  }

  if (inputs.needsOnboarding === true) {
    return "onboarding";
  }

  return "home";
}

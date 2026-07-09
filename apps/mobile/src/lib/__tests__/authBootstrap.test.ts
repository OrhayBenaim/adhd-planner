import {
  deriveAuthBootstrapStatus,
  type AuthBootstrapInputs,
  type AuthBootstrapStatus,
} from "../authBootstrap";

function inputs(overrides: Partial<AuthBootstrapInputs> = {}): AuthBootstrapInputs {
  return {
    sessionPending: false,
    hasSession: true,
    hadLinkedAccountMarker: false,
    isConvexLoading: false,
    isAuthenticated: true,
    needsOnboarding: false,
    preferencesReady: true,
    sessionRecoveryTimedOut: false,
    ...overrides,
  };
}

function expectStatus(
  overrides: Partial<AuthBootstrapInputs>,
  expected: AuthBootstrapStatus,
): void {
  expect(deriveAuthBootstrapStatus(inputs(overrides))).toBe(expected);
}

describe("deriveAuthBootstrapStatus", () => {
  describe("session pending", () => {
    it("returns loading while the auth session is pending", () => {
      expectStatus({ sessionPending: true }, "loading");
    });
  });

  describe("marker not yet read", () => {
    it("returns loading while had-linked-account marker is unknown", () => {
      expectStatus({ hadLinkedAccountMarker: null }, "loading");
    });
  });

  describe("no session + no marker (new user)", () => {
    it("stays loading while anonymous sign-in runs", () => {
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: false,
          isAuthenticated: false,
          needsOnboarding: undefined,
          preferencesReady: false,
        },
        "loading",
      );
    });
  });

  describe("no session + marker true (session recovery)", () => {
    it("returns loading within the grace period", () => {
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: true,
          sessionRecoveryTimedOut: false,
        },
        "loading",
      );
    });

    it("returns recovery after the grace period elapses", () => {
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: true,
          sessionRecoveryTimedOut: true,
        },
        "recovery",
      );
    });
  });

  describe("marker read failure (fail toward recovery)", () => {
    it("treats marker true like a linked-account user awaiting session", () => {
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: true,
          sessionRecoveryTimedOut: false,
        },
        "loading",
      );
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: true,
          sessionRecoveryTimedOut: true,
        },
        "recovery",
      );
    });
  });

  describe("backend handshake lagging session", () => {
    it("returns loading while Convex auth is loading", () => {
      expectStatus({ isConvexLoading: true }, "loading");
    });

    it("returns loading while Convex auth is not yet authenticated", () => {
      expectStatus({ isAuthenticated: false }, "loading");
    });
  });

  describe("preferences not yet loaded", () => {
    it("returns loading while needsOnboarding is undefined", () => {
      expectStatus({ needsOnboarding: undefined }, "loading");
    });

    it("returns loading while preferences are not ready", () => {
      expectStatus({ preferencesReady: false }, "loading");
    });
  });

  describe("linked session present", () => {
    it("returns home when onboarding is not needed", () => {
      expectStatus(
        {
          hasSession: true,
          hadLinkedAccountMarker: true,
          needsOnboarding: false,
        },
        "home",
      );
    });

    it("returns onboarding when onboarding is needed", () => {
      expectStatus(
        {
          hasSession: true,
          hadLinkedAccountMarker: true,
          needsOnboarding: true,
        },
        "onboarding",
      );
    });
  });

  describe("anonymous session present", () => {
    it("returns home when onboarding is complete", () => {
      expectStatus(
        {
          hasSession: true,
          hadLinkedAccountMarker: false,
          needsOnboarding: false,
        },
        "home",
      );
    });

    it("returns onboarding when onboarding is needed", () => {
      expectStatus(
        {
          hasSession: true,
          hadLinkedAccountMarker: false,
          needsOnboarding: true,
        },
        "onboarding",
      );
    });
  });

  describe("recovery takes precedence over loading gates", () => {
    it("returns recovery even when other inputs would keep loading", () => {
      expectStatus(
        {
          hasSession: false,
          hadLinkedAccountMarker: true,
          sessionRecoveryTimedOut: true,
          isConvexLoading: true,
          isAuthenticated: false,
          needsOnboarding: undefined,
          preferencesReady: false,
        },
        "recovery",
      );
    });
  });
});

/**
 * Auth flow — pure core.
 *
 * Sub-view navigation (options ↔ username) and in-flight social auth are
 * modeled as pure transitions: (state, event) -> { state, effects }.
 * AuthFlow.tsx interprets effects; everything here is testable without React.
 */

export type AuthFlowMode = "signIn" | "link";

export type AuthFlowView = "options" | "username";

export type UsernameView = "signIn" | "signUp";

export type AuthFlowStatus = "idle" | "busy" | "success";

export interface AuthFlowState {
  mode: AuthFlowMode;
  view: AuthFlowView;
  usernameView: UsernameView;
  status: AuthFlowStatus;
}

export type AuthFlowEvent =
  | { type: "CHOOSE_USERNAME" }
  | { type: "GO_BACK" }
  | { type: "SWITCH_USERNAME_VIEW"; view: UsernameView }
  | { type: "AUTH_STARTED" }
  | { type: "AUTH_SUCCEEDED" }
  | { type: "AUTH_FAILED" };

export type AuthFlowEffect = { type: "onSuccess" };

export interface AuthFlowTransition {
  state: AuthFlowState;
  effects: AuthFlowEffect[];
}

export function initialAuthFlowState(mode: AuthFlowMode): AuthFlowState {
  return {
    mode,
    view: "options",
    usernameView: mode === "link" ? "signUp" : "signIn",
    status: "idle",
  };
}

export function transitionAuthFlow(
  state: AuthFlowState,
  event: AuthFlowEvent,
): AuthFlowTransition {
  switch (event.type) {
    case "CHOOSE_USERNAME":
      return {
        state: { ...state, view: "username", usernameView: defaultUsernameView(state.mode) },
        effects: [],
      };

    case "GO_BACK":
      if (state.status === "busy") {
        return { state, effects: [] };
      }
      return {
        state: { ...state, view: "options", status: "idle" },
        effects: [],
      };

    case "SWITCH_USERNAME_VIEW":
      return {
        state: { ...state, view: "username", usernameView: event.view },
        effects: [],
      };

    case "AUTH_STARTED":
      return {
        state: { ...state, status: "busy" },
        effects: [],
      };

    case "AUTH_FAILED":
      return {
        state: { ...state, status: "idle", view: "options" },
        effects: [],
      };

    case "AUTH_SUCCEEDED":
      return {
        state: { ...state, status: "success" },
        effects: [{ type: "onSuccess" }],
      };

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

function defaultUsernameView(mode: AuthFlowMode): UsernameView {
  return mode === "link" ? "signUp" : "signIn";
}

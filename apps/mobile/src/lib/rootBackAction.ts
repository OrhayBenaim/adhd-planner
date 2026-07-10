/**
 * Android root-screen back — pure decision core.
 *
 * Given a snapshot of what's open on a root screen (Home / Welcome), returns
 * exactly one next action. Callers interpret effects (BackHandler, toast, etc.).
 *
 * Priority is outermost-first (overlays before sheets before exit arming).
 * Transient points / "no tasks" toasts are intentionally absent from the snapshot.
 */
import type { FlowStep } from "./taskCreationFlow";
import type { AuthFlowView } from "./authFlow";

export const EXIT_ARMING_MS = 2000;

export type ActiveSheetName =
  | "none"
  | "addTask"
  | "selectDay"
  | "selectTime"
  | "allTasks"
  | "settings"
  | "preferences"
  | "taskSummary"
  | "profile"
  | "insights";

export type ProfileSubView = "main" | "linkOptions" | "signInOptions";
export type WelcomeSubView = "welcome" | "signIn";

export type BackAction =
  | { type: "armExit" }
  | { type: "exitApp" }
  | { type: "skipTour" }
  | { type: "dismissSurveyInvite" }
  | { type: "dismissSurveyForm" }
  | { type: "dismissRatingPrompt" }
  | { type: "rewindTaskFlow" }
  | { type: "closeSheetAndIdleFlow" }
  | { type: "closeSheet" }
  | { type: "authGoBack" }
  | { type: "profileToMain" }
  | { type: "collapseVoiceLanguages" }
  | { type: "welcomeToForm" };

export interface RootBackState {
  now: number;
  /** Timestamp until which a second back exits; null when not armed. */
  exitArmedUntil: number | null;

  surveyFormOpen?: boolean;
  surveyInviteOpen?: boolean;
  ratingPromptVisible?: boolean;
  tourActive?: boolean;

  activeSheet?: ActiveSheetName;
  taskFlowStep?: FlowStep;

  profileSubView?: ProfileSubView;
  profileAuthView?: AuthFlowView;
  settingsVoiceExpanded?: boolean;

  welcomeSubView?: WelcomeSubView;
  welcomeAuthView?: AuthFlowView;
}

const TASK_FLOW_SHEETS = new Set<ActiveSheetName>([
  "addTask",
  "selectDay",
  "selectTime",
  "taskSummary",
]);

function isSheetOpen(sheet: ActiveSheetName | undefined): sheet is Exclude<ActiveSheetName, "none"> {
  return sheet != null && sheet !== "none";
}

function resolveSheetAction(state: RootBackState): BackAction | null {
  const sheet = state.activeSheet;
  if (!isSheetOpen(sheet)) return null;

  if (sheet === "profile") {
    const sub = state.profileSubView ?? "main";
    if (sub === "linkOptions" || sub === "signInOptions") {
      if (state.profileAuthView === "username") {
        return { type: "authGoBack" };
      }
      return { type: "profileToMain" };
    }
    return { type: "closeSheet" };
  }

  if (sheet === "settings" && state.settingsVoiceExpanded) {
    return { type: "collapseVoiceLanguages" };
  }

  if (TASK_FLOW_SHEETS.has(sheet)) {
    const step = state.taskFlowStep ?? "idle";
    if (step === "addTask" || step === "idle") {
      return { type: "closeSheetAndIdleFlow" };
    }
    return { type: "rewindTaskFlow" };
  }

  return { type: "closeSheet" };
}

function resolveWelcomeAction(state: RootBackState): BackAction | null {
  if (state.welcomeSubView !== "signIn") return null;
  if (state.welcomeAuthView === "username") {
    return { type: "authGoBack" };
  }
  return { type: "welcomeToForm" };
}

function resolveExitAction(state: RootBackState): BackAction {
  if (state.exitArmedUntil != null && state.now < state.exitArmedUntil) {
    return { type: "exitApp" };
  }
  return { type: "armExit" };
}

/**
 * Decide the single next Android-back action for a root screen snapshot.
 * Stack routes are not represented — Expo Router owns those.
 */
export function resolveBackAction(state: RootBackState): BackAction {
  if (state.surveyFormOpen) return { type: "dismissSurveyForm" };
  if (state.surveyInviteOpen) return { type: "dismissSurveyInvite" };
  if (state.tourActive) return { type: "skipTour" };

  const sheetAction = resolveSheetAction(state);
  if (sheetAction) return sheetAction;

  if (state.ratingPromptVisible) return { type: "dismissRatingPrompt" };

  const welcomeAction = resolveWelcomeAction(state);
  if (welcomeAction) return welcomeAction;

  return resolveExitAction(state);
}

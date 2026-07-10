import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import {
  EXIT_ARMING_MS,
  resolveBackAction,
  type BackAction,
  type RootBackState,
} from "../../lib/rootBackAction";

export interface AndroidRootBackHandlers {
  skipTour?: () => void;
  dismissSurveyInvite?: () => void;
  dismissSurveyForm?: () => void;
  dismissRatingPrompt?: () => void;
  rewindTaskFlow?: () => void;
  closeSheetAndIdleFlow?: () => void;
  closeSheet?: () => void;
  authGoBack?: () => void;
  profileToMain?: () => void;
  collapseVoiceLanguages?: () => void;
  welcomeToForm?: () => void;
  exitApp?: () => void;
}

/**
 * Wires Android hardware back on a root screen to resolveBackAction.
 * Returns whether the exit-arming toast should show.
 *
 * `dismissibleOpen` should be true whenever any dismissible surface is visible
 * so opening one clears exit arming (spec story 20).
 */
export function useAndroidRootBack(
  getState: () => Omit<RootBackState, "now" | "exitArmedUntil">,
  handlers: AndroidRootBackHandlers,
  dismissibleOpen: boolean,
): { exitToastVisible: boolean } {
  const [exitArmedUntil, setExitArmedUntil] = useState<number | null>(null);
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const armedRef = useRef(exitArmedUntil);
  armedRef.current = exitArmedUntil;

  const getStateRef = useRef(getState);
  getStateRef.current = getState;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const clearArming = useCallback(() => {
    setExitArmedUntil(null);
    setExitToastVisible(false);
  }, []);

  useEffect(() => {
    if (dismissibleOpen) clearArming();
  }, [dismissibleOpen, clearArming]);

  useEffect(() => {
    if (!exitToastVisible) return;
    const t = setTimeout(() => setExitToastVisible(false), EXIT_ARMING_MS);
    return () => clearTimeout(t);
  }, [exitToastVisible]);

  const interpret = useCallback(
    (action: BackAction) => {
      const h = handlersRef.current;
      switch (action.type) {
        case "armExit": {
          const until = Date.now() + EXIT_ARMING_MS;
          setExitArmedUntil(until);
          setExitToastVisible(true);
          return;
        }
        case "exitApp":
          clearArming();
          if (h.exitApp) h.exitApp();
          else BackHandler.exitApp();
          return;
        case "skipTour":
          clearArming();
          h.skipTour?.();
          return;
        case "dismissSurveyInvite":
          clearArming();
          h.dismissSurveyInvite?.();
          return;
        case "dismissSurveyForm":
          clearArming();
          h.dismissSurveyForm?.();
          return;
        case "dismissRatingPrompt":
          clearArming();
          h.dismissRatingPrompt?.();
          return;
        case "rewindTaskFlow":
          clearArming();
          h.rewindTaskFlow?.();
          return;
        case "closeSheetAndIdleFlow":
          clearArming();
          h.closeSheetAndIdleFlow?.();
          return;
        case "closeSheet":
          clearArming();
          h.closeSheet?.();
          return;
        case "authGoBack":
          clearArming();
          h.authGoBack?.();
          return;
        case "profileToMain":
          clearArming();
          h.profileToMain?.();
          return;
        case "collapseVoiceLanguages":
          clearArming();
          h.collapseVoiceLanguages?.();
          return;
        case "welcomeToForm":
          clearArming();
          h.welcomeToForm?.();
          return;
        default: {
          const _exhaustive: never = action;
          return _exhaustive;
        }
      }
    },
    [clearArming],
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBack = () => {
      const action = resolveBackAction({
        ...getStateRef.current(),
        now: Date.now(),
        exitArmedUntil: armedRef.current,
      });
      interpret(action);
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [interpret]);

  return { exitToastVisible };
}

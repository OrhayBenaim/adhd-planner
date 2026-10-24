// Contact us motion (spec: #54 → Motion, Figma 449:93, 456:95, 461:97).
// Every config sets ReduceMotion.Never: the reduced variants are chosen here, and
// Reanimated's default would drop the fades that reduce motion keeps.
import {
  FadeIn,
  FadeOut,
  ReduceMotion,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";
import { EASE_OUT } from "../../animations/springs";

const NEVER = ReduceMotion.Never;
const MENU_OPEN_MS = 150;
const MENU_CLOSE_MS = 120;
const CONFIRM_MS = 250;
/** The confirmation waits this long after the form starts fading. */
export const CONFIRM_DELAY_MS = 100;

const fadeIn = (ms: number, delay = 0) => FadeIn.duration(ms).delay(delay).easing(EASE_OUT).reduceMotion(NEVER);
const fadeOut = (ms: number) => FadeOut.duration(ms).easing(EASE_OUT).reduceMotion(NEVER);

/** Opacity 0 ↔ 1, scale 0.97 ↔ 1, translateY −4 ↔ 0, from the menu's top edge. */
function menuMotion(ms: number, opening: boolean): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const timing = { duration: ms, easing: EASE_OUT, reduceMotion: NEVER };
    const [from, to] = opening ? [0, 1] : [1, 0];
    return {
      initialValues: { opacity: from, transform: [{ translateY: -4 * (1 - from) }, { scale: 0.97 + 0.03 * from }] },
      animations: {
        opacity: withTiming(to, timing),
        transform: [{ translateY: withTiming(-4 * (1 - to), timing) }, { scale: withTiming(0.97 + 0.03 * to, timing) }],
      },
    };
  };
}

export const topicMenuMotion = (reduced: boolean) => reduced
  ? { entering: fadeIn(MENU_OPEN_MS), exiting: fadeOut(MENU_CLOSE_MS) }
  : { entering: menuMotion(MENU_OPEN_MS, true), exiting: menuMotion(MENU_CLOSE_MS, false) };

export const formExit = fadeOut(150);

const confirmRise: EntryExitAnimationFunction = () => {
  "worklet";
  const timing = { duration: CONFIRM_MS, easing: EASE_OUT, reduceMotion: NEVER };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
    animations: {
      opacity: withDelay(CONFIRM_DELAY_MS, withTiming(1, timing), NEVER),
      transform: [{ translateY: withDelay(CONFIRM_DELAY_MS, withTiming(0, timing), NEVER) }],
    },
  };
};

export const confirmEnter = (reduced: boolean) => reduced ? fadeIn(CONFIRM_MS, CONFIRM_DELAY_MS) : confirmRise;

/** Send-failed and invalid-email lines. No shake. */
export const errorLineEnter = fadeIn(150);

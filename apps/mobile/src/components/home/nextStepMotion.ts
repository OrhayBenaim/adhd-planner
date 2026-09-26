// Next step slot motion (spec: #39, Figma note 414:1715,
// docs/research/2026-09-26-task-change-micro-animations.md).
// Every config sets ReduceMotion.Never: the reduced variants are chosen here, and
// Reanimated's default would skip exits and jump entries, hiding the change.
import {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
  withDelay,
  withSpring,
  withTiming,
  type EntryExitAnimationFunction,
  type EntryOrExitLayoutType,
} from "react-native-reanimated";
import type { SlotTransition } from "../../lib/nextStepSlot";

const EMPH_DECEL = Easing.bezier(0.05, 0.7, 0.1, 1);
const EMPH_ACCEL = Easing.bezier(0.3, 0, 0.8, 0.15);
const SPRING_SLOT = { stiffness: 700, damping: 48, mass: 1, reduceMotion: ReduceMotion.Never };
const NEVER = ReduceMotion.Never;

/** How long a task takes to leave; whatever replaces it waits this long. */
const TASK_EXIT_MS = 150;
const EMPTY_EXIT_MS = 105;
const REDUCED_OUT_MS = 100;
const REDUCED_IN_MS = 200;

const fadeOut = (ms: number) => FadeOut.duration(ms).reduceMotion(NEVER);
const fadeIn = (ms: number, delay = 0) => FadeIn.duration(ms).delay(delay).reduceMotion(NEVER);

/** The task card leaves up and out. */
const taskExit: EntryExitAnimationFunction = () => {
  "worklet";
  const timing = { duration: TASK_EXIT_MS, easing: EMPH_ACCEL, reduceMotion: NEVER };
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, timing),
      transform: [{ translateY: withTiming(-16, timing) }, { scale: withTiming(0.98, timing) }],
    },
  };
};

/** taskToTask: the next task rises into place while the old one leaves. */
const taskEnterFromTask: EntryExitAnimationFunction = () => {
  "worklet";
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 24 }] },
    animations: {
      opacity: withDelay(60, withTiming(1, { duration: 150, easing: EMPH_DECEL, reduceMotion: NEVER }), NEVER),
      transform: [{ translateY: withDelay(60, withSpring(0, SPRING_SLOT), NEVER) }],
    },
  };
};

/** Fade in while scaling up to 1 (from 0.92 for taskToEmpty and emptyToTask). */
function scaleIn(delay: number, from = 0.92, duration = 195): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const timing = { duration, easing: EMPH_DECEL, reduceMotion: NEVER };
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, timing), NEVER),
        transform: [{ scale: withDelay(delay, withTiming(1, timing), NEVER) }],
      },
    };
  };
}

type Motion = EntryOrExitLayoutType | undefined;

// Exits are fixed per element: Reanimated uses the props from the element's last
// render, before the next transition is known. Entrances depend on the transition.

/** The task card wrapper, keyed by task id. */
export function taskMotion(transition: SlotTransition | null, reduced: boolean): { entering: Motion; exiting: Motion } {
  if (reduced) return { entering: fadeIn(REDUCED_IN_MS, REDUCED_OUT_MS), exiting: fadeOut(REDUCED_OUT_MS) };
  return {
    entering: transition === "emptyToTask" ? scaleIn(EMPTY_EXIT_MS) : taskEnterFromTask,
    exiting: taskExit,
  };
}

/** The empty-state container. It stays mounted between empty states. */
export function emptyContainerMotion(transition: SlotTransition | null, reduced: boolean): { entering: Motion; exiting: Motion } {
  const exiting = fadeOut(reduced ? REDUCED_OUT_MS : EMPTY_EXIT_MS);
  // All done choreographs its own pieces, so its container just appears.
  if (transition === "toAllDone") return { entering: undefined, exiting };
  return { entering: reduced ? fadeIn(REDUCED_IN_MS, REDUCED_OUT_MS) : scaleIn(TASK_EXIT_MS), exiting };
}

export type EmptyPart = "art" | "title" | "body" | "button";

/**
 * A piece of the empty state. Art, title and body are keyed by empty state and
 * crossfade (out 75 ms, in 150 ms). The button is keyed only on All done, so it
 * stays put between Nothing planned and No energy match.
 */
export function emptyPartMotion(part: EmptyPart, transition: SlotTransition | null, reduced: boolean): { entering: Motion; exiting: Motion } {
  const exiting = fadeOut(75);
  if (transition === "toAllDone") {
    if (reduced) return { entering: fadeIn(250, REDUCED_OUT_MS), exiting };
    return { entering: allDoneEntrance[part], exiting };
  }
  if (transition !== "emptyToEmpty" || part === "button") return { entering: undefined, exiting };
  return { entering: part === "art" && !reduced ? scaleIn(75, 0.96, 150) : fadeIn(150, 75), exiting };
}

function riseIn(delay: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EMPH_DECEL },
  }).duration(200).delay(delay).reduceMotion(NEVER);
}

/** toAllDone: the dog pops (0.8 → 1.04 → 1), then title, body and button follow 60 ms apart. */
const allDoneEntrance: Record<EmptyPart, Motion> = {
  art: new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.8 }] },
    30: { opacity: 1, transform: [{ scale: 1.04 }], easing: EMPH_DECEL },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(0.2, 0, 0, 1) },
  }).duration(450).delay(120).reduceMotion(NEVER),
  title: riseIn(250),
  body: riseIn(310),
  button: riseIn(370),
};

import { useCallback, useEffect, useState } from "react";
import type { StreakData, Task } from "@adhd-planner/types";
import { today as streakToday } from "@adhd-planner/convex/convex/lib/calendar";
import type { AiPickOutcome } from "../lib/homeExperience";
import { resolveNextStepSlot, type EmptySlotState, type NextStepContent } from "../lib/nextStepSlot";
import { useQueryTime } from "./useQueryTime";

/** How long Home waits after the mood slider is released before the Next step reacts. */
const MOOD_SETTLE_MS = 500;

interface Input {
  tasks: readonly Task[];
  streak: StreakData | undefined;
  moodLevel: number;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  selectedTaskHydrated: boolean;
  tourActive: boolean;
  evaluateAiPick: (moodLevel: number, completedTaskId?: string) => AiPickOutcome;
}

/** What Home's Next step slot shows, derived during render so it never flashes an empty state. */
export function useNextStep({
  tasks, streak, moodLevel, selectedTask, setSelectedTask, selectedTaskHydrated, tourActive, evaluateAiPick,
}: Input) {
  // The slot reacts to a committed mood once it has settled; grabbing the
  // slider again cancels the pending reaction.
  const [moodDragging, setMoodDragging] = useState(false);
  const [slotMood, setSlotMood] = useState(moodLevel);
  useEffect(() => {
    if (moodDragging) return;
    const timer = setTimeout(() => setSlotMood(moodLevel), MOOD_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moodLevel, moodDragging]);

  // The streak query reloads (undefined) each time its time argument ticks; keep
  // the last result so the slot neither remounts nor flips All done ↔ Nothing planned.
  const [knownStreak, setKnownStreak] = useState(streak);
  if (streak !== undefined && streak !== knownStreak) setKnownStreak(streak);
  const nowMs = useQueryTime();

  // Whenever nothing is selected, the best match for the mood is shown (and persisted below).
  const autoPick = evaluateAiPick(slotMood);
  const nextTask = selectedTask ?? (!tourActive && autoPick.type === "picked" ? autoPick.task : null);
  const slot: NextStepContent = nextTask
    ? { state: "task", task: nextTask }
    : {
      // Without a task the pick is never "picked", so this is an empty state.
      state: resolveNextStepSlot({
        pick: { type: "none-match-energy" },
        hasIncompleteTasks: tasks.some((t) => !t.completed),
        lastCompletionDate: knownStreak?.lastCompletionDate,
        today: streakToday(nowMs),
      }) as EmptySlotState,
    };

  useEffect(() => {
    if (!selectedTaskHydrated || selectedTask || !nextTask) return;
    setSelectedTask(nextTask);
  }, [selectedTaskHydrated, selectedTask, nextTask, setSelectedTask]);

  /** The task to select once `completedTaskId` is saved, picked in the same update. */
  const nextAfterCompleting = useCallback((completedTaskId: string): Task | null => {
    if (tourActive) return null;
    const next = evaluateAiPick(slotMood, completedTaskId);
    return next.type === "picked" ? next.task : null;
  }, [tourActive, evaluateAiPick, slotMood]);

  return {
    slot,
    /** False until the stored selection and streak are known, so launch doesn't animate. */
    ready: selectedTaskHydrated && knownStreak !== undefined,
    setMoodDragging,
    nextAfterCompleting,
  };
}

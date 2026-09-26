import { useEffect, useState } from "react";
import type { View } from "react-native";
import Animated, { LayoutAnimationConfig, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { Task } from "@adhd-planner/types";
import { resolveSlotTransition, type NextStepContent, type SlotTransition, type SlotView } from "../../lib/nextStepSlot";
import { useSoundEnabled } from "../../lib/soundStore";
import { TaskCard } from "../TaskCard";
import { NextStepEmptyState } from "./NextStepEmptyState";
import { emptyContainerMotion, taskMotion } from "./nextStepMotion";

interface Props {
  slot: NextStepContent;
  onComplete: (task: Task) => Promise<void>;
  onAdd: () => void;
  completeButtonRef?: React.Ref<View>;
}

/** Home's Next step: the task card or an empty state, animating every change. */
export function NextStepSlot({ slot, onComplete, onAdd, completeButtonRef }: Props) {
  const reduced = useReducedMotion();
  const soundEnabled = useSoundEnabled();
  const view: SlotView = slot.state === "task" ? { state: "task", taskId: slot.task._id } : { state: slot.state };

  // The transition is derived from the previous view during render, so the
  // entering animation is set on the same render that swaps the content.
  const [shown, setShown] = useState<{ view: SlotView; transition: SlotTransition | null }>({ view, transition: null });
  let current = shown;
  if (shown.view.state !== view.state || shown.view.taskId !== view.taskId) {
    current = { view, transition: resolveSlotTransition(shown.view, view) };
    setShown(current);
  }
  const { transition } = current;

  useEffect(() => {
    // Settings groups vibration with sound ("Sound & haptics").
    if (shown.transition === "toAllDone" && soundEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    // Only when the slot changes, not when the setting does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  return <LayoutAnimationConfig skipEntering>
    {slot.state === "task"
      ? <Animated.View key={slot.task._id} {...taskMotion(transition, reduced)} style={{ marginHorizontal: 24 }}>
        <TaskCard task={slot.task} onComplete={onComplete} completeButtonRef={completeButtonRef} />
      </Animated.View>
      : <Animated.View key="empty" {...emptyContainerMotion(transition, reduced)} style={{ marginHorizontal: 24 }}>
        <NextStepEmptyState state={slot.state} transition={transition} reduced={reduced} onAdd={onAdd} />
      </Animated.View>}
  </LayoutAnimationConfig>;
}

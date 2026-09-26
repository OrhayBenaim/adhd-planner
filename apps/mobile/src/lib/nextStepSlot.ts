/**
 * Home's Next step slot — pure rules.
 *
 * Which state the slot shows, and which transition plays when it changes.
 * Components only map the returned kinds to art, copy and animations.
 */
import type { Task } from "@adhd-planner/types";
import type { AiPickOutcome } from "./homeExperience";

export type NextStepSlotState = "task" | "nothingPlanned" | "noEnergyMatch" | "allDone";

export type EmptySlotState = Exclude<NextStepSlotState, "task">;

/** What the slot renders: the task, or which empty state. */
export type NextStepContent = { state: "task"; task: Task } | { state: EmptySlotState };

export interface NextStepSlotInput {
  pick: AiPickOutcome;
  hasIncompleteTasks: boolean;
  /** The streak's last completion date (YYYY-MM-DD). */
  lastCompletionDate: string | null | undefined;
  /** Today on the streak's day boundary, so All done always agrees with the streak. */
  today: string;
}

export function resolveNextStepSlot({
  pick,
  hasIncompleteTasks,
  lastCompletionDate,
  today,
}: NextStepSlotInput): NextStepSlotState {
  if (pick.type === "picked") return "task";
  if (hasIncompleteTasks) return "noEnergyMatch";
  return lastCompletionDate === today ? "allDone" : "nothingPlanned";
}

/** What the slot shows: its state, plus which task when it holds one. */
export type SlotView = { state: NextStepSlotState; taskId?: string };

export type SlotTransition =
  | "taskToTask"
  | "taskToEmpty"
  | "toAllDone"
  | "emptyToTask"
  | "emptyToEmpty";

export function resolveSlotTransition(prev: SlotView, next: SlotView): SlotTransition | null {
  if (prev.state === next.state && prev.taskId === next.taskId) return null;
  if (next.state === "allDone") return "toAllDone";
  if (prev.state === "task") return next.state === "task" ? "taskToTask" : "taskToEmpty";
  return next.state === "task" ? "emptyToTask" : "emptyToEmpty";
}

/**
 * Home screen — pure decision core.
 *
 * AI task-pick eligibility/selection and ceiling/unscored banner policy.
 * Current time and config are passed in as arguments for determinism.
 */
import type { Task } from "@adhd-planner/types";

/** Debounce before showing the unscored-task banner (timer lives in the hook). */
export const UNSCORED_BANNER_DELAY_MS = 5 * 60 * 1000;

export type AiPickOutcome =
  | { type: "picked"; task: Task }
  | { type: "none-in-window"; daysAhead: number }
  | { type: "none-match-energy" };

export interface AiPickInput {
  tasks: readonly Task[];
  moodLevel: number;
  today: string;
  daysAhead: number;
  excludeTaskId?: string;
  /** Just completed: never picked, even if the task list has not caught up yet. */
  completedTaskId?: string;
}

export interface BannerVisibilityInput {
  atCeiling: boolean;
  ceilingReason?: string;
  showUnscoredBanner: boolean;
}

export type BannerVisibility = { visible: false } | { visible: true; ceilingReason?: string };

/** Local calendar date N days after `today` (YYYY-MM-DD). */
export function dateStringDaysAhead(today: string, daysAhead: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function hasUnscoredTasks(tasks: readonly Task[]): boolean {
  return tasks.some((t) => !t.completed && t.difficulty === -1);
}

export function pickTaskForMood({
  tasks,
  moodLevel,
  today,
  daysAhead,
  excludeTaskId,
  completedTaskId,
}: AiPickInput): AiPickOutcome {
  const cutoff = dateStringDaysAhead(today, daysAhead);

  const eligible = tasks
    .filter(
      (t) =>
        !t.completed &&
        t._id !== completedTaskId &&
        t.difficulty >= 0 &&
        t.dueDate >= today &&
        t.dueDate <= cutoff,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (!eligible.length) {
    return { type: "none-in-window", daysAhead };
  }

  const best = eligible.find((t) => t.difficulty <= moodLevel && t._id !== excludeTaskId)
    ?? eligible.find((t) => t.difficulty <= moodLevel);
  if (!best) {
    return { type: "none-match-energy" };
  }

  return { type: "picked", task: best };
}

export function resolveBannerVisibility({
  atCeiling,
  ceilingReason,
  showUnscoredBanner,
}: BannerVisibilityInput): BannerVisibility {
  if (!atCeiling && !showUnscoredBanner) {
    return { visible: false };
  }

  return {
    visible: true,
    ceilingReason: atCeiling ? ceilingReason : undefined,
  };
}

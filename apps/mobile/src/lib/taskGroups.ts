/**
 * Grouping for the My plan list (Figma 280:724): open tasks bucketed by how
 * soon they are due, in calendar order.
 *
 * Due dates are LOCAL calendar dates (see dateTimeConvert), so the buckets are
 * derived from getLocalToday() and compared as plain YYYY-MM-DD strings — that
 * ordering is lexicographic, which is what makes the comparisons below safe.
 */
import type { Task } from "@adhd-planner/types";
import { getLocalDateStringDaysAhead, getLocalToday } from "./dateTimeConvert";

export const TASK_GROUP_LABELS = [
  "Overdue",
  "Today",
  "Tomorrow",
  "Later this week",
  "Later",
] as const;

export type TaskGroupLabel = (typeof TASK_GROUP_LABELS)[number];

export interface TaskGroup {
  label: TaskGroupLabel;
  tasks: Task[];
}

function labelFor(dueDate: string): TaskGroupLabel {
  if (!dueDate) return "Later";
  const today = getLocalToday();
  if (dueDate < today) return "Overdue";
  if (dueDate === today) return "Today";
  if (dueDate === getLocalDateStringDaysAhead(1)) return "Tomorrow";
  if (dueDate <= getLocalDateStringDaysAhead(7)) return "Later this week";
  return "Later";
}

/** Tasks grouped by due bucket, each group sorted by date then time. Empty groups are dropped. */
export function groupTasksByDue(tasks: Task[]): TaskGroup[] {
  const buckets = new Map<TaskGroupLabel, Task[]>();
  for (const task of tasks) {
    const label = labelFor(task.dueDate);
    const bucket = buckets.get(label);
    if (bucket) bucket.push(task);
    else buckets.set(label, [task]);
  }

  return TASK_GROUP_LABELS.flatMap((label) => {
    const group = buckets.get(label);
    if (!group) return [];
    group.sort((a, b) =>
      a.dueDate === b.dueDate
        ? a.dueTime.localeCompare(b.dueTime)
        : a.dueDate.localeCompare(b.dueDate),
    );
    return [{ label, tasks: group }];
  });
}

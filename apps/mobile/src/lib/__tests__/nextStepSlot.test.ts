import type { Task } from "@adhd-planner/types";
import type { AiPickOutcome } from "../homeExperience";
import {
  resolveNextStepSlot,
  resolveSlotTransition,
  type NextStepSlotState,
  type SlotView,
} from "../nextStepSlot";

const TODAY = "2026-07-09";
const YESTERDAY = "2026-07-08";

const task = { _id: "task-1", title: "Task", difficulty: 40, completed: false, dueDate: TODAY } as Task;
const picked: AiPickOutcome = { type: "picked", task };
const noMatch: AiPickOutcome = { type: "none-match-energy" };
const noneInWindow: AiPickOutcome = { type: "none-in-window", daysAhead: 7 };

function slot(
  pick: AiPickOutcome,
  hasIncompleteTasks: boolean,
  lastCompletionDate: string | null | undefined,
): NextStepSlotState {
  return resolveNextStepSlot({ pick, hasIncompleteTasks, lastCompletionDate, today: TODAY });
}

describe("resolveNextStepSlot", () => {
  it("shows the task when the mood pick found one", () => {
    expect(slot(picked, true, null)).toBe("task");
  });

  it("is No energy match when tasks exist but none fit the mood", () => {
    expect(slot(noMatch, true, null)).toBe("noEnergyMatch");
  });

  it("is No energy match when the only incomplete tasks are outside the pick window", () => {
    expect(slot(noneInWindow, true, TODAY)).toBe("noEnergyMatch");
  });

  it("is All done when nothing is left and a task was completed today", () => {
    expect(slot(noneInWindow, false, TODAY)).toBe("allDone");
  });

  it("is Nothing planned when the last completion was yesterday", () => {
    expect(slot(noneInWindow, false, YESTERDAY)).toBe("nothingPlanned");
  });

  it("is Nothing planned when nothing was ever completed", () => {
    expect(slot(noneInWindow, false, null)).toBe("nothingPlanned");
    expect(slot(noneInWindow, false, undefined)).toBe("nothingPlanned");
  });
});

describe("resolveSlotTransition", () => {
  const taskA: SlotView = { state: "task", taskId: "a" };
  const taskB: SlotView = { state: "task", taskId: "b" };
  const nothingPlanned: SlotView = { state: "nothingPlanned" };
  const noEnergyMatch: SlotView = { state: "noEnergyMatch" };
  const allDone: SlotView = { state: "allDone" };
  const empties = [nothingPlanned, noEnergyMatch, allDone];

  it("plays nothing when the slot did not change", () => {
    expect(resolveSlotTransition(taskA, { state: "task", taskId: "a" })).toBeNull();
    for (const empty of empties) expect(resolveSlotTransition(empty, { ...empty })).toBeNull();
  });

  it("advances the queue when one task replaces another", () => {
    expect(resolveSlotTransition(taskA, taskB)).toBe("taskToTask");
  });

  it("uses taskToEmpty when a task leaves for Nothing planned or No energy match", () => {
    expect(resolveSlotTransition(taskA, nothingPlanned)).toBe("taskToEmpty");
    expect(resolveSlotTransition(taskA, noEnergyMatch)).toBe("taskToEmpty");
  });

  it("celebrates whenever the slot becomes All done", () => {
    expect(resolveSlotTransition(taskA, allDone)).toBe("toAllDone");
    expect(resolveSlotTransition(nothingPlanned, allDone)).toBe("toAllDone");
    expect(resolveSlotTransition(noEnergyMatch, allDone)).toBe("toAllDone");
  });

  it("fades through when a task fills an empty slot", () => {
    for (const empty of empties) expect(resolveSlotTransition(empty, taskA)).toBe("emptyToTask");
  });

  it("crossfades between two different empty states", () => {
    expect(resolveSlotTransition(noEnergyMatch, nothingPlanned)).toBe("emptyToEmpty");
    expect(resolveSlotTransition(nothingPlanned, noEnergyMatch)).toBe("emptyToEmpty");
    expect(resolveSlotTransition(allDone, nothingPlanned)).toBe("emptyToEmpty");
    expect(resolveSlotTransition(allDone, noEnergyMatch)).toBe("emptyToEmpty");
  });
});

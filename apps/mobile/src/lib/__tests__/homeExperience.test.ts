import type { Task } from "@adhd-planner/types";
import {
  UNSCORED_BANNER_DELAY_MS,
  dateStringDaysAhead,
  hasUnscoredTasks,
  pickTaskForMood,
  resolveBannerVisibility,
  type AiPickOutcome,
} from "../homeExperience";

const TODAY = "2026-07-09";
const DAYS_AHEAD = 7;
const CUTOFF = dateStringDaysAhead(TODAY, DAYS_AHEAD);

function makeTask(overrides: Partial<Task> & Pick<Task, "dueDate">): Task {
  return {
    _id: "task-1",
    userId: "user-1",
    title: "Task",
    difficulty: 50,
    completed: false,
    dueTime: "12:00",
    _creationTime: 1,
    ...overrides,
  };
}

function pick(
  tasks: Task[],
  moodLevel: number,
  today = TODAY,
  daysAhead = DAYS_AHEAD,
): AiPickOutcome {
  return pickTaskForMood({ tasks, moodLevel, today, daysAhead });
}

describe("pickTaskForMood", () => {
  it("picks a different matching task when one is already selected", () => {
    const current = makeTask({ _id: "current", dueDate: TODAY, difficulty: 30 });
    const next = makeTask({ _id: "next", dueDate: CUTOFF, difficulty: 40 });
    expect(pickTaskForMood({ tasks: [current, next], moodLevel: 50, today: TODAY, daysAhead: DAYS_AHEAD, excludeTaskId: current._id }))
      .toEqual({ type: "picked", task: next });
  });

  it("keeps the current task when alternatives do not match the energy level", () => {
    const current = makeTask({ _id: "current", dueDate: TODAY, difficulty: 30 });
    const hard = makeTask({ _id: "hard", dueDate: TODAY, difficulty: 90 });
    expect(pickTaskForMood({ tasks: [current, hard], moodLevel: 50, today: TODAY, daysAhead: DAYS_AHEAD, excludeTaskId: current._id }))
      .toEqual({ type: "picked", task: current });
  });

  it("never re-picks the just-completed task, even when it is the only match", () => {
    const done = makeTask({ _id: "done", dueDate: TODAY, difficulty: 30 });
    const hard = makeTask({ _id: "hard", dueDate: TODAY, difficulty: 90 });
    expect(pickTaskForMood({ tasks: [done, hard], moodLevel: 50, today: TODAY, daysAhead: DAYS_AHEAD, completedTaskId: done._id }))
      .toEqual({ type: "none-match-energy" });
    expect(pickTaskForMood({ tasks: [done], moodLevel: 50, today: TODAY, daysAhead: DAYS_AHEAD, completedTaskId: done._id }))
      .toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("picks the next task when excluding the just-completed one", () => {
    const done = makeTask({ _id: "done", dueDate: TODAY, difficulty: 30 });
    const next = makeTask({ _id: "next", dueDate: CUTOFF, difficulty: 40 });
    expect(pickTaskForMood({ tasks: [done, next], moodLevel: 50, today: TODAY, daysAhead: DAYS_AHEAD, completedTaskId: done._id }))
      .toEqual({ type: "picked", task: next });
  });

  it("returns none-in-window for an empty task list", () => {
    expect(pick([], 50)).toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("returns none-in-window when all tasks are completed", () => {
    const tasks = [
      makeTask({ _id: "a", dueDate: TODAY, completed: true }),
      makeTask({ _id: "b", dueDate: CUTOFF, completed: true }),
    ];
    expect(pick(tasks, 50)).toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("returns none-in-window when all incomplete tasks are unscored", () => {
    const tasks = [
      makeTask({ _id: "a", dueDate: TODAY, difficulty: -1 }),
      makeTask({ _id: "b", dueDate: CUTOFF, difficulty: -1 }),
    ];
    expect(pick(tasks, 50)).toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("includes a task due today", () => {
    const task = makeTask({ _id: "today", dueDate: TODAY, difficulty: 40 });
    expect(pick([task], 50)).toEqual({ type: "picked", task });
  });

  it("includes a task due exactly N days ahead (inclusive cutoff)", () => {
    const task = makeTask({ _id: "cutoff", dueDate: CUTOFF, difficulty: 40 });
    expect(pick([task], 50)).toEqual({ type: "picked", task });
  });

  it("excludes a task due N+1 days ahead", () => {
    const beyond = makeTask({
      _id: "beyond",
      dueDate: dateStringDaysAhead(TODAY, DAYS_AHEAD + 1),
      difficulty: 40,
    });
    expect(pick([beyond], 50)).toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("excludes tasks due before today", () => {
    const past = makeTask({ _id: "past", dueDate: "2026-07-08", difficulty: 40 });
    expect(pick([past], 50)).toEqual({ type: "none-in-window", daysAhead: DAYS_AHEAD });
  });

  it("picks a task whose difficulty equals the mood level", () => {
    const task = makeTask({ _id: "exact", dueDate: TODAY, difficulty: 50 });
    expect(pick([task], 50)).toEqual({ type: "picked", task });
  });

  it("returns none-match-energy when every eligible task is harder than mood", () => {
    const tasks = [
      makeTask({ _id: "hard", dueDate: TODAY, difficulty: 80 }),
      makeTask({ _id: "harder", dueDate: CUTOFF, difficulty: 90 }),
    ];
    expect(pick(tasks, 50)).toEqual({ type: "none-match-energy" });
  });

  it("sorts by due date and picks the earliest matching task", () => {
    const later = makeTask({ _id: "later", dueDate: CUTOFF, difficulty: 30 });
    const sooner = makeTask({ _id: "sooner", dueDate: TODAY, difficulty: 30 });
    expect(pick([later, sooner], 50)).toEqual({ type: "picked", task: sooner });
  });

  it("on equal due dates, preserves input order when picking by energy", () => {
    const first = makeTask({
      _id: "first",
      dueDate: TODAY,
      difficulty: 40,
      _creationTime: 1,
    });
    const second = makeTask({
      _id: "second",
      dueDate: TODAY,
      difficulty: 40,
      _creationTime: 2,
    });
    expect(pick([first, second], 50)).toEqual({ type: "picked", task: first });
    expect(pick([second, first], 50)).toEqual({ type: "picked", task: second });
  });

  it("ignores completed and unscored tasks when choosing among mixed tasks", () => {
    const picked = makeTask({ _id: "good", dueDate: TODAY, difficulty: 30 });
    const tasks = [
      makeTask({ _id: "done", dueDate: TODAY, completed: true }),
      makeTask({ _id: "unscored", dueDate: TODAY, difficulty: -1 }),
      picked,
    ];
    expect(pick(tasks, 50)).toEqual({ type: "picked", task: picked });
  });

  it("uses the configured days-ahead value in none-in-window outcomes", () => {
    expect(pick([], 50, TODAY, 1)).toEqual({ type: "none-in-window", daysAhead: 1 });
  });
});

describe("hasUnscoredTasks", () => {
  it("is false when there are no incomplete unscored tasks", () => {
    expect(hasUnscoredTasks([makeTask({ dueDate: TODAY, difficulty: 10 })])).toBe(false);
    expect(
      hasUnscoredTasks([makeTask({ dueDate: TODAY, difficulty: -1, completed: true })]),
    ).toBe(false);
  });

  it("is true when any incomplete task has difficulty -1", () => {
    expect(
      hasUnscoredTasks([
        makeTask({ dueDate: TODAY, difficulty: 10 }),
        makeTask({ _id: "u", dueDate: TODAY, difficulty: -1 }),
      ]),
    ).toBe(true);
  });
});

describe("resolveBannerVisibility", () => {
  it("hides the banner when neither ceiling nor unscored delay applies", () => {
    expect(resolveBannerVisibility({ atCeiling: false, showUnscoredBanner: false })).toEqual({
      visible: false,
    });
  });

  it("shows the banner at ceiling with the ceiling reason", () => {
    expect(
      resolveBannerVisibility({
        atCeiling: true,
        ceilingReason: "daily_limit",
        showUnscoredBanner: false,
      }),
    ).toEqual({ visible: true, ceilingReason: "daily_limit" });
  });

  it("shows the banner for unscored delay without a ceiling reason", () => {
    expect(
      resolveBannerVisibility({ atCeiling: false, showUnscoredBanner: true }),
    ).toEqual({ visible: true });
  });

  it("prefers the ceiling reason when both ceiling and unscored apply", () => {
    expect(
      resolveBannerVisibility({
        atCeiling: true,
        ceilingReason: "daily_limit",
        showUnscoredBanner: true,
      }),
    ).toEqual({ visible: true, ceilingReason: "daily_limit" });
  });
});

describe("UNSCORED_BANNER_DELAY_MS", () => {
  it("is five minutes", () => {
    expect(UNSCORED_BANNER_DELAY_MS).toBe(5 * 60 * 1000);
  });
});

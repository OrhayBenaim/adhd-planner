import {
  initialFlowState,
  type FlowState,
  type FlowEffect,
  start,
  submitInput,
  selectDay,
  selectTime,
  confirmSummary,
  editDateTime,
  editExistingTask,
  updatePendingTitle,
  removePendingTask,
  reset,
  goBack,
  buildPendingTasks,
} from "../taskCreationFlow";
import { daySelectionToDate, timeSelectionToTime } from "../dateTimeConvert";

function effectTypes(effects: FlowEffect[]): string[] {
  return effects.map((e) => e.type);
}

function openedSheet(effects: FlowEffect[]): string | undefined {
  const open = effects.find((e) => e.type === "openSheet");
  return open?.type === "openSheet" ? open.sheet : undefined;
}

describe("start", () => {
  it("resets state and opens the add-task sheet", () => {
    const { state, effects } = start();
    expect(state).toEqual({ ...initialFlowState, step: "addTask" });
    expect(effects).toEqual([{ type: "openSheet", sheet: "addTask" }]);
  });
});

describe("submitInput", () => {
  it("stores a single title and advances to day selection", () => {
    const { state, effects } = submitInput({ ...initialFlowState, step: "addTask" }, "buy milk");
    expect(state.title).toBe("buy milk");
    expect(state.pendingTasks).toHaveLength(0);
    expect(state.step).toBe("selectDay");
    expect(openedSheet(effects)).toBe("selectDay");
  });

  it("splits multi-task input into pending tasks", () => {
    const { state } = submitInput(
      { ...initialFlowState, step: "addTask" },
      "buy milk and call the dentist"
    );
    expect(state.pendingTasks.length).toBeGreaterThan(1);
    expect(state.pendingTasks.map((t) => t.title)).toEqual(["buy milk", "call the dentist"]);
    expect(state.step).toBe("selectDay");
  });
});

describe("selectDay", () => {
  const base: FlowState = { ...initialFlowState, step: "selectDay", title: "buy milk" };

  it("single task: stores the day and advances to time selection", () => {
    const { state, effects } = selectDay(base, "today");
    expect(state.selectedDay).toBe(daySelectionToDate("today"));
    expect(state.step).toBe("selectTime");
    expect(openedSheet(effects)).toBe("selectTime");
  });

  it("multiple pending tasks: applies the day to all and advances to time selection", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state } = selectDay({ ...base, pendingTasks: pending }, "tomorrow");
    const expected = daySelectionToDate("tomorrow");
    expect(state.pendingTasks.every((t) => t.dueDate === expected)).toBe(true);
    expect(state.step).toBe("selectTime");
  });

  it("editing one pending task: applies the day to it only and returns to summary", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state, effects } = selectDay(
      { ...base, pendingTasks: pending, editingTaskId: pending[0].id },
      "today"
    );
    expect(state.pendingTasks[0].dueDate).toBe(daySelectionToDate("today"));
    expect(state.pendingTasks[1].dueDate).toBe("");
    expect(state.editingTaskId).toBeNull();
    expect(openedSheet(effects)).toBe("taskSummary");
  });

  it("passes custom day strings through the converter", () => {
    const { state } = selectDay(base, "2026-08-20");
    expect(state.selectedDay).toBe("2026-08-20");
  });
});

describe("selectTime", () => {
  const base: FlowState = {
    ...initialFlowState,
    step: "selectTime",
    title: "buy milk",
    selectedDay: "2026-08-20",
  };

  it("single task: creates it with text source and ends the flow", () => {
    const { state, effects } = selectTime(base, "noon");
    expect(state).toEqual(initialFlowState);
    expect(effectTypes(effects)).toEqual(["closeSheet", "createTask"]);
    const create = effects[1];
    expect(create).toEqual({
      type: "createTask",
      task: { title: "buy milk", dueDate: "2026-08-20", dueTime: "12:00" },
      source: "text",
    });
  });

  it("multiple pending tasks: applies the time to all and advances to summary", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state, effects } = selectTime({ ...base, pendingTasks: pending }, "afternoon");
    expect(state.pendingTasks.every((t) => t.dueTime === "15:00")).toBe(true);
    expect(openedSheet(effects)).toBe("taskSummary");
  });

  it("editing one pending task: applies the time to it only and returns to summary", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state } = selectTime(
      { ...base, pendingTasks: pending, editingTaskId: pending[1].id },
      "end_of_day"
    );
    expect(state.pendingTasks[1].dueTime).toBe("21:00");
    expect(state.pendingTasks[0].dueTime).toBe("");
    expect(state.editingTaskId).toBeNull();
  });

  it("editing an existing task: updates it and ends the flow", () => {
    const { state, effects } = selectTime(
      { ...base, editingExistingTaskId: "task-123" },
      "14:30"
    );
    expect(state).toEqual(initialFlowState);
    expect(effects[1]).toEqual({
      type: "updateTask",
      task: { id: "task-123", title: "buy milk", dueDate: "2026-08-20", dueTime: "14:30" },
    });
  });

  it("maps time presets through the converter", () => {
    const { effects } = selectTime(base, "end_of_day");
    const create = effects[1];
    if (create.type !== "createTask") throw new Error("expected createTask");
    expect(create.task.dueTime).toBe(timeSelectionToTime("end_of_day"));
  });
});

describe("confirmSummary", () => {
  it("creates every pending task with voice source and ends the flow", () => {
    const pending = buildPendingTasks(["a b", "c d", "e f"]).map((t, i) => ({
      ...t,
      dueDate: "2026-08-20",
      dueTime: `0${i}:00`,
    }));
    const { state, effects } = confirmSummary({
      ...initialFlowState,
      step: "taskSummary",
      pendingTasks: pending,
    });
    expect(state).toEqual(initialFlowState);
    expect(effectTypes(effects)).toEqual(["closeSheet", "createTask", "createTask", "createTask"]);
    for (const effect of effects.slice(1)) {
      if (effect.type !== "createTask") throw new Error("expected createTask");
      expect(effect.source).toBe("voice");
    }
  });
});

describe("editDateTime", () => {
  it("marks the task as editing and opens the matching sheet", () => {
    const pending = buildPendingTasks(["a b"]);
    const summaryState: FlowState = { ...initialFlowState, step: "taskSummary", pendingTasks: pending };

    const day = editDateTime(summaryState, pending[0].id, "dueDate");
    expect(day.state.editingTaskId).toBe(pending[0].id);
    expect(openedSheet(day.effects)).toBe("selectDay");

    const time = editDateTime(summaryState, pending[0].id, "dueTime");
    expect(openedSheet(time.effects)).toBe("selectTime");
  });
});

describe("editExistingTask", () => {
  it("prefills state from the task and opens the add-task sheet", () => {
    const { state, effects } = editExistingTask({
      _id: "task-9",
      title: "water plants",
      dueDate: "2026-08-21",
      dueTime: "09:00",
    });
    expect(state.editingExistingTaskId).toBe("task-9");
    expect(state.title).toBe("water plants");
    expect(state.selectedDay).toBe("2026-08-21");
    expect(state.selectedTime).toBe("09:00");
    expect(openedSheet(effects)).toBe("addTask");
  });
});

describe("pending task edits on the summary sheet", () => {
  it("updatePendingTitle renames one task", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state, effects } = updatePendingTitle(
      { ...initialFlowState, pendingTasks: pending },
      pending[0].id,
      "renamed"
    );
    expect(state.pendingTasks[0].title).toBe("renamed");
    expect(state.pendingTasks[1].title).toBe("c d");
    expect(effects).toEqual([]);
  });

  it("removePendingTask removes one task", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state } = removePendingTask({ ...initialFlowState, pendingTasks: pending }, pending[0].id);
    expect(state.pendingTasks).toHaveLength(1);
    expect(state.pendingTasks[0].title).toBe("c d");
  });

  it("removing the last pending task abandons the flow", () => {
    const pending = buildPendingTasks(["a b"]);
    const { state, effects } = removePendingTask(
      { ...initialFlowState, step: "taskSummary", pendingTasks: pending },
      pending[0].id
    );
    expect(state).toEqual(initialFlowState);
    expect(effectTypes(effects)).toEqual(["closeSheet"]);
  });
});

describe("reset", () => {
  it("returns to idle and closes sheets", () => {
    const { state, effects } = reset();
    expect(state).toEqual(initialFlowState);
    expect(effectTypes(effects)).toEqual(["closeSheet"]);
  });
});

describe("goBack", () => {
  it("from addTask abandons the flow", () => {
    const { state, effects } = goBack({ ...initialFlowState, step: "addTask", title: "x" });
    expect(state).toEqual(initialFlowState);
    expect(effectTypes(effects)).toEqual(["closeSheet"]);
  });

  it("rewinds selectTime → selectDay → addTask", () => {
    const fromTime = goBack({ ...initialFlowState, step: "selectTime", title: "x", selectedDay: "2026-01-01" });
    expect(fromTime.state.step).toBe("selectDay");
    expect(openedSheet(fromTime.effects)).toBe("selectDay");

    const fromDay = goBack(fromTime.state);
    expect(fromDay.state.step).toBe("addTask");
    expect(openedSheet(fromDay.effects)).toBe("addTask");
  });

  it("from taskSummary rewinds to selectTime", () => {
    const { state, effects } = goBack({
      ...initialFlowState,
      step: "taskSummary",
      pendingTasks: buildPendingTasks(["a b"]),
    });
    expect(state.step).toBe("selectTime");
    expect(openedSheet(effects)).toBe("selectTime");
  });

  it("while editing a pending task, day/time back returns to summary", () => {
    const pending = buildPendingTasks(["a b", "c d"]);
    const { state, effects } = goBack({
      ...initialFlowState,
      step: "selectDay",
      pendingTasks: pending,
      editingTaskId: pending[0].id,
    });
    expect(state.step).toBe("taskSummary");
    expect(state.editingTaskId).toBeNull();
    expect(openedSheet(effects)).toBe("taskSummary");
  });
});

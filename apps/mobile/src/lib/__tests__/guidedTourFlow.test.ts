import {
  createInitialGuidedTourState,
  currentTourStepName,
  getDaySheetTourUi,
  getTimeSheetTourUi,
  isTourActive,
  transition,
  type GuidedTourContext,
  type GuidedTourEffect,
  type GuidedTourEvent,
  type GuidedTourState,
  type TourSheetUi,
} from "../guidedTourFlow";
import { tourStepIndexFor } from "../guidedTourSteps";

function atStep(state: GuidedTourState, name: Parameters<typeof tourStepIndexFor>[0]): GuidedTourState {
  return { ...state, engaged: true, stepIndex: tourStepIndexFor(name) };
}

function engaged(): GuidedTourState {
  return { ...createInitialGuidedTourState(), engaged: true };
}

const signedIn: GuidedTourContext = { isAnonymous: false };
const anonymous: GuidedTourContext = { isAnonymous: true };

function effectSummary(effects: GuidedTourEffect[]): string[] {
  return effects.map((effect) => {
    if (effect.type === "track") {
      return effect.properties
        ? `track:${effect.event}:${JSON.stringify(effect.properties)}`
        : `track:${effect.event}`;
    }
    if (effect.type === "trackTourStepAdvance") {
      return `advance:${effect.event}:${JSON.stringify(effect.properties)}`;
    }
    return effect.type;
  });
}

describe("enabled", () => {
  it("engages the tour once", () => {
    const initial = createInitialGuidedTourState();
    const first = transition(initial, { type: "enabled" }, anonymous);
    expect(first.state.engaged).toBe(true);
    expect(first.effects).toEqual([]);

    const second = transition(first.state, { type: "enabled" }, anonymous);
    expect(second.state).toEqual(first.state);
    expect(second.effects).toEqual([]);
  });
});

describe("signed-in happy path", () => {
  it("walks every step with the expected analytics effects", () => {
    let state = engaged();

    const intro = transition(state, { type: "introAcknowledged" }, signedIn);
    expect(currentTourStepName(intro.state)).toBe("createTask");
    expect(effectSummary(intro.effects)).toEqual([
      "track:guided_tour_started",
      'advance:guided_tour_step_viewed:{"step":1,"stepName":"createTask"}',
    ]);
    state = intro.state;

    const add = transition(state, { type: "addPressed" }, signedIn);
    expect(currentTourStepName(add.state)).toBe("pickDay");
    expect(effectSummary(add.effects)).toEqual([
      'track:guided_tour_step_viewed:{"step":1,"stepName":"createTask"}',
      'advance:guided_tour_step_viewed:{"step":2,"stepName":"pickDay"}',
    ]);
    state = add.state;

    const day = transition(state, { type: "daySelected" }, signedIn);
    expect(currentTourStepName(day.state)).toBe("pickTime");
    expect(effectSummary(day.effects)).toEqual([
      'advance:guided_tour_step_viewed:{"step":3,"stepName":"pickTime"}',
    ]);
    state = day.state;

    const time = transition(state, { type: "timeSelected" }, signedIn);
    expect(currentTourStepName(time.state)).toBe("moodMeter");
    expect(effectSummary(time.effects)).toEqual([
      "track:guided_tour_task_created",
      'advance:guided_tour_step_viewed:{"step":4,"stepName":"moodMeter"}',
    ]);
    state = time.state;

    const mood = transition(state, { type: "moodStepAcknowledged" }, signedIn);
    expect(currentTourStepName(mood.state)).toBe("completeTask");
    state = mood.state;

    const completed = transition(state, { type: "taskCompleted" }, signedIn);
    expect(currentTourStepName(completed.state)).toBe("celebration");
    expect(effectSummary(completed.effects)).toEqual([
      "track:guided_tour_task_completed",
      'advance:guided_tour_completed:{"step":6,"stepName":"celebration"}',
    ]);
    state = completed.state;

    const celebration = transition(state, { type: "celebrationFinished" }, signedIn);
    expect(celebration.state.dismissed).toBe(true);
    expect(effectSummary(celebration.effects)).toEqual([
      "track:guided_tour_completed",
      "persistCompletion",
    ]);
  });
});

describe("anonymous happy path", () => {
  it("shows save progress before persisting completion", () => {
    let state = atStep(createInitialGuidedTourState(), "celebration");

    const leavingCelebration = transition(state, { type: "celebrationFinished" }, anonymous);
    expect(currentTourStepName(leavingCelebration.state)).toBe("saveProgress");
    expect(leavingCelebration.state.dismissed).toBe(false);
    expect(effectSummary(leavingCelebration.effects)).toEqual([
      "track:guided_tour_completed",
      "track:onboarding_save_progress_shown",
    ]);
    state = leavingCelebration.state;

    const done = transition(state, { type: "saveProgressDone" }, anonymous);
    expect(done.state.dismissed).toBe(true);
    expect(effectSummary(done.effects)).toEqual(["persistCompletion"]);
  });
});

describe("skip", () => {
  const stepNames = [
    "intro",
    "createTask",
    "pickDay",
    "pickTime",
    "moodMeter",
    "completeTask",
    "celebration",
    "saveProgress",
  ] as const;

  it.each(stepNames)("skips from %s", (stepName) => {
    const state = atStep(createInitialGuidedTourState(), stepName);
    const result = transition(state, { type: "skipRequested" }, anonymous);
    expect(result.state.dismissed).toBe(true);
    expect(effectSummary(result.effects)).toEqual(["track:guided_tour_skipped", "persistCompletion"]);
  });
});

describe("wrong-step events", () => {
  it("ignores daySelected while on createTask", () => {
    const state = atStep(createInitialGuidedTourState(), "createTask");
    const result = transition(state, { type: "daySelected" }, anonymous);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });

  it("ignores taskCompleted while on moodMeter", () => {
    const state = atStep(createInitialGuidedTourState(), "moodMeter");
    const result = transition(state, { type: "taskCompleted" }, anonymous);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });

  it("ignores saveProgressDone while on celebration", () => {
    const state = atStep(createInitialGuidedTourState(), "celebration");
    const result = transition(state, { type: "saveProgressDone" }, signedIn);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });
});

describe("idempotence", () => {
  it("ignores duplicate daySelected after advancing", () => {
    const state = atStep(createInitialGuidedTourState(), "pickDay");
    const first = transition(state, { type: "daySelected" }, anonymous);
    const second = transition(first.state, { type: "daySelected" }, anonymous);
    expect(second.state).toEqual(first.state);
    expect(second.effects).toEqual([]);
  });

  it("ignores duplicate celebrationFinished after dismissing signed-in users", () => {
    const state = atStep(createInitialGuidedTourState(), "celebration");
    const first = transition(state, { type: "celebrationFinished" }, signedIn);
    const second = transition(first.state, { type: "celebrationFinished" }, signedIn);
    expect(second.state).toEqual(first.state);
    expect(second.effects).toEqual([]);
  });
});

describe("analytics quirks", () => {
  it("never emits guided_tour_shown", () => {
    const state = atStep(createInitialGuidedTourState(), "intro");
    const result = transition(state, { type: "introAcknowledged" }, anonymous);
    expect(result.effects.some((effect) => effect.type === "track" && effect.event === "guided_tour_shown")).toBe(
      false,
    );
  });

  it("fires guided_tour_step_viewed for createTask twice on addPressed", () => {
    const state = atStep(createInitialGuidedTourState(), "createTask");
    const result = transition(state, { type: "addPressed" }, anonymous);
    const createTaskViews = result.effects.filter(
      (effect) =>
        effect.type === "track" &&
        effect.event === "guided_tour_step_viewed" &&
        effect.properties?.stepName === "createTask",
    );
    expect(createTaskViews).toHaveLength(1);
    expect(result.effects.filter((effect) => effect.type === "trackTourStepAdvance")).toHaveLength(1);
    expect(
      result.effects.some(
        (effect) =>
          effect.type === "trackTourStepAdvance" &&
          effect.properties.stepName === "pickDay",
      ),
    ).toBe(true);
  });

  it("fires guided_tour_completed twice around celebration", () => {
    const entering = transition(atStep(createInitialGuidedTourState(), "completeTask"), { type: "taskCompleted" }, signedIn);
    expect(effectSummary(entering.effects)).toContain(
      'advance:guided_tour_completed:{"step":6,"stepName":"celebration"}',
    );

    const leaving = transition(entering.state, { type: "celebrationFinished" }, signedIn);
    expect(leaving.effects).toContainEqual({ type: "track", event: "guided_tour_completed" });
  });

  it("fires onboarding_save_progress_shown only when anonymous users leave celebration", () => {
    const anonymousResult = transition(atStep(createInitialGuidedTourState(), "celebration"), {
      type: "celebrationFinished",
    }, anonymous);
    expect(anonymousResult.effects).toContainEqual({ type: "track", event: "onboarding_save_progress_shown" });

    const signedInResult = transition(atStep(createInitialGuidedTourState(), "celebration"), {
      type: "celebrationFinished",
    }, signedIn);
    expect(
      signedInResult.effects.some(
        (effect) => effect.type === "track" && effect.event === "onboarding_save_progress_shown",
      ),
    ).toBe(false);
  });
});

describe("inactive tour", () => {
  it("ignores domain events before engagement", () => {
    const state = createInitialGuidedTourState();
    const result = transition(state, { type: "addPressed" }, anonymous);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });

  it("ignores domain events after dismissal", () => {
    const state = { ...atStep(createInitialGuidedTourState(), "intro"), dismissed: true };
    const result = transition(state, { type: "introAcknowledged" }, anonymous);
    expect(result.state).toEqual(state);
    expect(result.effects).toEqual([]);
  });
});

import {
  EXIT_ARMING_MS,
  resolveBackAction,
  type RootBackState,
} from "../rootBackAction";

function base(overrides: Partial<RootBackState> = {}): RootBackState {
  return {
    now: 10_000,
    exitArmedUntil: null,
    ...overrides,
  };
}

describe("resolveBackAction — exit arming", () => {
  it("arms exit on a clean root", () => {
    expect(resolveBackAction(base())).toEqual({ type: "armExit" });
  });

  it("exits when armed and still within the window", () => {
    expect(
      resolveBackAction(
        base({ exitArmedUntil: 10_000 + EXIT_ARMING_MS, now: 10_000 + 500 }),
      ),
    ).toEqual({ type: "exitApp" });
  });

  it("arms again when the arming window has expired", () => {
    expect(
      resolveBackAction(
        base({ exitArmedUntil: 10_000 + EXIT_ARMING_MS, now: 10_000 + EXIT_ARMING_MS }),
      ),
    ).toEqual({ type: "armExit" });
  });
});

describe("resolveBackAction — overlays", () => {
  it("dismisses survey form before invite and exit", () => {
    expect(
      resolveBackAction(
        base({
          surveyFormOpen: true,
          surveyInviteOpen: true,
          tourActive: true,
          activeSheet: "settings",
        }),
      ),
    ).toEqual({ type: "dismissSurveyForm" });
  });

  it("dismisses survey invite before tour and sheets", () => {
    expect(
      resolveBackAction(
        base({ surveyInviteOpen: true, tourActive: true, activeSheet: "profile" }),
      ),
    ).toEqual({ type: "dismissSurveyInvite" });
  });

  it("skips an active guided tour before sheets", () => {
    expect(
      resolveBackAction(base({ tourActive: true, activeSheet: "addTask", taskFlowStep: "addTask" })),
    ).toEqual({ type: "skipTour" });
  });

  it("dismisses rating prompt when nothing else is open", () => {
    expect(resolveBackAction(base({ ratingPromptVisible: true }))).toEqual({
      type: "dismissRatingPrompt",
    });
  });

  it("closes a sheet before dismissing rating prompt", () => {
    expect(
      resolveBackAction(base({ ratingPromptVisible: true, activeSheet: "insights" })),
    ).toEqual({ type: "closeSheet" });
  });
});

describe("resolveBackAction — task creation", () => {
  it("closes and idles from add-task root", () => {
    expect(
      resolveBackAction(base({ activeSheet: "addTask", taskFlowStep: "addTask" })),
    ).toEqual({ type: "closeSheetAndIdleFlow" });
  });

  it("rewinds one flow step from selectTime", () => {
    expect(
      resolveBackAction(base({ activeSheet: "selectTime", taskFlowStep: "selectTime" })),
    ).toEqual({ type: "rewindTaskFlow" });
  });

  it("rewinds from selectDay and taskSummary", () => {
    expect(
      resolveBackAction(base({ activeSheet: "selectDay", taskFlowStep: "selectDay" })),
    ).toEqual({ type: "rewindTaskFlow" });
    expect(
      resolveBackAction(base({ activeSheet: "taskSummary", taskFlowStep: "taskSummary" })),
    ).toEqual({ type: "rewindTaskFlow" });
  });
});

describe("resolveBackAction — sheets", () => {
  it("closes a root sheet with no inner navigation", () => {
    expect(resolveBackAction(base({ activeSheet: "allTasks" }))).toEqual({
      type: "closeSheet",
    });
  });

  it("collapses settings voice languages before closing", () => {
    expect(
      resolveBackAction(
        base({ activeSheet: "settings", settingsVoiceExpanded: true }),
      ),
    ).toEqual({ type: "collapseVoiceLanguages" });
  });

  it("closes settings at root when voice languages are collapsed", () => {
    expect(
      resolveBackAction(
        base({ activeSheet: "settings", settingsVoiceExpanded: false }),
      ),
    ).toEqual({ type: "closeSheet" });
  });

  it("rewinds profile auth username before returning to main", () => {
    expect(
      resolveBackAction(
        base({
          activeSheet: "profile",
          profileSubView: "signInOptions",
          profileAuthView: "username",
        }),
      ),
    ).toEqual({ type: "authGoBack" });
  });

  it("returns profile link/sign-in options to main", () => {
    expect(
      resolveBackAction(
        base({
          activeSheet: "profile",
          profileSubView: "linkOptions",
          profileAuthView: "options",
        }),
      ),
    ).toEqual({ type: "profileToMain" });
  });

  it("closes profile at main", () => {
    expect(
      resolveBackAction(base({ activeSheet: "profile", profileSubView: "main" })),
    ).toEqual({ type: "closeSheet" });
  });
});

describe("resolveBackAction — welcome", () => {
  it("returns from welcome sign-in options to the welcome form", () => {
    expect(
      resolveBackAction(
        base({ welcomeSubView: "signIn", welcomeAuthView: "options" }),
      ),
    ).toEqual({ type: "welcomeToForm" });
  });

  it("rewinds welcome auth username before leaving sign-in", () => {
    expect(
      resolveBackAction(
        base({ welcomeSubView: "signIn", welcomeAuthView: "username" }),
      ),
    ).toEqual({ type: "authGoBack" });
  });

  it("arms exit on bare welcome form", () => {
    expect(resolveBackAction(base({ welcomeSubView: "welcome" }))).toEqual({
      type: "armExit",
    });
  });
});

describe("resolveBackAction — most recent / outermost wins", () => {
  it("prefers tour over an open sheet", () => {
    expect(
      resolveBackAction(base({ tourActive: true, activeSheet: "preferences" })),
    ).toEqual({ type: "skipTour" });
  });

  it("prefers sheet over exit arming even when armed", () => {
    expect(
      resolveBackAction(
        base({
          activeSheet: "insights",
          exitArmedUntil: 10_000 + EXIT_ARMING_MS,
          now: 10_500,
        }),
      ),
    ).toEqual({ type: "closeSheet" });
  });
});

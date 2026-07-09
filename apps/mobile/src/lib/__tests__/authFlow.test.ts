import {
  initialAuthFlowState,
  type AuthFlowEffect,
  type AuthFlowState,
  transitionAuthFlow,
} from "../authFlow";

function effectTypes(effects: AuthFlowEffect[]): string[] {
  return effects.map((e) => e.type);
}

describe("initialAuthFlowState", () => {
  it("signIn mode starts on options with signIn username target", () => {
    expect(initialAuthFlowState("signIn")).toEqual({
      mode: "signIn",
      view: "options",
      usernameView: "signIn",
      status: "idle",
    });
  });

  it("link mode starts on options with signUp username target", () => {
    expect(initialAuthFlowState("link")).toEqual({
      mode: "link",
      view: "options",
      usernameView: "signUp",
      status: "idle",
    });
  });
});

describe("CHOOSE_USERNAME", () => {
  it("enters the username sub-view", () => {
    const state = initialAuthFlowState("signIn");
    const { state: next, effects } = transitionAuthFlow(state, { type: "CHOOSE_USERNAME" });
    expect(next.view).toBe("username");
    expect(next.usernameView).toBe("signIn");
    expect(next.status).toBe("idle");
    expect(effects).toEqual([]);
  });

  it("link mode opens sign-up username by default", () => {
    const { state: next } = transitionAuthFlow(initialAuthFlowState("link"), {
      type: "CHOOSE_USERNAME",
    });
    expect(next.usernameView).toBe("signUp");
  });
});

describe("GO_BACK", () => {
  it("returns from username to options when idle", () => {
    const onUsername: AuthFlowState = {
      ...initialAuthFlowState("signIn"),
      view: "username",
    };
    const { state: next, effects } = transitionAuthFlow(onUsername, { type: "GO_BACK" });
    expect(next.view).toBe("options");
    expect(next.status).toBe("idle");
    expect(effects).toEqual([]);
  });

  it("ignores back while busy", () => {
    const busy: AuthFlowState = {
      ...initialAuthFlowState("signIn"),
      view: "options",
      status: "busy",
    };
    const { state: next } = transitionAuthFlow(busy, { type: "GO_BACK" });
    expect(next).toEqual(busy);
  });
});

describe("SWITCH_USERNAME_VIEW", () => {
  it("toggles between sign-in and sign-up on the username sub-view", () => {
    const onUsername: AuthFlowState = {
      ...initialAuthFlowState("link"),
      view: "username",
      usernameView: "signUp",
    };
    const { state: next } = transitionAuthFlow(onUsername, {
      type: "SWITCH_USERNAME_VIEW",
      view: "signIn",
    });
    expect(next.usernameView).toBe("signIn");
    expect(next.view).toBe("username");
  });
});

describe("auth in-flight", () => {
  it("marks busy when social auth starts", () => {
    const { state: next } = transitionAuthFlow(initialAuthFlowState("signIn"), {
      type: "AUTH_STARTED",
    });
    expect(next.status).toBe("busy");
    expect(next.view).toBe("options");
  });

  it("returns to idle options on failure", () => {
    const busy: AuthFlowState = { ...initialAuthFlowState("signIn"), status: "busy" };
    const { state: next, effects } = transitionAuthFlow(busy, { type: "AUTH_FAILED" });
    expect(next.status).toBe("idle");
    expect(next.view).toBe("options");
    expect(effects).toEqual([]);
  });
});

describe("AUTH_SUCCEEDED", () => {
  it("signIn mode reaches success and emits onSuccess", () => {
    const busy: AuthFlowState = { ...initialAuthFlowState("signIn"), status: "busy" };
    const { state: next, effects } = transitionAuthFlow(busy, { type: "AUTH_SUCCEEDED" });
    expect(next.status).toBe("success");
    expect(effectTypes(effects)).toEqual(["onSuccess"]);
  });

  it("link mode reaches success and emits onSuccess", () => {
    const busy: AuthFlowState = { ...initialAuthFlowState("link"), status: "busy" };
    const { state: next, effects } = transitionAuthFlow(busy, { type: "AUTH_SUCCEEDED" });
    expect(next.status).toBe("success");
    expect(effectTypes(effects)).toEqual(["onSuccess"]);
  });

  it("username success also terminates with onSuccess", () => {
    const onUsername: AuthFlowState = {
      ...initialAuthFlowState("signIn"),
      view: "username",
    };
    const { state: next, effects } = transitionAuthFlow(onUsername, { type: "AUTH_SUCCEEDED" });
    expect(next.status).toBe("success");
    expect(effectTypes(effects)).toEqual(["onSuccess"]);
  });
});

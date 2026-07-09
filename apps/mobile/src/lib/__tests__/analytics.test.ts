import type PostHog from "posthog-react-native";

const mocks = {
  capture: jest.fn(),
  identify: jest.fn(),
};

function createMockClient(): PostHog {
  return {
    capture: mocks.capture,
    identify: mocks.identify,
    getFeatureFlag: jest.fn(),
    getDistinctId: jest.fn(() => "distinct-id"),
    flush: jest.fn(async () => undefined),
    ready: jest.fn(async () => undefined),
    getSurveys: jest.fn(async () => []),
    _onSurveysReady: jest.fn(async () => undefined),
  } as unknown as PostHog;
}

let mockClient = createMockClient();

jest.mock("../posthog", () => ({
  getPostHogClient: () => mockClient,
  setPostHogClientForTests: (client: PostHog) => {
    mockClient = client;
  },
  resetPostHogClientForTests: () => {
    mockClient = createMockClient();
    mocks.capture.mockClear();
    mocks.identify.mockClear();
  },
}));

import {
  track,
  identify,
  type AnalyticsEventName,
  setPostHogClientForTests,
  resetPostHogClientForTests,
} from "../analytics";

const CATALOG_EVENT_NAMES = [
  "Home page loaded",
  "Intro page loaded",
  "onboarding_step_viewed",
  "onboarding_completed",
  "Created item",
  "task_completed",
  "voice_input_used",
  "guided_tour_started",
  "guided_tour_task_created",
  "guided_tour_task_completed",
  "guided_tour_step_viewed",
  "guided_tour_shown",
  "guided_tour_completed",
  "guided_tour_skipped",
  "onboarding_save_progress_shown",
  "onboarding_celebration_viewed",
  "onboarding_account_linked",
  "onboarding_save_progress_skipped",
  "upgrade_cta_viewed",
  "paywall_opened",
  "subscription_purchased",
  "survey_invite_shown",
  "survey_invite_started",
  "survey_invite_deferred",
  "survey shown",
  "survey sent",
] as const satisfies readonly AnalyticsEventName[];

type CatalogCheck = (typeof CATALOG_EVENT_NAMES)[number];
type AssertNever<T extends never> = T;
type _catalogMatchesAnalyticsEvents = AssertNever<
  Exclude<AnalyticsEventName, CatalogCheck> | Exclude<CatalogCheck, AnalyticsEventName>
>;

describe("analytics", () => {
  beforeEach(() => {
    mocks.capture.mockClear();
    mocks.identify.mockClear();
    setPostHogClientForTests(createMockClient());
  });

  afterEach(() => {
    resetPostHogClientForTests();
  });

  it("track passes event name and properties through", () => {
    track("Created item", { source: "voice" });
    expect(mocks.capture).toHaveBeenCalledWith("Created item", { source: "voice" });
  });

  it("track omits properties for void events", () => {
    track("Home page loaded");
    expect(mocks.capture).toHaveBeenCalledWith("Home page loaded");
  });

  it("identify passes user id through", () => {
    identify("user-123");
    expect(mocks.identify).toHaveBeenCalledWith("user-123");
  });

  it("catalog event names are unique", () => {
    expect(new Set(CATALOG_EVENT_NAMES).size).toBe(CATALOG_EVENT_NAMES.length);
  });
});

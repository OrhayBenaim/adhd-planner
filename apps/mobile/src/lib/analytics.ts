import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type PostHog from "posthog-react-native";
import { getPostHogClient, setPostHogClientForTests, resetPostHogClientForTests } from "./posthog";

type CaptureProperties = NonNullable<Parameters<PostHog["capture"]>[1]>;

export interface SurveySentProperties {
  $survey_id: string;
  $survey_completed: true;
  $survey_questions: Array<{ id: string; question: string }>;
  [key: `$survey_response_${string}`]: number | string;
}

type TourStepProperties = { step: number; stepName: string };

/** Events referenced by guided-tour step definitions. */
export const TOUR_STEP_EVENTS = [
  "guided_tour_shown",
  "guided_tour_step_viewed",
  "guided_tour_completed",
  "onboarding_save_progress_shown",
] as const;

export type TourStepEvent = (typeof TOUR_STEP_EVENTS)[number];

export interface AnalyticsEvents {
  "Home page loaded": void;
  "Intro page loaded": void;
  onboarding_step_viewed: {
    step: "work_time" | "difficulties" | "strengths" | "notifications";
    step_number: 2 | 3 | 4 | 5;
  };
  onboarding_completed: void;
  "Created item": { source: "text" | "voice" };
  task_completed: void;
  voice_input_used: void;
  guided_tour_started: void;
  guided_tour_task_created: void;
  guided_tour_task_completed: void;
  guided_tour_step_viewed: TourStepProperties;
  guided_tour_shown: void | TourStepProperties;
  guided_tour_completed: void | TourStepProperties;
  guided_tour_skipped: void;
  onboarding_save_progress_shown: void | TourStepProperties;
  onboarding_celebration_viewed: void;
  onboarding_account_linked: void;
  onboarding_save_progress_skipped: void;
  upgrade_cta_viewed: { variant: string };
  paywall_opened: { variant: string; source: string };
  subscription_purchased: { variant: string };
  survey_invite_shown: { campaign_id: Id<"surveyCampaigns"> | string };
  survey_invite_started: { campaign_id: Id<"surveyCampaigns"> | string };
  survey_invite_deferred: { campaign_id: Id<"surveyCampaigns"> | string };
  "survey shown": { $survey_id: string };
  "survey sent": SurveySentProperties;
}

export type AnalyticsEventName = keyof AnalyticsEvents;

type IsOnlyVoid<T> = [T] extends [void] ? true : false;
type HasVoid<T> = void extends T ? true : false;

type TrackArgs<E extends AnalyticsEventName> = IsOnlyVoid<AnalyticsEvents[E]> extends true
  ? []
  : HasVoid<AnalyticsEvents[E]> extends true
    ? [properties?: Exclude<AnalyticsEvents[E], void>]
    : [properties: AnalyticsEvents[E]];

export function track<E extends AnalyticsEventName>(
  event: E,
  ...args: TrackArgs<E>
): void {
  const client = getPostHogClient();
  const properties = args[0];
  if (properties !== undefined) {
    client.capture(event, properties as CaptureProperties);
  } else {
    client.capture(event);
  }
}

/** Tour step advance — all TOUR_STEPS posthogEvent values share step/stepName props. */
export function trackTourStepAdvance(
  event: TourStepEvent,
  properties: TourStepProperties,
): void {
  getPostHogClient().capture(event, properties as CaptureProperties);
}

export function identify(userId: string): void {
  getPostHogClient().identify(userId);
}

export function getFeatureFlag(flag: string): string | boolean | undefined {
  return getPostHogClient().getFeatureFlag(flag);
}

export function getDistinctId(): string {
  return getPostHogClient().getDistinctId();
}

export { setPostHogClientForTests, resetPostHogClientForTests };

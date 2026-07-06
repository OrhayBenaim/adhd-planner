import { describe, expect, test } from "vitest";
import { parseSurveyWebhookPayload } from "../lib/posthogWebhook";

describe("parseSurveyWebhookPayload", () => {
  test("parses completed survey sent event", () => {
    const result = parseSurveyWebhookPayload({
      event: {
        event: "survey sent",
        distinct_id: "user_123",
        properties: {
          $survey_completed: true,
          $survey_id: "survey-abc",
          $survey_submission_id: "sub-1",
        },
      },
    });

    expect(result).toEqual({
      userId: "user_123",
      surveyId: "survey-abc",
      surveyCompleted: true,
      submissionId: "sub-1",
    });
  });

  test("ignores incomplete surveys", () => {
    const result = parseSurveyWebhookPayload({
      event: {
        event: "survey sent",
        distinct_id: "user_123",
        properties: {
          $survey_completed: false,
          $survey_id: "survey-abc",
        },
      },
    });

    expect(result).toBeNull();
  });
});

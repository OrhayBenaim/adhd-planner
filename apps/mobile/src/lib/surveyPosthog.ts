import type { Survey } from "@posthog/core";
import { posthog } from "./posthog";

export type SurveyResponseValue = number | string;

export async function loadSurveyDefinition(
  posthogSurveyId: string,
): Promise<Survey | null> {
  await Promise.all([posthog.ready(), posthog._onSurveysReady()]);
  const surveys = await posthog.getSurveys();
  return surveys.find((s) => s.id === posthogSurveyId) ?? null;
}

export function submitSurveyResponses(
  survey: Survey,
  responses: Record<string, SurveyResponseValue>,
): void {
  posthog.capture("survey shown", { $survey_id: survey.id });

  const responseProps = Object.fromEntries(
    Object.entries(responses).map(([questionId, value]) => [
      `$survey_response_${questionId}`,
      value,
    ]),
  );

  posthog.capture("survey sent", {
    $survey_id: survey.id,
    $survey_completed: true,
    $survey_questions: survey.questions.map((q) => ({
      id: q.id,
      question: "question" in q ? q.question : "",
    })),
    ...responseProps,
  });
}

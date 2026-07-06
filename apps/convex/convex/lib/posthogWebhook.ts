export interface ParsedSurveyWebhook {
  userId: string;
  surveyId: string;
  surveyCompleted: boolean;
  submissionId?: string;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBool(value: unknown): boolean {
  return value === true || value === "true";
}

/** Parse PostHog destination webhook payload for survey sent events. */
export function parseSurveyWebhookPayload(
  body: unknown,
): ParsedSurveyWebhook | null {
  if (!body || typeof body !== "object") return null;

  const root = body as Record<string, unknown>;

  // Hog function / destination shape: { event: { event, properties, distinct_id } }
  const event =
    (root.event as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  if (!event || typeof event !== "object") return null;

  const eventName = readString(event.event) ?? readString(event.name);
  if (eventName !== "survey sent") return null;

  const properties =
    (event.properties as Record<string, unknown> | undefined) ?? {};

  const surveyCompleted = readBool(properties.$survey_completed);
  if (!surveyCompleted) return null;

  const surveyId = readString(properties.$survey_id);
  if (!surveyId) return null;

  const person = root.person as Record<string, unknown> | undefined;
  const distinctIds = person?.distinct_ids;
  const userId =
    readString(event.distinct_id) ??
    readString(properties.distinct_id) ??
    (Array.isArray(distinctIds) ? readString(distinctIds[0]) : null);

  if (!userId) return null;

  const submissionId =
    readString(properties.$survey_submission_id) ?? undefined;

  return { userId, surveyId, surveyCompleted, submissionId };
}

export type OpenRouterChatRequest = {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
};

export type OpenRouterChatSuccess = {
  ok: true;
  rawText: string;
  model?: string;
  cost: number;
};

export type OpenRouterChatFailure = {
  ok: false;
  status?: number;
  message: string;
};

export type OpenRouterChatResult = OpenRouterChatSuccess | OpenRouterChatFailure;

/** Strip markdown code fences from model output. */
export function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Parse JSON from model text; returns null when JSON.parse fails.
 */
export function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function callOpenRouterChat(
  request: OpenRouterChatRequest,
): Promise<OpenRouterChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "OPENROUTER_API_KEY not set" };
  }

  const body: Record<string, unknown> = {
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ],
  };
  if (request.model) {
    body.model = request.model;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          status: response.status,
          message: `OpenRouter HTTP ${response.status}: [response redacted]`,
        };
      }
      return {
        ok: false,
        status: response.status,
        message: `OpenRouter HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: { total_cost?: number; cost?: number };
    };

    const rawText = stripMarkdownFences(
      data.choices?.[0]?.message?.content?.trim() ?? "",
    );
    const cost = data.usage?.total_cost ?? data.usage?.cost ?? 0;

    return {
      ok: true,
      rawText,
      model: data.model,
      cost,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

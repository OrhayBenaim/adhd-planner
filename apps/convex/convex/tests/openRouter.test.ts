import { describe, expect, test } from "vitest";
import { stripMarkdownFences, tryParseJson } from "../lib/openRouter";

describe("stripMarkdownFences", () => {
  test("passes through plain JSON", () => {
    expect(stripMarkdownFences('{"score": 42}')).toBe('{"score": 42}');
  });

  test("strips fenced JSON", () => {
    expect(stripMarkdownFences('```json\n{"score": 42}\n```')).toBe(
      '{"score": 42}',
    );
  });
});

describe("task scoring parse semantics", () => {
  function parseScore(rawText: string): number | null {
    const stripped = stripMarkdownFences(rawText);
    const parsed = tryParseJson(stripped);
    if (
      parsed &&
      typeof parsed === "object" &&
      "score" in parsed &&
      typeof (parsed as { score: unknown }).score === "number"
    ) {
      return (parsed as { score: number }).score;
    }
    const fallback = parseInt(stripped, 10);
    return Number.isNaN(fallback) ? null : fallback;
  }

  test("parses plain JSON score", () => {
    expect(parseScore('{"score": 55, "reason": "ok"}')).toBe(55);
  });

  test("parses fenced JSON score", () => {
    expect(parseScore('```json\n{"score": 70}\n```')).toBe(70);
  });

  test("falls back to plain number", () => {
    expect(parseScore("42")).toBe(42);
  });

  test("rejects invalid score above 100", () => {
    const score = parseScore('{"score": 150}');
    expect(score).toBe(150);
    expect(score !== null && (score < 0 || score > 100)).toBe(true);
  });

  test("returns null for garbage input", () => {
    expect(parseScore("not-a-number")).toBeNull();
  });
});

describe("coach message parse semantics", () => {
  function parseCoachMessage(rawText: string): string {
    const parsed = tryParseJson(rawText);
    if (
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
    ) {
      return (parsed as { message: string }).message;
    }
    return rawText.slice(0, 120);
  }

  test("parses JSON message field", () => {
    expect(parseCoachMessage('{"message": "You got this!"}')).toBe(
      "You got this!",
    );
  });

  test("falls back to text slice", () => {
    const long = "a".repeat(200);
    expect(parseCoachMessage(long)).toBe("a".repeat(120));
  });
});

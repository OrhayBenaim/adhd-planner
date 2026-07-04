import { describe, expect, test } from "vitest";
import { DAY_MS } from "../lib/constants";
import { getTrendsSince, getWeeklyBoundaries } from "../lib/insightsWindows";

describe("getWeeklyBoundaries", () => {
  test("returns week and two-week offsets from nowMs", () => {
    const nowMs = 1_700_000_000_000;
    expect(getWeeklyBoundaries(nowMs)).toEqual({
      weekAgoMs: nowMs - 7 * DAY_MS,
      twoWeeksAgoMs: nowMs - 14 * DAY_MS,
    });
  });
});

describe("getTrendsSince", () => {
  test("returns lookback start from nowMs and days", () => {
    const nowMs = 1_700_000_000_000;
    expect(getTrendsSince(nowMs, 7)).toBe(nowMs - 7 * DAY_MS);
  });
});

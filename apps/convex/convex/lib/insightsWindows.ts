import { DAY_MS } from "./constants";

export function getWeeklyBoundaries(nowMs: number): {
  weekAgoMs: number;
  twoWeeksAgoMs: number;
} {
  return {
    weekAgoMs: nowMs - 7 * DAY_MS,
    twoWeeksAgoMs: nowMs - 14 * DAY_MS,
  };
}

export function getTrendsSince(nowMs: number, days: number): number {
  return nowMs - days * DAY_MS;
}

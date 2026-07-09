/**
 * UTC calendar boundaries for day/week/month math.
 * All functions take explicit epoch milliseconds — never read the system clock.
 */

import { DAY_MS } from "./constants";

/** UTC date string YYYY-MM-DD. */
export function today(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** UTC date string for the previous calendar day. */
export function yesterday(nowMs: number): string {
  return new Date(nowMs - DAY_MS).toISOString().slice(0, 10);
}

/** UTC month key YYYY-MM. */
export function month(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 7);
}

/** Monday of the week containing nowMs, as UTC YYYY-MM-DD. */
export function weekStart(nowMs: number): string {
  const dateStr = today(nowMs);
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

/** Days between two UTC YYYY-MM-DD strings (end - start). */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00Z").getTime();
  const end = new Date(endDate + "T00:00:00Z").getTime();
  return Math.floor((end - start) / DAY_MS);
}

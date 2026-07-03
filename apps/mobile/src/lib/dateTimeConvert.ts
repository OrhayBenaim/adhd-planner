/**
 * Date/time module for the task flow and task lists.
 *
 * Task due dates are LOCAL calendar dates (YYYY-MM-DD in the device timezone),
 * written by daySelectionToDate. Any "is this due today?" comparison must use
 * getLocalToday()/getLocalDateString — using UTC (toISOString) misclassifies
 * tasks near midnight for non-UTC timezones.
 *
 * The one deliberate exception is server-keyed data: Convex keys completion
 * trends by UTC date, so chart lookups use getUtcDateString to match.
 */

/**
 * Format a Date as a local calendar date string (YYYY-MM-DD).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Today as a local calendar date string (YYYY-MM-DD).
 */
export function getLocalToday(): string {
  return getLocalDateString();
}

/**
 * Format a Date as a UTC calendar date string (YYYY-MM-DD).
 * Only for matching server-generated UTC date keys (e.g. completion trends).
 */
export function getUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Local date string N days from now.
 */
export function getLocalDateStringDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}

/**
 * Human label for a task due date: "Today", "Tomorrow", or "Mar 15".
 */
export function formatDueDate(dueDate: string): string {
  if (dueDate === getLocalToday()) return "Today";
  if (dueDate === getLocalDateStringDaysAhead(1)) return "Tomorrow";

  const [y, m, d] = dueDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Convert day selection enum to ISO date string (YYYY-MM-DD).
 */
export function daySelectionToDate(day: string): string {
  const now = new Date();

  switch (day) {
    case "today":
      return getLocalDateString(now);
    case "tomorrow": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return getLocalDateString(d);
    }
    case "end_of_week": {
      const d = new Date(now);
      const dayOfWeek = d.getDay(); // 0=Sun, 5=Fri
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // if Sat, next Fri = 6 days
      d.setDate(d.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
      return getLocalDateString(d);
    }
    default:
      // Custom — assume ISO date string passed through
      return day;
  }
}

/**
 * Convert time selection enum to HH:mm string.
 */
export function timeSelectionToTime(time: string): string {
  switch (time) {
    case "noon":
      return "12:00";
    case "afternoon":
      return "15:00";
    case "end_of_day":
      return "21:00";
    default:
      // Custom — pass through (e.g. "14:30")
      return time;
  }
}

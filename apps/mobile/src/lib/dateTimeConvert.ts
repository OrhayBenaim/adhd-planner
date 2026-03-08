/**
 * Convert day selection enum to ISO date string (YYYY-MM-DD).
 */
export function daySelectionToDate(day: string): string {
  const now = new Date();

  switch (day) {
    case "today":
      return formatDate(now);
    case "tomorrow": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return formatDate(d);
    }
    case "end_of_week": {
      const d = new Date(now);
      const dayOfWeek = d.getDay(); // 0=Sun, 5=Fri
      const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // if Sat, next Fri = 6 days
      d.setDate(d.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
      return formatDate(d);
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

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

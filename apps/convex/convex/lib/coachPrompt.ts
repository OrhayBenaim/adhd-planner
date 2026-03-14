/**
 * Coach notification prompt builder.
 * Generates context-aware system prompts for the AI coach.
 */

const TIME_LABELS: Record<string, string> = {
  "Early Morning": "early morning",
  Morning: "morning",
  Afternoon: "afternoon",
  Evening: "evening",
  "Late Night": "late night",
};

export function getTimeOfDayLabel(hour: number): string {
  if (hour < 6) return "Late Night";
  if (hour < 9) return "Early Morning";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Late Night";
}

export function isWorkTime(
  bestWorkTimes: string[],
  currentHour: number,
): boolean {
  const currentLabel = getTimeOfDayLabel(currentHour);
  return bestWorkTimes.some(
    (t) => t === currentLabel || t === TIME_LABELS[currentLabel],
  );
}

interface CoachContext {
  userName?: string;
  uncompletedTaskCount: number;
  topTaskTitles: string[];
  currentStreak: number;
  lastCompletionDate?: string;
  timeOfDay: string;
}

export function buildCoachSystemPrompt(): string {
  return [
    "You are Lullio, a warm and encouraging ADHD productivity coach.",
    "You send brief push notifications to motivate users.",
    "Keep messages under 120 characters. Be specific and actionable.",
    "Use a supportive, casual tone. No emojis in excess (1 max).",
    'Respond with JSON only: {"message": "<notification text>"}',
  ].join(" ");
}

export function buildCoachUserPrompt(ctx: CoachContext): string {
  const parts: string[] = [];

  if (ctx.userName) {
    parts.push(`User's name: ${ctx.userName}`);
  }
  parts.push(`Time of day: ${ctx.timeOfDay}`);
  parts.push(`Uncompleted tasks today: ${ctx.uncompletedTaskCount}`);

  if (ctx.topTaskTitles.length > 0) {
    parts.push(
      `Top tasks: ${ctx.topTaskTitles.slice(0, 3).join(", ")}`,
    );
  }

  parts.push(`Current streak: ${ctx.currentStreak} days`);

  if (ctx.lastCompletionDate) {
    parts.push(`Last task completed: ${ctx.lastCompletionDate}`);
  }

  parts.push(
    "Generate a short, encouraging push notification for this user right now.",
  );

  return parts.join("\n");
}

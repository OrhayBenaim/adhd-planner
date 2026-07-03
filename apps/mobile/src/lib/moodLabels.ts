type MoodLabel =
  | "Exhausted"
  | "Low Energy"
  | "Focused"
  | "Motivated"
  | "Super Motivated";

type DifficultyLabel =
  | "Scoring..."
  | "Not rated"
  | "Very Easy"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Very Hard";

export function getMoodLabel(value: number): MoodLabel {
  if (value <= 20) return "Exhausted";
  if (value <= 40) return "Low Energy";
  if (value <= 60) return "Focused";
  if (value <= 80) return "Motivated";
  return "Super Motivated";
}

export function getDifficultyLabel(value: number): DifficultyLabel {
  if (value < 0) return "Scoring...";
  if (value === 0) return "Not rated";
  if (value <= 20) return "Very Easy";
  if (value <= 40) return "Easy";
  if (value <= 60) return "Medium";
  if (value <= 80) return "Hard";
  return "Very Hard";
}

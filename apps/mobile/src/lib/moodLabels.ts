type DifficultyLabel =
  | "Scoring..."
  | "Not rated"
  | "Very Easy"
  | "Easy"
  | "Medium"
  | "Hard"
  | "Very Hard";

export { getMoodLabel } from "@adhd-planner/types";

export function getDifficultyLabel(value: number): DifficultyLabel {
  if (value < 0) return "Scoring...";
  if (value === 0) return "Not rated";
  if (value <= 20) return "Very Easy";
  if (value <= 40) return "Easy";
  if (value <= 60) return "Medium";
  if (value <= 80) return "Hard";
  return "Very Hard";
}

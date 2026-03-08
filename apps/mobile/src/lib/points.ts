export interface UserProgress {
  level: number;
  points: number;
  pointsToNextLevel: number;
}

export const INITIAL_PROGRESS: UserProgress = {
  level: 1,
  points: 0,
  pointsToNextLevel: 50,
};

export function calcPointsEarned(difficulty: number): number {
  return Math.round(difficulty / 10) + 1;
}

function nextLevelThreshold(level: number): number {
  let threshold = 50;
  for (let i = 1; i < level; i++) {
    threshold = Math.round(threshold * 1.5);
  }
  return threshold;
}

export function applyPoints(
  progress: UserProgress,
  difficulty: number
): { next: UserProgress; earned: number; leveledUp: boolean } {
  const earned = calcPointsEarned(difficulty);
  let { level, points, pointsToNextLevel } = progress;
  points += earned;
  let leveledUp = false;

  if (points >= pointsToNextLevel) {
    level += 1;
    points -= pointsToNextLevel;
    pointsToNextLevel = nextLevelThreshold(level);
    leveledUp = true;
  }

  return { next: { level, points, pointsToNextLevel }, earned, leveledUp };
}

export function xpPercent(progress: UserProgress): number {
  return Math.min(progress.points / progress.pointsToNextLevel, 1);
}

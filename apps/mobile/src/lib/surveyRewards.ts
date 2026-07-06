import type { SurveyRewardType } from "@adhd-planner/types";

export function formatSurveyReward(
  rewardType: SurveyRewardType,
  rewardAmount: number,
): string {
  switch (rewardType) {
    case "points":
      return `Earn ${rewardAmount} points`;
    case "pro_days":
      return rewardAmount === 7
        ? "Earn 1 week of Pro"
        : `Earn ${rewardAmount} days of Pro`;
    case "ai_credits":
      return `Earn ${rewardAmount} AI credits`;
  }
}

export function formatSurveyRewardCelebration(
  rewardType: SurveyRewardType,
  rewardAmount: number,
): string {
  switch (rewardType) {
    case "points":
      return `+${rewardAmount} points unlocked!`;
    case "pro_days":
      return rewardAmount === 7
        ? "1 week of Pro unlocked!"
        : `${rewardAmount} days of Pro unlocked!`;
    case "ai_credits":
      return `+${rewardAmount} AI credits unlocked!`;
  }
}

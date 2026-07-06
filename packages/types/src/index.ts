// Domain types shared between apps
export type SurveyRewardType = "points" | "pro_days" | "ai_credits";

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: number;
  completed: boolean;
  dueDate: string;
  dueTime: string;
  sourceType?: "survey";
  sourceId?: string;
  _creationTime: number;
}

export interface SurveyCampaign {
  _id: string;
  posthogSurveyId: string;
  title: string;
  description: string;
  rewardType: SurveyRewardType;
  rewardAmount: number;
}

export interface UserProgress {
  level: number;
  points: number;
  pointsToNextLevel: number;
}

export interface UserPreferences {
  _id: string;
  userId: string;
  name: string;
  bestWorkTimes: string[];
  difficulties: string[];
  strengths: string[];
  notificationsEnabled?: boolean;
  onboardingCompleted: boolean;
  hasCompletedTour?: boolean;
  _creationTime: number;
}

export interface Subscription {
  isActive: boolean;
  productId?: string;
  periodType?: string;
  expiresAt?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
}

export interface Achievement {
  achievementId: string;
  unlockedAt: number;
}

export interface WeeklyReport {
  tasksCompletedThisWeek: number;
  tasksCompletedLastWeek: number;
  mostProductiveDay: string | null;
  avgDifficulty: number;
  currentStreak: number;
  longestStreak: number;
}

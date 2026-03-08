// Domain types shared between apps
export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: number;
  completed: boolean;
  dueDate: string;
  dueTime: string;
  _creationTime: number;
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
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  _creationTime: number;
}

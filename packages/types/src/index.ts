// Domain types shared between apps/api and apps/mobile

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  difficulty: number;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Auth
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
}

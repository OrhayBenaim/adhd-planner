// apps/mobile/src/hooks/useTasks.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export type CreateTaskInput = {
  title: string;
  description?: string;
  difficulty: number;
  dueDate?: string;
  dueTime?: string;
};

export function useTasks() {
  return useQuery(api.tasks.list) ?? [];
}

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useCompleteTask() {
  return useMutation(api.tasks.completeTask);
}

export function useDeleteTask() {
  return useMutation(api.tasks.remove);
}

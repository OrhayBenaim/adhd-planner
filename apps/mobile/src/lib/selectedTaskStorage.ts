import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Task } from "@adhd-planner/types";

const KEY_PREFIX = "lullio.selectedTaskId.";

export function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function readSelectedTaskId(userId: string): Promise<string | null> {
  return await AsyncStorage.getItem(storageKey(userId));
}

export async function writeSelectedTaskId(
  userId: string,
  taskId: string | null,
): Promise<void> {
  const key = storageKey(userId);
  if (taskId === null) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, taskId);
  }
}

export function resolveSelectedTask(tasks: Task[], taskId: string | null): Task | null {
  if (!taskId) return null;
  const task = tasks.find((t) => t._id === taskId);
  if (!task || task.completed) return null;
  return task;
}

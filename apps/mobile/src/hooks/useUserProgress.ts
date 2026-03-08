// apps/mobile/src/hooks/useUserProgress.ts
import { useQuery } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function useUserProgress() {
  const progress = useQuery(api.progress.get) ?? {
    level: 1,
    points: 0,
    pointsToNextLevel: 50,
  };
  return { progress };
}

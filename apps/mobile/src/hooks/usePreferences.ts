import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function useNeedsOnboarding() {
  return useQuery(api.preferences.needsOnboarding);
}

export function useSavePreferences() {
  return useMutation(api.preferences.save);
}

import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function useNeedsOnboarding() {
  return useQuery(api.preferences.needsOnboarding);
}

export function useSavePreferences() {
  return useMutation(api.preferences.save);
}

export function useUpdatePreferences() {
  return useMutation(api.preferences.update);
}

export function usePreferences() {
  return useQuery(api.preferences.get);
}

export function useHasCompletedTour() {
  const prefs = useQuery(api.preferences.get);
  return prefs?.hasCompletedTour ?? false;
}

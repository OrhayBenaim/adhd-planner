import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function useNeedsOnboarding() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.preferences.needsOnboarding, isAuthenticated ? {} : "skip");
}

export function useSavePreferences() {
  return useMutation(api.preferences.save);
}

export function useUpdatePreferences() {
  return useMutation(api.preferences.update);
}

export function usePreferences() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.preferences.get, isAuthenticated ? {} : "skip");
}

export function useHasCompletedTour() {
  const prefs = usePreferences();
  return prefs?.hasCompletedTour ?? false;
}

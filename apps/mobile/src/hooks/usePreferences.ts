import { useQuery, useMutation, useConvexAuth } from "convex/react";
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
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.preferences.get, isAuthenticated ? {} : "skip");
}

export function useHasCompletedTour() {
  const { isAuthenticated } = useConvexAuth();
  const prefs = useQuery(api.preferences.get, isAuthenticated ? {} : "skip");
  return prefs?.hasCompletedTour ?? false;
}

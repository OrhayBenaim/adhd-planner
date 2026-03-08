import { useQuery, useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";

export function usePreferences() {
  return useQuery(api.preferences.get);
}

export function useSavePreferences() {
  return useMutation(api.preferences.save);
}

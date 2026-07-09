import { createContext, useContext, useReducer, useState, useCallback, type ReactNode } from "react";
import * as Sentry from "@sentry/react-native";
import { useSavePreferences } from "../../hooks/usePreferences";
import { router } from "expo-router";
import { track } from "../../lib/analytics";

interface OnboardingState {
  name: string;
  bestWorkTimes: string[];
  difficulties: string[];
  strengths: string[];
  notificationsEnabled: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  updateField: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  toggleArrayItem: (key: "bestWorkTimes" | "difficulties" | "strengths", item: string) => void;
  saveOnboardingData: (overrides?: Partial<OnboardingState>) => Promise<void>;
  submitOnboarding: (overrides?: Partial<OnboardingState>) => Promise<void>;
  isSubmitting: boolean;
}

type ArrayKey = "bestWorkTimes" | "difficulties" | "strengths";

type OnboardingAction =
  | { type: "set_name"; name: string }
  | { type: "set_notifications"; enabled: boolean }
  | { type: "toggle_array_item"; key: ArrayKey; item: string };

const initialState: OnboardingState = {
  name: "",
  bestWorkTimes: [],
  difficulties: [],
  strengths: [],
  notificationsEnabled: false,
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.name };
    case "set_notifications":
      return { ...state, notificationsEnabled: action.enabled };
    case "toggle_array_item": {
      const arr = state[action.key];
      return {
        ...state,
        [action.key]: arr.includes(action.item)
          ? arr.filter((i) => i !== action.item)
          : [...arr, action.item],
      };
    }
  }
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const savePreferences = useSavePreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const updateField = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      if (key === "name") dispatch({ type: "set_name", name: value as string });
      else if (key === "notificationsEnabled") dispatch({ type: "set_notifications", enabled: value as boolean });
    },
    []
  );

  const toggleArrayItem = useCallback(
    (key: ArrayKey, item: string) => {
      dispatch({ type: "toggle_array_item", key, item });
    },
    []
  );

  const saveOnboardingData = useCallback(
    async (overrides?: Partial<OnboardingState>) => {
      const data = { ...state, ...overrides };
      await savePreferences({
        name: data.name,
        bestWorkTimes: data.bestWorkTimes,
        difficulties: data.difficulties,
        strengths: data.strengths,
        notificationsEnabled: data.notificationsEnabled,
      });
      track("onboarding_completed");
    },
    [state, savePreferences]
  );

  const submitOnboarding = useCallback(
    async (overrides?: Partial<OnboardingState>) => {
      setIsSubmitting(true);
      try {
        await saveOnboardingData(overrides);
        router.replace("/");
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [saveOnboardingData]
  );

  return (
    <OnboardingContext.Provider
      value={{ state, updateField, toggleArrayItem, saveOnboardingData, submitOnboarding, isSubmitting }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

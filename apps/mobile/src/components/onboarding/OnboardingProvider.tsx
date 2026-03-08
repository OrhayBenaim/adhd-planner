import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Alert } from "react-native";
import { useSavePreferences } from "../../hooks/usePreferences";
import { router } from "expo-router";

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
  submitOnboarding: () => Promise<void>;
  isSubmitting: boolean;
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
  const [state, setState] = useState<OnboardingState>({
    name: "",
    bestWorkTimes: [],
    difficulties: [],
    strengths: [],
    notificationsEnabled: false,
  });

  const updateField = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleArrayItem = useCallback(
    (key: "bestWorkTimes" | "difficulties" | "strengths", item: string) => {
      setState((prev) => {
        const arr = prev[key];
        const next = arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const submitOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await savePreferences({
        name: state.name,
        bestWorkTimes: state.bestWorkTimes,
        difficulties: state.difficulties,
        strengths: state.strengths,
        notificationsEnabled: state.notificationsEnabled,
      });
      router.replace("/");
    } catch (error) {
      console.error("[onboarding] save failed:", error);
      Alert.alert(
        "Something went wrong",
        "We couldn't save your preferences. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [state, savePreferences]);

  return (
    <OnboardingContext.Provider
      value={{ state, updateField, toggleArrayItem, submitOnboarding, isSubmitting }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

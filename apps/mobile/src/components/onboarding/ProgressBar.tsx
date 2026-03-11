import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TOTAL_STEPS } from "../../constants/onboarding";

const STEP_IDS = Array.from({ length: TOTAL_STEPS }, (_, i) => `step-${i + 1}`);

interface Props {
  currentStep: number; // 1-based
}

export function ProgressBar({ currentStep }: Props) {
  return (
    <View className="flex-row gap-2 px-6 pt-6">
      {STEP_IDS.map((id, i) => {
        const filled = i < currentStep;
        return filled ? (
          <LinearGradient
            key={id}
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="flex-1 h-1 rounded-full"
          />
        ) : (
          <View key={id} className="flex-1 h-1 rounded-full bg-[#e5e7eb]" />
        );
      })}
    </View>
  );
}

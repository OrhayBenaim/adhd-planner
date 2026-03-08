import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TOTAL_STEPS } from "../../constants/onboarding";

interface Props {
  currentStep: number; // 1-based
}

export function ProgressBar({ currentStep }: Props) {
  return (
    <View className="flex-row gap-2 px-6 pt-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const filled = i < currentStep;
        return filled ? (
          <LinearGradient
            key={i}
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="flex-1 h-1 rounded-full"
          />
        ) : (
          <View key={i} className="flex-1 h-1 rounded-full bg-[#e5e7eb]" />
        );
      })}
    </View>
  );
}

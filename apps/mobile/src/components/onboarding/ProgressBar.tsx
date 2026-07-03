import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { TOTAL_STEPS } from "../../constants/onboarding";

const STEP_IDS = Array.from({ length: TOTAL_STEPS }, (_, i) => `step-${i + 1}`);

interface Props {
  currentStep: number; // 1-based
}

/** Paw prints walking along a path — one paw per onboarding step. */
export function ProgressBar({ currentStep }: Props) {
  return (
    <View className="flex-row items-center justify-center gap-1 px-6 pt-6">
      {STEP_IDS.map((id, i) => {
        const reached = i < currentStep;
        const isCurrent = i === currentStep - 1;
        return (
          <View key={id} className="flex-row items-center">
            {i > 0 && (
              <View
                className="w-6 h-[2px] rounded-full mx-1"
                style={{ backgroundColor: reached ? "#cdb4db" : "#e5e7eb" }}
              />
            )}
            {isCurrent ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <Ionicons
                  name="paw"
                  size={20}
                  color="#a2d2ff"
                  style={{ transform: [{ rotate: i % 2 === 0 ? "-12deg" : "12deg" }] }}
                />
              </Animated.View>
            ) : (
              <Ionicons
                name="paw"
                size={16}
                color={reached ? "#cdb4db" : "#e5e7eb"}
                style={{ transform: [{ rotate: i % 2 === 0 ? "-12deg" : "12deg" }] }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

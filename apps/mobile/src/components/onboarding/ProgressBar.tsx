import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onboardingColors as colors } from "./theme";

const LABELS = ["Started", "You", "Hard", "Easy", "Times", "Save"];

export function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Onboarding: ${LABELS[currentStep]}`}
      accessibilityValue={{ min: 1, max: 5, now: currentStep }}
      style={{ flexDirection: "row", height: 52, alignItems: "center", gap: 2, paddingTop: 8, paddingBottom: 4 }}>
      {LABELS.map((label, i) => {
        const current = i === currentStep;
        const color = current ? colors.accent : i < currentStep ? colors.primary : colors.border;
        return <View key={label} style={{ flex: 1, alignItems: "center", gap: 4, opacity: i > currentStep ? 0.5 : 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: current ? 26 : 22 }}>
            {i > 0 && <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: color }} />}
            <Ionicons name="paw" size={current ? 22 : 18} color={color}
              style={{ transform: [{ rotate: i % 2 === 0 ? "12deg" : "-12deg" }] }} />
          </View>
          <Text style={{ fontFamily: "Inter-Regular", fontSize: 10, lineHeight: 13, color: i <= currentStep ? colors.ink : colors.body }}>{label}</Text>
        </View>;
      })}
    </View>
  );
}

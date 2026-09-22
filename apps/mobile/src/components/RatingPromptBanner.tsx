import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppPressable as Pressable } from "./AppPressable";
import { OnboardingButton } from "./onboarding/OnboardingButton";
import { homeColors, homeStyles } from "./home/theme";

interface Props {
  onRate: () => void;
  onDismiss: () => void;
}

export function RatingPromptBanner({ onRate, onDismiss }: Props) {
  return (
    <View style={homeStyles.notice}>
      <View style={homeStyles.noticeRow}>
        <Text style={homeStyles.noticeTitle}>Enjoying Lullio?</Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss rating prompt"
          style={homeStyles.dismiss}
        >
          <Ionicons name="close" size={16} color={homeColors.ink} />
        </Pressable>
      </View>

      <Text style={homeStyles.body}>
        A quick rating helps other ADHD brains find us.
      </Text>

      <View style={{ height: 4 }} />
      <OnboardingButton label="Rate Lullio" onPress={onRate} />
    </View>
  );
}

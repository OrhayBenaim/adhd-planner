import { Text, View } from "react-native";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeColors, homeStyles } from "../home/theme";

interface Props {
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  secondaryText?: string;
  showMascot?: boolean;
  stepNumber?: number;
  totalSteps?: number;
  arrow?: "up" | "down";
}

export function TourTooltip({ title, description, buttonLabel, onPress, secondaryText, stepNumber, totalSteps }: Props) {
  return <View style={{ marginHorizontal: 24, padding: 18, borderRadius: 22, backgroundColor: "white", borderWidth: 1, borderColor: homeColors.border, gap: 10 }}>
    {stepNumber !== undefined && totalSteps !== undefined && <Text style={[homeStyles.eyebrow, { letterSpacing: 0 }]}>STEP {stepNumber} OF {totalSteps}</Text>}
    <Text style={[homeStyles.heading, { fontSize: 23, lineHeight: 30 }]}>{title}</Text>
    <Text style={[homeStyles.body, { fontSize: 15, lineHeight: 19 }]}>{description}</Text>
    {secondaryText && <Text style={homeStyles.caption}>{secondaryText}</Text>}
    {buttonLabel && onPress && <OnboardingButton label={buttonLabel} onPress={onPress} />}
  </View>;
}

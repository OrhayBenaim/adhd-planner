import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SurveyCampaign } from "@adhd-planner/types";
import { AppPressable as Pressable } from "../AppPressable";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeColors, homeStyles } from "../home/theme";
import { formatSurveyReward } from "../../lib/surveyRewards";

interface Props {
  campaign: SurveyCampaign;
  onTakeSurvey: () => void;
  onDismiss: () => void;
}

/** Compact restatement of the invite — the full description stays on the invite itself. */
export function SurveyReminderBanner({
  campaign,
  onTakeSurvey,
  onDismiss,
}: Props) {
  return (
    <View style={homeStyles.notice}>
      <View style={homeStyles.noticeRow}>
        <Text style={homeStyles.noticeTitle}>{campaign.title}</Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss survey reminder"
          style={homeStyles.dismiss}
        >
          <Ionicons name="close" size={16} color={homeColors.ink} />
        </Pressable>
      </View>

      <View style={[homeStyles.pill, { alignSelf: "flex-start" }]}>
        <Text style={homeStyles.pillLabel}>
          {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
        </Text>
      </View>

      <View style={{ height: 4 }} />
      <OnboardingButton label="Take survey" onPress={onTakeSurvey} />
    </View>
  );
}

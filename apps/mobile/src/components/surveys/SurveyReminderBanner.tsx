import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { SurveyCampaign } from "@adhd-planner/types";
import { formatSurveyReward } from "../../lib/surveyRewards";

interface Props {
  campaign: SurveyCampaign;
  onTakeSurvey: () => void;
  onDismiss: () => void;
}

export function SurveyReminderBanner({
  campaign,
  onTakeSurvey,
  onDismiss,
}: Props) {
  return (
    <View
      className="bg-white border border-[#cdb4db] rounded-3xl p-4 mb-4"
      style={{ boxShadow: "0px 2px 8px rgba(205, 180, 219, 0.35)" }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <Ionicons name="clipboard-outline" size={18} color="#6a7282" />
          <Text className="text-xs font-medium text-[#6a7282] uppercase tracking-wide">
            Survey waiting
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss survey reminder"
          className="w-8 h-8 rounded-full items-center justify-center bg-[#f5f7fa]"
        >
          <Ionicons name="close" size={16} color="#6a7282" />
        </Pressable>
      </View>

      <Text className="text-base font-medium text-[#1e2939] mb-1">
        {campaign.title}
      </Text>
      <Text className="text-sm text-[#4a5565] mb-3">{campaign.description}</Text>

      <Text className="text-xs font-semibold text-[#364153] mb-3">
        {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
      </Text>

      <Pressable onPress={onTakeSurvey} accessibilityRole="button">
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 20,
            paddingVertical: 13,
            alignItems: "center",
          }}
        >
          <Text className="text-white font-semibold text-base">Take survey</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

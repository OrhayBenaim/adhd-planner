import { View, Text, Platform, ScrollView } from "react-native";
import { useEffect } from "react";
import { AppPressable as Pressable } from "../AppPressable";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { SurveyCampaign } from "@adhd-planner/types";
import { Mascot } from "../mascot/Mascot";
import { formatSurveyReward } from "../../lib/surveyRewards";
import { posthog } from "../../lib/posthog";

interface Props {
  campaign: SurveyCampaign;
  onStart: () => void;
  onDefer: () => void;
  onDismiss: () => void;
}

export function SurveyInviteOverlay({
  campaign,
  onStart,
  onDefer,
  onDismiss,
}: Props) {
  useEffect(() => {
    posthog.capture("survey_invite_shown", { campaign_id: campaign._id });
  }, [campaign._id]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 z-[900] justify-center"
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mx-6">
          <View
            className="bg-white rounded-3xl px-6 py-6"
            style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)" }}
          >
            <View className="items-center">
              <Mascot pose="wave" size={120} />
            </View>

            <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2 mt-2">
              {campaign.title}
            </Text>
            <Text className="text-base text-[#6A7282] text-center mb-4 leading-6">
              {campaign.description}
            </Text>

            <View className="bg-[#bde0fe]/20 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-center text-sm font-medium text-[#0A0A0A]">
                {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
              </Text>
            </View>

            <Pressable onPress={onStart}>
              <LinearGradient
                colors={["#a2d2ff", "#cdb4db"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
              >
                <Text className="text-white font-semibold text-base">
                  Start survey
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={onDefer} className="mt-3 items-center py-2">
              <Text className="text-sm font-medium text-[#6A7282]">
                Add to my tasks
              </Text>
            </Pressable>

            {Platform.OS === "ios" && (
              <Pressable onPress={onDismiss} className="mt-1 items-center py-2">
                <Text className="text-sm text-[#99a1af]">Not now</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

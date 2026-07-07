import {
  View,
  Text,
  Modal,
  Pressable as RNPressable,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable as Pressable } from "../AppPressable";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    posthog.capture("survey_invite_shown", { campaign_id: campaign._id });
  }, [campaign._id]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <RNPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss survey invite"
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <View className="absolute inset-0 bg-black/55" />
            {Platform.OS === "ios" && (
              <BlurView
                intensity={28}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
          </Animated.View>
        </RNPressable>

        <ScrollView
          pointerEvents="box-none"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(220)}>
            <View
              className="bg-white rounded-3xl px-6 pt-5 pb-6 overflow-hidden"
              style={{
                boxShadow: "0px 16px 48px rgba(0, 0, 0, 0.28)",
              }}
            >
              <LinearGradient
                colors={["#a2d2ff", "#cdb4db"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                }}
              />

              <RNPressable
                onPress={onDismiss}
                hitSlop={12}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#f5f7fa] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#6a7282" />
              </RNPressable>

              <View className="items-center mt-2">
                <View className="bg-[#bde0fe]/30 rounded-full px-3 py-1 mb-3">
                  <Text className="text-xs font-semibold text-[#364153] uppercase tracking-wide">
                    Quick survey
                  </Text>
                </View>
                <Mascot pose="wave" size={110} />
              </View>

              <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-2 mt-1">
                {campaign.title}
              </Text>
              <Text className="text-base text-[#6A7282] text-center mb-4 leading-6">
                {campaign.description}
              </Text>

              <View className="bg-[#bde0fe]/25 border border-[#bde0fe]/50 rounded-2xl px-4 py-3 mb-5">
                <Text className="text-center text-sm font-semibold text-[#0A0A0A]">
                  {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
                </Text>
              </View>

              <Pressable onPress={onStart}>
                <LinearGradient
                  colors={["#a2d2ff", "#cdb4db"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 24,
                    paddingVertical: 15,
                    alignItems: "center",
                    boxShadow: "0px 6px 16px rgba(162, 210, 255, 0.45)",
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    Start survey
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={onDefer} className="mt-3 items-center py-2.5">
                <Text className="text-sm font-medium text-[#6A7282]">
                  Remind me later
                </Text>
              </Pressable>

              <RNPressable onPress={onDismiss} className="mt-1 items-center py-2">
                <Text className="text-sm text-[#99a1af]">Not now</Text>
              </RNPressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

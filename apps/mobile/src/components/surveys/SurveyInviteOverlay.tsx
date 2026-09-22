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
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { SurveyCampaign } from "@adhd-planner/types";
import { Mascot } from "../mascot/Mascot";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeColors, homeStyles } from "../home/theme";
import { formatSurveyReward } from "../../lib/surveyRewards";
import { track } from "../../lib/analytics";

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
    track("survey_invite_shown", { campaign_id: campaign._id });
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
            <View style={[StyleSheet.absoluteFill, homeStyles.scrim]} />
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
            <View style={homeStyles.modalCard}>
              <RNPressable
                onPress={onDismiss}
                hitSlop={12}
                style={homeStyles.modalDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={homeColors.ink} />
              </RNPressable>

              <View style={homeStyles.eyebrowPill}>
                <Text style={homeStyles.eyebrowPillLabel}>QUICK SURVEY</Text>
              </View>

              <Mascot pose="wave" size={150} />

              <Text style={homeStyles.modalTitle}>{campaign.title}</Text>
              <Text style={homeStyles.modalBody}>{campaign.description}</Text>

              <View style={homeStyles.pill}>
                <Text style={homeStyles.pillLabel}>
                  {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
                </Text>
              </View>

              <View style={{ alignSelf: "stretch" }}>
                <OnboardingButton label="Start survey" onPress={onStart} />
              </View>

              <Pressable
                onPress={onDefer}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={homeStyles.link}>Remind me later</Text>
              </Pressable>

              <RNPressable
                onPress={onDismiss}
                accessibilityRole="button"
                style={{ minHeight: 32, justifyContent: "center" }}
              >
                <Text style={homeStyles.linkMuted}>Not now</Text>
              </RNPressable>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

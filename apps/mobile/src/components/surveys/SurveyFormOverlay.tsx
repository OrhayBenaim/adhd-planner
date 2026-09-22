import {
  View,
  Text,
  Modal,
  Pressable as RNPressable,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable as Pressable } from "../AppPressable";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useMutation } from "convex/react";
import type { Survey } from "@posthog/core";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import type { Id } from "@adhd-planner/convex/convex/_generated/dataModel";
import type { SurveyCampaign } from "@adhd-planner/types";
import { Mascot } from "../mascot/Mascot";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeColors, homeStyles } from "../home/theme";
import {
  formatSurveyReward,
  formatSurveyRewardCelebration,
} from "../../lib/surveyRewards";
import {
  captureSurveyShown,
  loadSurveyDefinition,
  submitSurveyResponses,
  type SurveyResponseValue,
} from "../../lib/surveyPosthog";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

interface Props {
  campaign: SurveyCampaign;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SurveyFormOverlay({ campaign, onClose, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
  const completeSurvey = useMutation(api.surveys.completeSurvey);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, SurveyResponseValue>>(
    {},
  );
  const [openText, setOpenText] = useState("");
  const [thankYou, setThankYou] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadSurveyDefinition(campaign.posthogSurveyId)
      .then((definition) => {
        if (cancelled) return;
        if (!definition?.questions.length) {
          setLoadError("Survey is not available right now.");
          return;
        }
        captureSurveyShown(definition);
        setSurvey(definition);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load survey. Try again later.");
      });
    return () => {
      cancelled = true;
    };
  }, [campaign.posthogSurveyId]);

  const questions = survey?.questions ?? [];
  const currentQuestion = questions[stepIndex];
  const isLastStep = stepIndex >= questions.length - 1;

  const ratingLabels = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== "rating") return null;
    return {
      low: currentQuestion.lowerBoundLabel ?? "Not helpful",
      high: currentQuestion.upperBoundLabel ?? "Very helpful",
    };
  }, [currentQuestion]);

  const handleSubmit = useCallback(
    async (finalResponses: Record<string, SurveyResponseValue>) => {
      if (!survey || submittingRef.current) return;
      submittingRef.current = true;
      try {
        submitSurveyResponses(survey, finalResponses);
        try {
          await completeSurvey({
            campaignId: campaign._id as Id<"surveyCampaigns">,
          });
        } catch {
          // webhook backstop may still grant reward
        }
        setThankYou(true);
        onSubmitted();
        setTimeout(onClose, 2200);
      } finally {
        submittingRef.current = false;
      }
    },
    [survey, campaign._id, completeSurvey, onSubmitted, onClose],
  );

  const handleRatingSelect = useCallback(
    (value: number) => {
      if (!currentQuestion || currentQuestion.type !== "rating") return;
      const next = { ...responses, [currentQuestion.id]: value };
      setResponses(next);
      if (isLastStep) {
        void handleSubmit(next);
      } else {
        setStepIndex((i) => i + 1);
      }
    },
    [currentQuestion, isLastStep, responses, handleSubmit],
  );

  const handleOpenNext = useCallback(() => {
    if (!currentQuestion || currentQuestion.type !== "open") return;
    const trimmed = openText.trim();
    if (!trimmed && !currentQuestion.optional) return;

    const next = { ...responses };
    if (trimmed) next[currentQuestion.id] = trimmed;

    if (isLastStep) {
      void handleSubmit(next);
    } else {
      setResponses(next);
      setOpenText("");
      setStepIndex((i) => i + 1);
    }
  }, [currentQuestion, openText, isLastStep, responses, handleSubmit]);

  const handleSkipOptional = useCallback(() => {
    if (!currentQuestion?.optional) return;
    if (isLastStep) {
      void handleSubmit(responses);
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [currentQuestion, isLastStep, responses, handleSubmit]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <RNPressable
          accessibilityRole="button"
          accessibilityLabel="Close survey"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, homeStyles.scrim]} />
            {Platform.OS === "ios" && (
              <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </Animated.View>
        </RNPressable>

        <ScrollView
          pointerEvents="box-none"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(220)}>
            <View style={homeStyles.modalCard}>
              <RNPressable
                onPress={onClose}
                hitSlop={12}
                style={homeStyles.modalDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={homeColors.ink} />
              </RNPressable>

              {thankYou ? (
                <>
                  <Mascot pose="celebrate" size={150} />
                  <Text style={homeStyles.modalTitle}>That really helps</Text>
                  <Text style={homeStyles.modalBody}>
                    Your answers go straight to the team.
                  </Text>
                  <View style={homeStyles.pill}>
                    <Text style={homeStyles.pillLabel}>
                      {formatSurveyRewardCelebration(
                        campaign.rewardType,
                        campaign.rewardAmount,
                      )}
                    </Text>
                  </View>
                </>
              ) : loadError ? (
                <>
                  <Text style={homeStyles.modalBody}>{loadError}</Text>
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text style={homeStyles.link}>Close</Text>
                  </Pressable>
                </>
              ) : !survey || !currentQuestion ? (
                <View style={{ paddingVertical: 32, alignItems: "center", gap: 14 }}>
                  <ActivityIndicator size="large" color={homeColors.primary} />
                  <Text style={homeStyles.modalBody}>Loading survey…</Text>
                </View>
              ) : (
                <>
                  <View style={homeStyles.eyebrowPill}>
                    <Text style={homeStyles.eyebrowPillLabel}>
                      {`QUESTION ${stepIndex + 1} OF ${questions.length}`}
                    </Text>
                  </View>

                  <Text style={homeStyles.modalTitle}>
                    {"question" in currentQuestion ? currentQuestion.question : ""}
                  </Text>

                  {currentQuestion.type === "rating" ? (
                    <View style={{ alignSelf: "stretch", gap: 8 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {RATING_VALUES.map((value) => {
                          const selected = responses[currentQuestion.id] === value;
                          return (
                            <Pressable
                              key={value}
                              onPress={() => handleRatingSelect(value)}
                              accessibilityRole="button"
                              accessibilityLabel={`Rating ${value} of 5`}
                              accessibilityHint={
                                value === 1
                                  ? ratingLabels?.low
                                  : value === 5
                                    ? ratingLabels?.high
                                    : undefined
                              }
                              style={{
                                flex: 1,
                                minHeight: 54,
                                borderRadius: 14,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: selected
                                  ? homeColors.selected
                                  : homeColors.white,
                                borderColor: selected
                                  ? homeColors.primary
                                  : homeColors.border,
                                borderWidth: selected ? 2 : 1,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter-SemiBold",
                                  fontSize: 17,
                                  lineHeight: 24,
                                  color: homeColors.ink,
                                }}
                              >
                                {value}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {ratingLabels ? (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={homeStyles.caption}>{ratingLabels.low}</Text>
                          <Text style={homeStyles.caption}>{ratingLabels.high}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {currentQuestion.type === "open" ? (
                    <View style={{ alignSelf: "stretch", gap: 14 }}>
                      <TextInput
                        value={openText}
                        onChangeText={setOpenText}
                        placeholder="Type anything, or skip it."
                        placeholderTextColor={homeColors.muted}
                        multiline
                        textAlignVertical="top"
                        accessibilityLabel="Survey answer"
                        style={{
                          minHeight: 112,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: homeColors.border,
                          backgroundColor: homeColors.white,
                          padding: 16,
                          fontFamily: "Inter-Regular",
                          fontSize: 16,
                          lineHeight: 22,
                          color: homeColors.ink,
                        }}
                      />
                      <OnboardingButton
                        label={isLastStep ? "Submit" : "Next"}
                        onPress={handleOpenNext}
                        disabled={!openText.trim() && !currentQuestion.optional}
                      />
                      {currentQuestion.optional ? (
                        <Pressable
                          onPress={handleSkipOptional}
                          accessibilityRole="button"
                          style={{ minHeight: 44, justifyContent: "center" }}
                        >
                          <Text style={homeStyles.link}>Skip this one</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={homeStyles.pill}>
                    <Text style={homeStyles.pillLabel}>
                      {formatSurveyReward(campaign.rewardType, campaign.rewardAmount)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

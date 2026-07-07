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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { Survey } from "@posthog/core";
import type { SurveyCampaign } from "@adhd-planner/types";
import { Mascot } from "../mascot/Mascot";
import {
  formatSurveyReward,
  formatSurveyRewardCelebration,
} from "../../lib/surveyRewards";
import {
  loadSurveyDefinition,
  submitSurveyResponses,
  type SurveyResponseValue,
} from "../../lib/surveyPosthog";

const RATING_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"] as const;

interface Props {
  campaign: SurveyCampaign;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SurveyFormOverlay({ campaign, onClose, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
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
        setThankYou(true);
        onSubmitted();
        setTimeout(onClose, 2200);
      } finally {
        submittingRef.current = false;
      }
    },
    [survey, onSubmitted, onClose],
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
            <View className="absolute inset-0 bg-black/55" />
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
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(220)}>
            <View
              className="bg-white rounded-3xl px-6 pt-5 pb-6 overflow-hidden"
              style={{ boxShadow: "0px 16px 48px rgba(0, 0, 0, 0.28)" }}
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
                onPress={onClose}
                hitSlop={12}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#f5f7fa] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color="#6a7282" />
              </RNPressable>

              {thankYou ? (
                <View className="items-center py-6 px-2">
                  <Mascot pose="celebrate" size={120} />
                  <Text className="text-xl font-semibold text-[#0A0A0A] text-center mt-4 mb-2">
                    Thank you!
                  </Text>
                  <Text className="text-base text-[#6A7282] text-center">
                    {formatSurveyRewardCelebration(
                      campaign.rewardType,
                      campaign.rewardAmount,
                    )}
                  </Text>
                </View>
              ) : loadError ? (
                <View className="items-center py-8 px-2">
                  <Text className="text-base text-[#6A7282] text-center mb-4">
                    {loadError}
                  </Text>
                  <Pressable onPress={onClose} className="py-2 px-4">
                    <Text className="text-sm font-medium text-[#364153]">Close</Text>
                  </Pressable>
                </View>
              ) : !survey || !currentQuestion ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color="#a2d2ff" />
                  <Text className="text-sm text-[#6A7282] mt-4">Loading survey…</Text>
                </View>
              ) : (
                <>
                  <View className="items-center mt-2 mb-4">
                    <View className="bg-[#bde0fe]/30 rounded-full px-3 py-1 mb-3">
                      <Text className="text-xs font-semibold text-[#364153] uppercase tracking-wide">
                        Question {stepIndex + 1} of {questions.length}
                      </Text>
                    </View>
                    <Mascot pose="wave" size={90} />
                  </View>

                  <Text className="text-xl font-semibold text-[#0A0A0A] text-center mb-6 leading-7">
                    {"question" in currentQuestion ? currentQuestion.question : ""}
                  </Text>

                  {currentQuestion.type === "rating" ? (
                    <View className="mb-6">
                      <View className="flex-row justify-between gap-2">
                        {RATING_EMOJIS.map((emoji, index) => {
                          const value = index + 1;
                          const selected =
                            responses[currentQuestion.id] === value;
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
                              className={`flex-1 min-h-[56px] rounded-2xl items-center justify-center border-2 ${
                                selected
                                  ? "border-[#a2d2ff] bg-[#bde0fe]/40"
                                  : "border-[#f3f4f6] bg-[#f5f7fa]"
                              }`}
                            >
                              <Text style={{ fontSize: 32 }}>{emoji}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {ratingLabels ? (
                        <View className="flex-row justify-between mt-2 px-1">
                          <Text className="text-xs text-[#6A7282]">
                            {ratingLabels.low}
                          </Text>
                          <Text className="text-xs text-[#6A7282]">
                            {ratingLabels.high}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {currentQuestion.type === "open" ? (
                    <View className="mb-4">
                      <TextInput
                        value={openText}
                        onChangeText={setOpenText}
                        placeholder="Share your thoughts…"
                        placeholderTextColor="#99a1af"
                        multiline
                        textAlignVertical="top"
                        accessibilityLabel="Survey answer"
                        className="bg-[#bde0fe]/20 border border-[#bde0fe]/60 rounded-2xl px-4 py-3 text-base text-[#0A0A0A] min-h-[120px]"
                      />
                      <Pressable onPress={handleOpenNext} className="mt-4">
                        <LinearGradient
                          colors={["#a2d2ff", "#cdb4db"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            borderRadius: 24,
                            paddingVertical: 15,
                            alignItems: "center",
                            opacity:
                              !openText.trim() && !currentQuestion.optional
                                ? 0.5
                                : 1,
                          }}
                        >
                          <Text className="text-white font-semibold text-base">
                            {isLastStep ? "Submit" : "Next"}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                      {currentQuestion.optional ? (
                        <Pressable
                          onPress={handleSkipOptional}
                          className="mt-3 items-center py-2"
                        >
                          <Text className="text-sm font-medium text-[#6A7282]">
                            Skip
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <View className="bg-[#bde0fe]/25 border border-[#bde0fe]/50 rounded-2xl px-4 py-3 mt-2">
                    <Text className="text-center text-sm font-semibold text-[#0A0A0A]">
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

import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { PRODUCTIVE_TIMES } from "../../src/constants/onboarding";
import { posthog } from "../../src/lib/posthog";

export default function WorkTimeStep() {
  const { state, toggleArrayItem } = useOnboarding();

  useEffect(() => {
    posthog.capture("onboarding_step_viewed", { step: "work_time", step_number: 2 });
  }, []);

  const firstName = state.name.trim().split(" ")[0];

  return (
    <OnboardingLayout
      step={2}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/difficulties")}
      continueEnabled={state.bestWorkTimes.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <MascotHeader
            pose="wave"
            title={firstName ? `Nice to meet you, ${firstName}!` : "Nice to meet you!"}
            subtitle="When does your brain work best? I'll suggest tasks at those times."
            mascotSize={130}
          />

          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            className="w-full gap-3 mt-8"
          >
            {PRODUCTIVE_TIMES.map((time) => {
              const isSelected = state.bestWorkTimes.includes(time.label);
              return isSelected ? (
                <Pressable
                  key={time.id}
                  onPress={() => toggleArrayItem("bestWorkTimes", time.label)}
                >
                  <LinearGradient
                    colors={["rgba(189,224,254,0.2)", "rgba(162,210,255,0.2)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="rounded-3xl px-5 py-5"
                    style={{ borderWidth: 1.5, borderColor: "#a2d2ff" }}
                  >
                    <Text className="text-base font-medium text-[#1e2939]">
                      {time.label}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  key={time.id}
                  onPress={() => toggleArrayItem("bestWorkTimes", time.label)}
                  className="rounded-3xl px-5 py-5"
                  style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
                >
                  <Text className="text-base font-medium text-[#364153]">
                    {time.label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

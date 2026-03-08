import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { PRODUCTIVE_TIMES } from "../../src/constants/onboarding";

export default function WorkTimeStep() {
  const { state, toggleArrayItem } = useOnboarding();

  return (
    <OnboardingLayout
      step={2}
      onBack={() => router.back()}
      onContinue={() => router.push("/(onboarding)/difficulties")}
      continueEnabled={state.bestWorkTimes.length > 0}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="items-center">
          {/* Illustration placeholder */}
          <View className="w-48 h-48 rounded-3xl bg-[#cdb4db]/20 items-center justify-center mb-8">
            <Text className="text-6xl">⏰</Text>
          </View>

          <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
            When do you work best? ⏰
          </Text>
          <Text className="text-base text-[#4a5565] text-center mb-8">
            Help us schedule tasks when you're most productive
          </Text>

          <View className="w-full gap-3">
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
                    className="rounded-3xl px-4 py-4"
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
                  className="rounded-3xl px-4 py-4"
                  style={{ borderWidth: 1.5, borderColor: "#e5e7eb" }}
                >
                  <Text className="text-base font-medium text-[#364153]">
                    {time.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  );
}

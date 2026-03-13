import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { posthog } from "../../src/lib/posthog";

export default function NotificationsStep() {
  const { updateField } = useOnboarding();

  useEffect(() => {
    posthog.capture("onboarding_step_viewed", { step: "notifications", step_number: 5 });
  }, []);

  const handleEnable = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      updateField("notificationsEnabled", status === "granted");
    } catch {
      updateField("notificationsEnabled", false);
    }
    router.push("/(onboarding)/sign-in");
  };

  const handleSkip = () => {
    updateField("notificationsEnabled", false);
    router.push("/(onboarding)/sign-in");
  };

  return (
    <OnboardingLayout
      step={5}
      onContinue={() => {}} // unused, footer hidden
      continueEnabled={false}
      showFooter={false}
    >
      <View className="flex-1 items-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#ffc8dd]/20 items-center justify-center" style={{ marginBottom: 32 }}>
          <Text className="text-6xl">🔔</Text>
        </View>

        {/* Bell icon badge */}
        <LinearGradient
          colors={["#ffc8dd", "#ffafcc"]}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 6,
          }}
        >
          <Ionicons name="notifications-outline" size={28} color="#fff" />
        </LinearGradient>

        <Text className="text-3xl font-bold text-[#1e2939] text-center mb-2">
          Stay on track 🔔
        </Text>
        <Text className="text-lg text-[#4a5565] text-center mb-10 px-4">
          Enable notifications to get gentle reminders when it's time to tackle your tasks
        </Text>

        {/* Enable button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 9999,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Pressable onPress={handleEnable} className="flex-1 items-center justify-center">
            <Text className="text-white font-semibold text-base">
              Enable Notifications
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Skip button */}
        <Pressable onPress={handleSkip}>
          <Text className="text-base font-medium text-[#6a7282]">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </OnboardingLayout>
  );
}

import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";

export default function NotificationsStep() {
  const { updateField } = useOnboarding();

  const handleEnable = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    updateField("notificationsEnabled", status === "granted");
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
      <View className="flex-1 items-center justify-center">
        {/* Illustration placeholder */}
        <View className="w-48 h-48 rounded-3xl bg-[#ffc8dd]/20 items-center justify-center mb-4">
          <Text className="text-6xl">🔔</Text>
        </View>

        {/* Bell icon badge */}
        <LinearGradient
          colors={["#ffc8dd", "#ffafcc"]}
          className="w-20 h-20 rounded-full items-center justify-center shadow-lg -mt-12 mb-6"
        >
          <Ionicons name="notifications" size={40} color="#fff" />
        </LinearGradient>

        <Text className="text-2xl font-bold text-[#1e2939] text-center mb-2">
          Stay on track 🔔
        </Text>
        <Text className="text-base text-[#4a5565] text-center mb-10 px-4">
          Enable notifications to get gentle reminders when it's time to tackle your tasks
        </Text>

        {/* Enable button */}
        <LinearGradient
          colors={["#a2d2ff", "#cdb4db"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="w-full h-14 rounded-3xl shadow-lg mb-4"
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

import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { MascotHeader } from "../../src/components/onboarding/MascotHeader";
import { useOnboarding } from "../../src/components/onboarding/OnboardingProvider";
import { posthog } from "../../src/lib/posthog";

export default function NotificationsStep() {
  const { updateField, submitOnboarding, isSubmitting } = useOnboarding();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    posthog.capture("onboarding_step_viewed", { step: "notifications", step_number: 5 });
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    let enabled = false;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      enabled = status === "granted";
    } catch {
      enabled = false;
    }
    updateField("notificationsEnabled", enabled);
    await submitOnboarding({ notificationsEnabled: enabled });
    setBusy(false);
  };

  const handleSkip = async () => {
    setBusy(true);
    updateField("notificationsEnabled", false);
    await submitOnboarding({ notificationsEnabled: false });
    setBusy(false);
  };

  const disabled = busy || isSubmitting;

  return (
    <OnboardingLayout step={5} showFooter={false}>
      <View className="flex-1 items-center">
        <MascotHeader
          pose="wave"
          title="One last thing!"
          subtitle="I can send you a gentle nudge when it's a good time to tackle a task. No spam, no guilt — promise."
          mascotSize={170}
        />

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          className="w-full items-center mt-10"
        >
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
              opacity: disabled ? 0.6 : 1,
              boxShadow: "0px 4px 8px rgba(0,0,0,0.15)",
            }}
          >
            <Pressable
              onPress={handleEnable}
              disabled={disabled}
              className="flex-1 items-center justify-center"
            >
              <Text className="text-white font-semibold text-base">
                {disabled ? "Getting things ready..." : "Enable gentle reminders"}
              </Text>
            </Pressable>
          </LinearGradient>

          {/* Skip button */}
          <Pressable onPress={handleSkip} disabled={disabled}>
            <Text className="text-base font-medium text-[#6a7282]">
              Maybe later
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </OnboardingLayout>
  );
}

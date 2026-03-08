import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { authClient } from "../src/lib/authClient";
import { usePreferences } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const preferences = usePreferences();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e) =>
        console.error("[index] sign-in error:", e)
      );
    }
  }, [session, isPending]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (session && preferences !== undefined && !preferences?.onboardingCompleted) {
      router.replace("/(onboarding)/welcome");
    }
  }, [session, preferences]);

  // Show loader until session is ready and preferences are loaded
  if (isPending || !session || preferences === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  // If onboarding not done, show loader (redirect is happening)
  if (!preferences?.onboardingCompleted) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return <HomeScreen />;
}

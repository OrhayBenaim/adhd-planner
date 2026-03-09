import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const needsOnboarding = useNeedsOnboarding();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e) => {
        if (__DEV__) console.error("[index] sign-in error:", e);
      });
    }
  }, [session, isPending]);

  // Redirect to onboarding if needed
  useEffect(() => {
    if (session && needsOnboarding === true) {
      router.replace("/(onboarding)/welcome");
    }
  }, [session, needsOnboarding]);

  // Show loader until session is ready and onboarding check is loaded
  if (isPending || !session || needsOnboarding === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  // If onboarding needed, show loader (redirect is happening)
  if (needsOnboarding) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return <HomeScreen />;
}

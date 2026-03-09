import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { Redirect, router } from "expo-router";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home/HomeScreen";

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

  
  if(needsOnboarding) return <Redirect href={"/(onboarding)/welcome"}/>
  // Show loader until session is ready and onboarding check is loaded
  if (isPending || !session) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }


  return <HomeScreen />;
}

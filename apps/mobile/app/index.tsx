import { ActivityIndicator, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home/HomeScreen";
import { posthog } from "../src/lib/posthog";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const needsOnboarding = useNeedsOnboarding();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e: unknown) => {
        Sentry.captureException(e);
      });
    }
  }, [session, isPending]);

  // Identify user in PostHog when session is available
  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id);
    }
  }, [session?.user?.id]);

  // Show loader until session is ready
  if ((isPending && !session) || needsOnboarding === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  // Only check onboarding after session is stable (undefined = still loading)
  if (needsOnboarding === true) return <Redirect href={"/(onboarding)/welcome"} />;


  return <HomeScreen />;
}

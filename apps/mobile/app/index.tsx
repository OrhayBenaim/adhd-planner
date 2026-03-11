import { ActivityIndicator, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";
import { authClient } from "../src/lib/authClient";
import { useNeedsOnboarding } from "../src/hooks/usePreferences";
import { HomeScreen } from "../src/components/home/HomeScreen";
import { posthog } from "../src/lib/posthog";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();
  const { isLoading: isConvexLoading, isAuthenticated } = useConvexAuth();
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

  // Show loader until both better-auth session AND Convex auth are ready.
  // This prevents auth-requiring queries from running during session transitions
  // (sign-out, account linking) when the Convex JWT is briefly invalid.
  if (isPending || isConvexLoading || !isAuthenticated || needsOnboarding === undefined) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  if (needsOnboarding === true) return <Redirect href={"/(onboarding)/welcome"} />;

  return <HomeScreen />;
}

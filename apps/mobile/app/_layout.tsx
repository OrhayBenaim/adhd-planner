import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { ConvexReactClient } from "convex/react";
import { authClient } from "../src/lib/authClient";
import * as Sentry from "@sentry/react-native";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "../src/lib/posthog";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN!,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  enabled: !__DEV__,
});

export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fa" }}>
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <ConvexBetterAuthProvider  client={convex} authClient={authClient} >
        <PostHogProvider client={posthog}>
          <Stack screenOptions={{ headerShown: false }} />
        </PostHogProvider>
      </ConvexBetterAuthProvider >
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

import "../global.css";
import { ConvexProviderWithAuth } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { convex, useConvexAuth } from "../src/lib/convexClient";

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProviderWithAuth>
    </GestureHandlerRootView>
  );
}

import "../global.css";
import { useEffect } from "react";
import { ConvexProviderWithAuth } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { convex, useConvexAuth } from "../src/lib/convexClient";
import { authClient } from "../src/lib/authClient";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch(console.error);
    }
  }, [session, isPending]);

  return (
    <GestureHandlerRootView className="flex-1">
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProviderWithAuth>
    </GestureHandlerRootView>
  );
}

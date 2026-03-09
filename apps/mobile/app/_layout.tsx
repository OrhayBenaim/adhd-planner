import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { ConvexReactClient } from "convex/react";
import { authClient } from "../src/lib/authClient";


export const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

export default function RootLayout() {
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
      <ConvexBetterAuthProvider  client={convex} authClient={authClient} >
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexBetterAuthProvider >
    </GestureHandlerRootView>
  );
}

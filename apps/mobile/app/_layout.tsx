import "../global.css";
import { ConvexProviderWithAuth } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { convex, useConvexAuth } from "../src/lib/convexClient";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";

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
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProviderWithAuth>
    </GestureHandlerRootView>
  );
}

// apps/mobile/src/components/home/HomeScreen.tsx
import { useEffect } from "react";
import { View } from "react-native";
import { MainContent } from "./MainContent";
import { HomeBackHandler } from "./HomeBackHandler";
import { usePushToken } from "../../hooks/usePushToken";
import { track } from "../../lib/analytics";

/** Today. Providers and the sheet stack live in app/(app)/_layout.tsx. */
export function HomeScreen() {
  usePushToken();

  useEffect(() => {
    track("Home page loaded");
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <HomeBackHandler />
      <MainContent />
    </View>
  );
}

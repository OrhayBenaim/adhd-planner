// apps/mobile/src/components/home/HomeScreen.tsx
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetFlowProvider } from "./SheetFlowProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";
import { usePushToken } from "../../hooks/usePushToken";
import { posthog } from "../../lib/posthog";

export function HomeScreen() {
  usePushToken();

  useEffect(() => {
    posthog.capture("Home page loaded");
  }, []);
  return (
    <HomeProvider>
      <SheetFlowProvider>
        <SafeAreaView className="flex-1 bg-[#f5f7fa]">
          <MainContent />
          <SheetManager />
        </SafeAreaView>
      </SheetFlowProvider>
    </HomeProvider>
  );
}

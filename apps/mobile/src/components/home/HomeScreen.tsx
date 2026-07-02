// apps/mobile/src/components/home/HomeScreen.tsx
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetFlowProvider } from "./SheetFlowProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";
import { usePushToken } from "../../hooks/usePushToken";
import { posthog } from "../../lib/posthog";
import { GuidedTourProvider } from "../tour/GuidedTourProvider";
import { useHasCompletedTour } from "../../hooks/usePreferences";

export function HomeScreen() {
  usePushToken();
  const hasCompletedTour = useHasCompletedTour();

  useEffect(() => {
    posthog.capture("Home page loaded");
  }, []);
  return (
    <HomeProvider>
      <SheetFlowProvider>
        <GuidedTourProvider enabled={!hasCompletedTour}>
          <SafeAreaView className="flex-1 bg-[#f5f7fa]">
            <MainContent />
            <SheetManager />
          </SafeAreaView>
        </GuidedTourProvider>
      </SheetFlowProvider>
    </HomeProvider>
  );
}

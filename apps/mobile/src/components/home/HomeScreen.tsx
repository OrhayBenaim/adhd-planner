// apps/mobile/src/components/home/HomeScreen.tsx
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetNavProvider } from "./SheetNavProvider";
import { TaskCreationFlowProvider } from "./TaskCreationFlowProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";
import { usePushToken } from "../../hooks/usePushToken";
import { track } from "../../lib/analytics";
import { GuidedTourProvider } from "../tour/GuidedTourProvider";
import { useHasCompletedTour } from "../../hooks/usePreferences";

export function HomeScreen() {
  usePushToken();
  const hasCompletedTour = useHasCompletedTour();

  useEffect(() => {
    track("Home page loaded");
  }, []);
  return (
    <HomeProvider>
      <SheetNavProvider>
        <TaskCreationFlowProvider>
          <GuidedTourProvider enabled={!hasCompletedTour}>
            <SafeAreaView className="flex-1 bg-[#f5f7fa]">
              <MainContent />
              <SheetManager />
            </SafeAreaView>
          </GuidedTourProvider>
        </TaskCreationFlowProvider>
      </SheetNavProvider>
    </HomeProvider>
  );
}

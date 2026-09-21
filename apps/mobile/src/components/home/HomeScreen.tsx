// apps/mobile/src/components/home/HomeScreen.tsx
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetNavProvider } from "./SheetNavProvider";
import { TaskCreationFlowProvider } from "./TaskCreationFlowProvider";
import { MainContent } from "./MainContent";
import { HomeBackHandler } from "./HomeBackHandler";
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
            <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: "#d6f1fe" }}>
              <StatusBar style="dark" />
              <HomeBackHandler />
              <MainContent />
              <SheetManager />
            </SafeAreaView>
          </GuidedTourProvider>
        </TaskCreationFlowProvider>
      </SheetNavProvider>
    </HomeProvider>
  );
}

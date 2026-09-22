// apps/mobile/app/(app)/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingScreen } from "../../src/components/LoadingScreen";
import { HomeProvider } from "../../src/components/home/HomeProvider";
import { SheetManager } from "../../src/components/home/SheetManager";
import { SheetNavProvider } from "../../src/components/home/SheetNavProvider";
import { TaskCreationFlowProvider } from "../../src/components/home/TaskCreationFlowProvider";
import { GuidedTourProvider } from "../../src/components/tour/GuidedTourProvider";
import { useAuthBootstrap } from "../../src/hooks/useAuthBootstrap";
import { useHasCompletedTour } from "../../src/hooks/usePreferences";

/**
 * The signed-in app: Today and My plan are sibling routes that share one set of
 * providers, so task data, the sheet stack and the guided tour survive
 * navigation between them.
 */
export default function AppLayout() {
  const { status, recoveryHref } = useAuthBootstrap();
  const hasCompletedTour = useHasCompletedTour();

  if (status === "loading") return <LoadingScreen />;
  if (status === "recovery") return <Redirect href={recoveryHref} />;
  if (status === "onboarding") return <Redirect href={"/(onboarding)/welcome"} />;

  return (
    <HomeProvider>
      <SheetNavProvider>
        <TaskCreationFlowProvider>
          <GuidedTourProvider enabled={!hasCompletedTour}>
            <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: "#d6f1fe" }}>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "white" } }}>
                <Stack.Screen name="settings/index"
                  options={{ presentation: "transparentModal", animation: "none",
                    contentStyle: { backgroundColor: "transparent" } }} />
              </Stack>
              <SheetManager />
            </SafeAreaView>
          </GuidedTourProvider>
        </TaskCreationFlowProvider>
      </SheetNavProvider>
    </HomeProvider>
  );
}

import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { LoadingScreen } from "../../src/components/LoadingScreen";
import { OnboardingProvider } from "../../src/components/onboarding/OnboardingProvider";

export default function OnboardingLayout() {
  const [loaded, error] = useFonts({
    "Nunito-ExtraBold": require("../../assets/fonts/Nunito-ExtraBold.ttf"),
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
  });
  if (!loaded && !error) return <LoadingScreen />;
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
          animationDuration: 250,
        }}
      />
    </OnboardingProvider>
  );
}

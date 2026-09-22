import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeStyles } from "../home/theme";
import { TOUR_SCRIM_COLOR } from "./TourSpotlight";
import { track } from "../../lib/analytics";

export function TourCelebration({ onFinish }: { onFinish: () => void }) {
  useEffect(() => { track("onboarding_celebration_viewed"); }, []);
  return <View accessibilityViewIsModal style={{ position: "absolute", inset: 0, zIndex: 900, justifyContent: "center", backgroundColor: TOUR_SCRIM_COLOR }}>
    <View style={{ marginHorizontal: 24, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 26, backgroundColor: "white", gap: 14 }}>
      <Image source={require("../../../assets/home/tour-celebration.png")} resizeMode="contain" style={{ width: 140, height: 140, alignSelf: "center" }} />
      <Text style={[homeStyles.heading, { fontSize: 32, lineHeight: 41, textAlign: "center" }]}>You did it!</Text>
      <Text style={[homeStyles.body, { fontSize: 15, lineHeight: 19, textAlign: "center" }]}>That's the whole loop. Add tasks, match your mood, and get things done.</Text>
      <OnboardingButton label="Let's start!" onPress={onFinish} />
    </View>
  </View>;
}

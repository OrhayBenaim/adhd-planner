import { Image, Text, View } from "react-native";
import { OnboardingButton } from "../onboarding/OnboardingButton";
import { homeStyles } from "../home/theme";
import { TOUR_STEPS } from "./constants";

export function TourIntroCard({ onStart }: { onStart: () => void; onSkip?: () => void }) {
  return <View style={{ marginHorizontal: 24, paddingHorizontal: 22, paddingVertical: 26, borderRadius: 28, backgroundColor: "white", gap: 14 }}>
    <Image source={require("../../../assets/mascot/dog-floating.png")} resizeMode="contain" style={{ width: 160, height: 100, alignSelf: "center", transform: [{ scaleX: -1 }] }} />
    <Text style={[homeStyles.heading, { fontSize: 26, lineHeight: 34, textAlign: "center" }]}>{TOUR_STEPS[0].title}</Text>
    <Text style={[homeStyles.body, { fontSize: 15, lineHeight: 19, textAlign: "center" }]}>{TOUR_STEPS[0].description}</Text>
    <OnboardingButton label="Let's go" onPress={onStart} />
  </View>;
}

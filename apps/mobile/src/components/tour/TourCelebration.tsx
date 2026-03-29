import { View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn } from "react-native-reanimated";
import { TourTooltip } from "./TourTooltip";

interface Props {
  onFinish: () => void;
}

export function TourCelebration({ onFinish }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="absolute inset-0 z-[900] items-center justify-center"
    >
      <BlurView
        intensity={50}
        tint="light"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <TourTooltip
        title="You're ready!"
        description="That's the core loop. Add tasks, match your mood, and get things done."
        secondaryText="Pro members also get AI coaching, streak tracking, and personalized reminders."
        buttonLabel="Let's start!"
        onPress={onFinish}
      />
    </Animated.View>
  );
}

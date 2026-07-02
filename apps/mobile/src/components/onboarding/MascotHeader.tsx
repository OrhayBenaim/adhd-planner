import { View, Text } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Mascot, type MascotPose } from "../mascot/Mascot";

interface Props {
  pose?: MascotPose;
  title: string;
  subtitle?: string;
  mascotSize?: number;
}

/** Mascot with a speech bubble — shared header for onboarding steps. */
export function MascotHeader({ pose = "wave", title, subtitle, mascotSize = 150 }: Props) {
  return (
    <View className="items-center w-full">
      <Animated.View entering={FadeInUp.duration(400)}>
        <Mascot pose={pose} size={mascotSize} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)} className="items-center w-full mt-2">
        {/* Speech bubble tail */}
        <View
          className="w-4 h-4 bg-[#bde0fe]/20 rotate-45"
          style={{ marginBottom: -10, borderRadius: 3 }}
        />
        <View className="bg-[#bde0fe]/20 rounded-3xl px-6 py-5 w-full">
          <Text className="text-2xl font-bold text-[#0A0A0A] text-center">{title}</Text>
          {subtitle && (
            <Text className="text-base text-[#6A7282] text-center mt-2 leading-6">{subtitle}</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

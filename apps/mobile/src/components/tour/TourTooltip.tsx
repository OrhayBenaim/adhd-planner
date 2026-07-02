import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Mascot } from "../mascot/Mascot";

interface Props {
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  secondaryText?: string;
  showMascot?: boolean;
}

export function TourTooltip({
  title,
  description,
  buttonLabel,
  onPress,
  secondaryText,
  showMascot = true,
}: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="mx-6"
    >
      {showMascot && (
        <View className="z-10" style={{ marginBottom: -18, marginLeft: 8 }}>
          <Mascot pose="wave" size={92} />
        </View>
      )}
      <View
        className="bg-white rounded-3xl px-6 py-5"
        style={{ boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)" }}
      >
        <Text className="text-xl font-semibold text-[#0A0A0A] mb-2">{title}</Text>
        <Text className="text-base text-[#6A7282] leading-6">{description}</Text>
        {secondaryText && (
          <Text className="text-sm text-[#99a1af] mt-3 leading-5">{secondaryText}</Text>
        )}
        {buttonLabel && onPress && (
          <Pressable onPress={onPress} className="mt-4">
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 24, paddingVertical: 14, alignItems: "center" }}
            >
              <Text className="text-white font-semibold text-base">{buttonLabel}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

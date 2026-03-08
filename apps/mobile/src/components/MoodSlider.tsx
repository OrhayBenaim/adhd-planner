import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { getMoodLabel } from "../lib/moodLabels";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function MoodSlider({ value, onChange }: Props) {
  const label = getMoodLabel(value);

  return (
    <View className="w-full">
      {/* Cross-fading label */}
      <Animated.Text
        key={label}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="text-center text-lg font-medium text-[#364153] mb-3"
      >
        {label}
      </Animated.Text>

      {/* Gradient track with slider */}
      <View className="relative h-8 justify-center">
        <LinearGradient
          colors={["#a2d2ff", "#bde0fe", "#cdb4db", "#ffc8dd", "#ffafcc"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            height: 12,
            borderRadius: 9999,
          }}
        />
        <Slider
          style={{ width: "100%", height: 32 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#ffffff"
        />
      </View>
    </View>
  );
}

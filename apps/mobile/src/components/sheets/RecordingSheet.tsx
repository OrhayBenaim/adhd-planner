import { forwardRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

interface Props {
  onStop: (transcription: string) => void;
  onClose: () => void;
}

function WaveDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 + delay }),
        withTiming(0.3, { duration: 400 + delay })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[style, { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ffafcc", marginHorizontal: 3 }]}
    />
  );
}

export const RecordingSheet = forwardRef<BottomSheet, Props>(
  ({ onStop, onClose }, ref) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["45%"]}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
        handleIndicatorStyle={{ display: "none" }}
      >
        <BottomSheetView className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-[#1e2939]">Recording...</Text>
            <Pressable onPress={onClose}>
              <Text className="text-[#364153] text-lg">✕</Text>
            </Pressable>
          </View>

          {/* Waveform */}
          <View
            className="rounded-3xl overflow-hidden justify-center items-center"
            style={{ height: 64, backgroundColor: "rgba(162,210,255,0.2)" }}
          >
            <View className="flex-row items-center">
              {Array.from({ length: 20 }).map((_, i) => (
                <WaveDot key={i} delay={i * 40} />
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View className="flex-row items-center justify-end gap-4 mt-6">
            <Pressable
              onPress={() => onStop("")}
              className="w-16 h-16 rounded-full items-center justify-center bg-[#ffc8dd]"
            >
              <Text className="text-xl">✕</Text>
            </Pressable>
            <Pressable
              onPress={() => onStop("")}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: "#bde0fe" }}
            >
              <Text className="text-xl">✓</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

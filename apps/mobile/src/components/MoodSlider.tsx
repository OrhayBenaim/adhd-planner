import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { getMoodLabel } from "../lib/moodLabels";
import { useEffect, useRef, useState } from "react";

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 12;

function valueToThumbX(value: number, trackWidth: number): number {
  const max = trackWidth - THUMB_SIZE;
  return max > 0 ? (value / 100) * max : 0;
}

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function MoodSlider({ value, onChange }: Props) {
  const label = getMoodLabel(value);
  const [trackWidth, setTrackWidth] = useState(1);
  const isDraggingRef = useRef(false);

  const thumbX = useSharedValue(valueToThumbX(value, trackWidth));

  const notifyChange = (x: number) => {
    const pct = Math.min(Math.max(x / (trackWidth - THUMB_SIZE), 0), 1);
    onChange(Math.round(pct * 100));
  };

  const setDragging = (dragging: boolean) => {
    isDraggingRef.current = dragging;
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      scheduleOnRN(setDragging, true);
    })
    .onChange((e) => {
      const max = trackWidth - THUMB_SIZE;
      thumbX.value = clamp(thumbX.value + e.changeX, 0, max);
      scheduleOnRN(notifyChange, thumbX.value);
    })
    .onFinalize(() => {
      scheduleOnRN(setDragging, false);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const max = trackWidth - THUMB_SIZE;
    const x = clamp(e.x - THUMB_SIZE / 2, 0, max);
    thumbX.value = x;
    scheduleOnRN(notifyChange, x);
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  useEffect(() => {
    if (isDraggingRef.current) return;
    thumbX.value = valueToThumbX(value, trackWidth);
  }, [value, trackWidth, thumbX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackWidth(w);
    thumbX.value = valueToThumbX(value, w);
  };

  return (
    <View className="w-full">
      {/* Cross-fading mood label */}
      <Animated.Text
        key={label}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="text-center text-lg font-medium text-[#364153] mb-4"
      >
        {label}
      </Animated.Text>

      {/* Track + thumb */}
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View
          style={{ height: THUMB_SIZE + 8, justifyContent: "center" }}
          onLayout={handleLayout}
        >
          {/* Gradient track with shadow */}
          <View
            style={{
              position: "absolute",
              left: THUMB_SIZE / 2,
              right: THUMB_SIZE / 2,
              height: TRACK_HEIGHT,
              borderRadius: 9999,
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.12)",
            }}
          >
            <LinearGradient
              colors={["#a2d2ff", "#bde0fe", "#cdb4db", "#ffc8dd", "#ffafcc"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1, borderRadius: 9999 }}
            />
          </View>

          {/* Thumb */}
          <Animated.View
            style={[
              thumbStyle,
              {
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#ffffff",
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

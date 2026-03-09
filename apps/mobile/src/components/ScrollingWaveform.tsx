import { useEffect, useRef, useState, useCallback } from "react";
import { View } from "react-native";

const BAR_W = 3;
const BAR_GAP = 1.5;
const BAR_STEP = BAR_W + BAR_GAP;
const MIN_H = 4;
const MAX_H = 40;

interface Bar {
  id: number;
  v: number;
}

export function ScrollingWaveform({ volume }: { volume: number }) {
  const [bars, setBars] = useState<Bar[]>([]);
  const volumeRef = useRef(volume);
  const idRef = useRef(0);
  const maxBars = useRef(50);

  volumeRef.current = volume;

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      maxBars.current = Math.floor(e.nativeEvent.layout.width / BAR_STEP);
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const v = volumeRef.current;
      const value = v > 0.05 ? v : 0.15 + Math.random() * 0.2;
      const id = idRef.current++;
      setBars((prev) => {
        const next = [...prev, { id, v: value }];
        return next.length > maxBars.current
          ? next.slice(-maxBars.current)
          : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        overflow: "hidden",
        paddingHorizontal: 8,
      }}
      onLayout={onLayout}
    >
      {bars.map((bar) => (
        <View
          key={bar.id}
          style={{
            width: BAR_W,
            height: MIN_H + bar.v * (MAX_H - MIN_H),
            borderRadius: BAR_W / 2,
            backgroundColor: "#ffafcc",
            opacity: 0.7,
            marginHorizontal: BAR_GAP / 2,
          }}
        />
      ))}
    </View>
  );
}

import { View, Text, Pressable } from "react-native";

interface Segment {
  label: string;
  color: string;
}

interface Props {
  segments: Segment[];
  activeIndex: number;
  onPress: (index: number) => void;
}

export function SegmentedControl({ segments, activeIndex, onPress }: Props) {
  return (
    <View className="flex-row bg-[#f3f4f6] rounded-2xl p-1">
      {segments.map((seg, i) => {
        const isActive = i === activeIndex;
        return (
          <Pressable
            key={seg.label}
            onPress={() => onPress(i)}
            className="flex-1 py-2.5 rounded-xl items-center justify-center"
            style={isActive ? { backgroundColor: seg.color } : undefined}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isActive ? "#fff" : "#6a7282" }}
            >
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

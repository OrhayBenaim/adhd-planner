import { View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_BOUNCY } from "../animations/springs";

interface Props {
  onListPress: () => void;
  onAddPress: () => void;
  onSettingsPress: () => void;
}

function NavButton({
  onPress,
  children,
  gradient,
}: {
  onPress: () => void;
  children: React.ReactNode;
  gradient?: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, SPRING_BOUNCY); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
      >
        {gradient ? (
          <LinearGradient
            colors={["#a2d2ff", "#cdb4db"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 }}
          >
            {children}
          </LinearGradient>
        ) : (
          <View className="w-14 h-14 bg-white rounded-full items-center justify-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 6 }}>
            {children}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BottomNav({ onListPress, onAddPress, onSettingsPress }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[#f3f4f6] px-6 pt-6 pb-8">
      <View className="flex-row items-center justify-center gap-8">
        <NavButton onPress={onListPress}>
          <View className="w-6 h-6 items-center justify-center gap-1">
            <View className="w-5 h-0.5 bg-[#364153]" />
            <View className="w-5 h-0.5 bg-[#364153]" />
            <View className="w-5 h-0.5 bg-[#364153]" />
          </View>
        </NavButton>

        <NavButton onPress={onAddPress} gradient>
          <View className="w-7 h-7 items-center justify-center">
            <View className="absolute w-5 h-0.5 bg-white" />
            <View className="absolute w-0.5 h-5 bg-white" />
          </View>
        </NavButton>

        <NavButton onPress={onSettingsPress}>
          <Animated.Text className="text-[#364153] text-xl">⚙</Animated.Text>
        </NavButton>
      </View>
    </View>
  );
}

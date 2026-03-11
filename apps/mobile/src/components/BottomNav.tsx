import { View } from "react-native";
import { AppPressable as Pressable } from "./AppPressable";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SPRING_BOUNCY } from "../animations/springs";

interface Props {
  onListPress: () => void;
  onPreferencesPress: () => void;
  onAddPress: () => void;
  onSettingsPress: () => void;
  onProfilePress: () => void;
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
          <View style={{ width: 64, height: 64, borderRadius: 32, boxShadow: "0px 10px 15px rgba(0, 0, 0, 0.1)" }}>
            <LinearGradient
              colors={["#a2d2ff", "#cdb4db"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }}
            >
              {children}
            </LinearGradient>
          </View>
        ) : (
          <View className="w-14 h-14 bg-white rounded-full items-center justify-center" style={{ boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)" }}>
            {children}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BottomNav({ onListPress, onPreferencesPress, onAddPress, onSettingsPress, onProfilePress }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[#f3f4f6] px-6 pt-6 pb-8">
      <View className="flex-row items-center justify-center gap-6">
        <NavButton onPress={onListPress}>
          <Ionicons name="list-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onPreferencesPress}>
          <Ionicons name="color-palette-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onAddPress} gradient>
          <Ionicons name="add" size={28} color="#fff" />
        </NavButton>

        <NavButton onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onProfilePress}>
          <Ionicons name="person-outline" size={24} color="#364153" />
        </NavButton>
      </View>
    </View>
  );
}

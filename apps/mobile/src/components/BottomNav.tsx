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
          <View style={{ width: 64, height: 64, borderRadius: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 }}>
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
          <View className="w-14 h-14 bg-white rounded-full items-center justify-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 }}>
            {children}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function BottomNav({ onListPress, onAddPress, onSettingsPress, onProfilePress }: Props) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[#f3f4f6] px-6 pt-6 pb-8">
      <View className="flex-row items-center justify-center gap-10">
        <NavButton onPress={onListPress}>
          <Ionicons name="list-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onAddPress} gradient>
          <Ionicons name="add" size={28} color="#fff" />
        </NavButton>

        <NavButton onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={24} color="#364153" />
        </NavButton>

        <NavButton onPress={onProfilePress}>
          <Ionicons name="person-circle-outline" size={24} color="#364153" />
        </NavButton>
      </View>
    </View>
  );
}

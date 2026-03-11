import { View, Text } from "react-native";
import { AppPressable as Pressable } from "../../AppPressable";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";

interface AnonymousProfileProps {
  userName: string;
  editName: string;
  onEditNameChange: (text: string) => void;
  onLinkPress: () => void;
  onSignInPress: () => void;
}

export function AnonymousProfile({
  userName,
  editName,
  onEditNameChange,
  onLinkPress,
  onSignInPress,
}: AnonymousProfileProps) {
  return (
    <View>
      {/* Avatar + Name */}
      <View className="items-center mb-4">
        <View className="w-20 h-20 rounded-full bg-[#bde0fe] items-center justify-center mb-3">
          <Text className="text-2xl font-semibold text-white">
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <BottomSheetTextInput
          value={editName}
          onChangeText={onEditNameChange}
          placeholder="Your name"
          placeholderTextColor="#9ca3af"
          maxLength={100}
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: "#1e2939",
            textAlign: "center",
            minWidth: 120,
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        />
      </View>

      {/* Benefit message */}
      <View className="bg-[#f5f7fa] rounded-3xl p-4 mb-6">
        <Text className="text-sm text-[#4a5565] text-center">
          Link an account to keep your data safe across devices and never lose
          your progress
        </Text>
      </View>

      {/* Link Account button */}
      <LinearGradient
        colors={["#a2d2ff", "#cdb4db"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ height: 52, borderRadius: 9999, marginBottom: 12 }}
      >
        <Pressable
          onPress={onLinkPress}
          className="flex-1 items-center justify-center"
        >
          <Text className="text-white font-semibold text-base">
            Link Account
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Sign In link */}
      <View className="items-center">
        <Pressable onPress={onSignInPress}>
          <Text className="text-base font-medium text-[#a2d2ff]">
            Already have an account? Sign in
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

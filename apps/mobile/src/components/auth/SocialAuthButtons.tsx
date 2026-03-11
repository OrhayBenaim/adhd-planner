import { View, Text, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface SocialAuthButtonsProps {
  onSocial: (provider: "google" | "apple") => void;
  onEmail: () => void;
  busy: boolean;
}

export function SocialAuthButtons({
  onSocial,
  onEmail,
  busy,
}: SocialAuthButtonsProps) {
  return (
    <View style={{ gap: 12 }}>
      {Platform.OS === "android" && (
        <Pressable
          onPress={() => onSocial("google")}
          disabled={busy}
          className="flex-row items-center bg-white"
          style={{
            gap: 12,
            paddingHorizontal: 18,
            paddingVertical: 16,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#e5e7eb",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Ionicons name="logo-google" size={24} color="#4285F4" />
          <Text className="text-base font-medium text-[#364153]">
            {busy ? "Please wait..." : "Continue with Google"}
          </Text>
        </Pressable>
      )}
      {Platform.OS === "ios" && (
        <Pressable
          onPress={() => onSocial("apple")}
          disabled={busy}
          className="flex-row items-center bg-white"
          style={{
            gap: 12,
            paddingHorizontal: 18,
            paddingVertical: 16,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "#e5e7eb",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Ionicons name="logo-apple" size={24} color="#000" />
          <Text className="text-base font-medium text-[#364153]">
            {busy ? "Please wait..." : "Continue with Apple"}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={onEmail}
        disabled={busy}
        className="flex-row items-center bg-white"
        style={{
          gap: 12,
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: "#e5e7eb",
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Ionicons name="mail-outline" size={24} color="#6a7282" />
        <Text className="text-base font-medium text-[#364153]">
          Continue with Email
        </Text>
      </Pressable>
    </View>
  );
}

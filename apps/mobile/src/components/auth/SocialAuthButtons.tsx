import { View, Text, Platform } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { Ionicons } from "@expo/vector-icons";

interface SocialAuthButtonsProps {
  onSocial: (provider: "google" | "apple") => void;
  onEmail: () => void;
  busy: boolean;
  labelPrefix?: string;
  showShadow?: boolean;
}

export function SocialAuthButtons({
  onSocial,
  onEmail,
  busy,
  labelPrefix = "Continue with",
  showShadow = false,
}: SocialAuthButtonsProps) {
  const shadowStyle = showShadow
    ? { boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)" as any }
    : {};

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
            ...shadowStyle,
          }}
        >
          <Ionicons name="logo-google" size={24} color="#4285F4" />
          <Text className="text-base font-medium text-[#364153]">
            {busy ? "Please wait..." : `${labelPrefix} Google`}
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
            ...shadowStyle,
          }}
        >
          <Ionicons name="logo-apple" size={24} color="#000" />
          <Text className="text-base font-medium text-[#364153]">
            {busy ? "Please wait..." : `${labelPrefix} Apple`}
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
          ...shadowStyle,
        }}
      >
        <Ionicons name="mail-outline" size={24} color="#6a7282" />
        <Text className="text-base font-medium text-[#364153]">
          {`${labelPrefix} Email`}
        </Text>
      </Pressable>
    </View>
  );
}

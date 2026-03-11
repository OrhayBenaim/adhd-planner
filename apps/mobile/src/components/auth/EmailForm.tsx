import { View, Text, TextInput, type TextInputProps } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentType } from "react";

interface EmailFormProps {
  email: string;
  onEmailChange: (text: string) => void;
  password: string;
  onPasswordChange: (text: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  InputComponent?: ComponentType<TextInputProps>;
}

export function EmailForm({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSubmit,
  submitLabel,
  busy,
  InputComponent = TextInput,
}: EmailFormProps) {
  const Input = InputComponent;
  return (
    <View>
      <View style={{ gap: 12 }}>
        <Input
          value={email}
          onChangeText={onEmailChange}
          placeholder="Email"
          placeholderTextColor="#99a1af"
          className="border border-[#e5e7eb] rounded-3xl px-5 py-4 text-base text-[#1e2939]"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Password"
          placeholderTextColor="#99a1af"
          className="border border-[#e5e7eb] rounded-3xl px-5 py-4 text-base text-[#1e2939]"
          secureTextEntry
        />
      </View>
      <LinearGradient
        colors={["#a2d2ff", "#cdb4db"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          height: 52,
          borderRadius: 9999,
          marginTop: 20,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="flex-1 items-center justify-center"
        >
          <Text className="text-white font-semibold text-base">
            {busy ? "Please wait..." : submitLabel}
          </Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

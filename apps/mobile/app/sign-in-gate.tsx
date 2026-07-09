import { useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { AppPressable as Pressable } from "../src/components/AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthFlow, type AuthFlowMode } from "../src/components/auth/AuthFlow";

type ReturnTo = "home" | "paywall";

export default function SignInGateScreen() {
  const { offering, mode, reason, returnTo } = useLocalSearchParams<{
    offering?: string;
    mode?: AuthFlowMode;
    reason?: "session";
    returnTo?: ReturnTo;
  }>();
  const authMode: AuthFlowMode = mode === "signIn" ? "signIn" : "link";

  const handleAuthSuccess = useCallback(() => {
    // Delay navigation to let auth state re-renders settle before replacing the screen.
    // Immediate replace causes a Fabric "child already has a parent" crash on Android.
    setTimeout(() => {
      if (returnTo === "home" && !offering) {
        router.replace("/" as any);
        return;
      }

      const params = offering ? `?offering=${offering}` : "";
      router.replace(`/paywall${params}` as any);
    }, 500);
  }, [offering, returnTo]);

  const isSessionRecovery = reason === "session";
  const title = isSessionRecovery ? "Welcome back" : "Sign in to unlock";
  const subtitle = isSessionRecovery
    ? "Your session needs to be refreshed. Sign in again to continue."
    : "Create an account or sign in to access Pro features and make purchases";

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Close button */}
        <View className="flex-row justify-end pt-14">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#364153" />
          </Pressable>
        </View>

        {/* Header */}
        <View className="items-center pt-6 pb-8">
          <View className="w-16 h-16 rounded-full bg-[#a2d2ff] items-center justify-center mb-4">
            <Ionicons name="lock-open-outline" size={32} color="#fff" />
          </View>
          <Text className="text-2xl font-semibold text-[#1e2939] text-center mb-2">
            {title}
          </Text>
          <Text className="text-sm text-[#6a7282] text-center px-6">
            {subtitle}
          </Text>
        </View>

        {/* Auth flow */}
        <View className="px-2">
          <AuthFlow
            mode={authMode}
            onSuccess={handleAuthSuccess}
            presentation={{
              usernameBack: "gate-link",
              usernameSignUpTitle: "Create your account",
              usernameSignUpSubtitle: "Sign up to unlock Pro features",
              usernameSignInTitle: "Welcome back",
              usernameSignInSubtitle: "Sign in to your existing account",
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

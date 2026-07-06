import { useState, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { AppPressable as Pressable } from "../src/components/AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthOptions } from "../src/components/auth/AuthOptions";
import { SignUpWithUsername } from "../src/components/auth/SignUpWithUsername";
import { SignInWithUsername } from "../src/components/auth/SignInWithUsername";
import type { AuthOptionsMode } from "../src/components/auth/AuthOptions";

type GateView = "options" | "signUp" | "signIn";
type ReturnTo = "home" | "paywall";

export default function SignInGateScreen() {
  const { offering, mode, reason, returnTo } = useLocalSearchParams<{
    offering?: string;
    mode?: AuthOptionsMode;
    reason?: "session";
    returnTo?: ReturnTo;
  }>();
  const authMode: AuthOptionsMode = mode === "signIn" ? "signIn" : "link";
  const [view, setView] = useState<GateView>("options");

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

        {/* Auth forms */}
        <View className="px-2">
          {view === "options" && (
            <AuthOptions
              mode={authMode}
              onSuccess={handleAuthSuccess}
              onUsernamePress={() => setView(authMode === "signIn" ? "signIn" : "signUp")}
            />
          )}
          {view === "signUp" && (
            <SignUpWithUsername
              onSuccess={handleAuthSuccess}
              title="Create your account"
              subtitle="Sign up to unlock Pro features"
              onSwitchToSignIn={() => setView("signIn")}
            />
          )}
          {view === "signIn" && (
            <SignInWithUsername
              onSuccess={handleAuthSuccess}
              title="Welcome back"
              subtitle="Sign in to your existing account"
              onSwitchToSignUp={() => setView("signUp")}
            />
          )}
        </View>

        {/* Back to options link when in username view */}
        {view !== "options" && (
          <View className="items-center mt-6">
            <Pressable onPress={() => setView("options")}>
              <Text className="text-sm text-[#6a7282]">
                Back to sign-in options
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

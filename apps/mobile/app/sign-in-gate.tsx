import { useCallback } from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppPressable as Pressable } from "../src/components/AppPressable";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AuthFlow, type AuthFlowMode } from "../src/components/auth/AuthFlow";
import { SocialAuthButtons } from "../src/components/auth/SocialAuthButtons";
import {
  onboardingColors as colors,
  onboardingStyles as styles,
} from "../src/components/onboarding/theme";

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
  const title = isSessionRecovery ? "Welcome back." : "Sign in to unlock.";
  const subtitle = isSessionRecovery
    ? "Your session needs refreshing. Sign in again to continue."
    : "Create an account or sign in to use Pro features and make purchases.";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "flex-end", paddingTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <AuthFlow
          style={{ flex: 1 }}
          mode={authMode}
          onSuccess={handleAuthSuccess}
          presentation={{
            hideOptionsHeader: true,
            usernameBack: "gate-link",
          }}
          renderHeader={({ view }) =>
            view === "options" ? (
              <View style={{ gap: 18 }}>
                <Text style={[styles.link, { fontSize: 13, color: colors.primary }]}>PRO ACCESS</Text>
                <Text accessibilityRole="header" style={[styles.heading, { fontSize: 34, lineHeight: 43 }]}>
                  {title}
                </Text>
                <Text style={[styles.body, { fontSize: 17, lineHeight: 21 }]}>{subtitle}</Text>
                <Image
                  source={require("../assets/onboarding/floating.png")}
                  resizeMode="contain"
                  style={[styles.artwork, { height: 200, transform: [{ scaleX: -1 }] }]}
                />
              </View>
            ) : null
          }
          renderOptions={({ onSocial, onUsername, busy }) => (
            <View style={{ flex: 1, justifyContent: "flex-end", paddingTop: 24 }}>
              <SocialAuthButtons onSocial={onSocial} onUsername={onUsername} busy={busy} />
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


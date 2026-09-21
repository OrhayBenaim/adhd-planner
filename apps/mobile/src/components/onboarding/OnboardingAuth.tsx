import { View, Text, Image, Pressable, Platform } from "react-native";
import { AuthFlow, type AuthFlowMode } from "../auth/AuthFlow";
import { OnboardingButton } from "./OnboardingButton";
import { onboardingColors as colors, onboardingStyles as styles } from "./theme";

export function OnboardingAuth({ mode, name, onBack, onSuccess, onBeforeAuth }: {
  mode: AuthFlowMode; name: string; onBack: () => void;
  onSuccess: () => void; onBeforeAuth?: () => Promise<void>;
}) {
  return <AuthFlow mode={mode} style={{ flex: 1 }} onSuccess={onSuccess} onBeforeAuth={onBeforeAuth}
    presentation={{ hideOptionsHeader: true, signUpName: name.trim(), usernameBack: "text" }}
    renderHeader={({ view }) => view === "options" ? <View style={{ gap: 18 }}>
      <Text style={[styles.link, { fontSize: 13, color: colors.primary }]}>YOUR ACCOUNT</Text>
      <Text accessibilityRole="header" style={[styles.heading, { fontSize: 34, lineHeight: 43 }]}>
        {mode === "link" ? "Keep your progress\nwith you." : "Welcome back."}
      </Text>
      <Text style={[styles.body, { fontSize: 17, lineHeight: 21 }]}>
        {mode === "link" ? "Choose how you’d like to create your account. Your preferences stay with you." : "Sign in to sync your saved tasks and progress."}
      </Text>
      <Image source={require("../../../assets/onboarding/floating.png")} resizeMode="contain"
        style={[styles.artwork, { transform: [{ scaleX: -1 }] }]} />
    </View> : null}
    renderOptions={({ onSocial, onUsername, busy }) => <View style={{ flex: 1, justifyContent: "flex-end", gap: 18, paddingTop: 24 }}>
      {Platform.OS === "android" && <OnboardingButton label={busy ? "Please wait..." : "Continue with Google"} disabled={busy} onPress={() => onSocial("google")} />}
      {Platform.OS === "ios" && <OnboardingButton label={busy ? "Please wait..." : "Continue with Apple"} disabled={busy} onPress={() => onSocial("apple")} />}
      <OnboardingButton secondary label="Continue with username" disabled={busy} onPress={onUsername} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.link}>Back</Text>
      </Pressable>
    </View>} />;
}

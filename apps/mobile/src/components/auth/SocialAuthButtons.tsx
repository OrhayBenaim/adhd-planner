import { View, Platform } from "react-native";
import { OnboardingButton } from "../onboarding/OnboardingButton";

interface SocialAuthButtonsProps {
  onSocial: (provider: "google" | "apple") => void;
  onUsername: () => void;
  busy: boolean;
  labelPrefix?: string;
}

export function SocialAuthButtons({
  onSocial,
  onUsername,
  busy,
  labelPrefix = "Continue with",
}: SocialAuthButtonsProps) {
  const provider = Platform.OS === "ios" ? ("apple" as const) : ("google" as const);
  const providerLabel = provider === "apple" ? "Apple" : "Google";

  return (
    <View style={{ gap: 18 }}>
      <OnboardingButton
        label={busy ? "Please wait..." : `${labelPrefix} ${providerLabel}`}
        disabled={busy}
        onPress={() => onSocial(provider)}
      />
      <OnboardingButton
        secondary
        label={`${labelPrefix} username`}
        disabled={busy}
        onPress={onUsername}
      />
    </View>
  );
}

import { View, Text } from "react-native";
import { useSocialAuth } from "../../hooks/useSocialAuth";
import { SocialAuthButtons } from "./SocialAuthButtons";

const COPY = {
  link: {
    title: "Link an account",
    subtitle: "Your tasks and progress will be preserved",
    errorTitle: "Link failed",
  },
  signIn: {
    title: "Sign in",
    subtitle: "Sign in to your existing account",
    errorTitle: "Sign-in failed",
  },
} as const;

export type AuthOptionsMode = keyof typeof COPY;

interface AuthOptionsProps {
  mode: AuthOptionsMode;
  onSuccess: () => void;
  onBeforeAuth?: () => Promise<void>;
  onUsernamePress: () => void;
}

/**
 * Social + username auth entry point, parameterized by mode
 * (linking an anonymous account vs signing in to an existing one).
 */
export function AuthOptions({ mode, onSuccess, onBeforeAuth, onUsernamePress }: AuthOptionsProps) {
  const copy = COPY[mode];
  const { busy, signIn } = useSocialAuth({
    errorTitle: copy.errorTitle,
    onBeforeAuth,
    onSuccess,
  });

  return (
    <View>
      <Text className="text-xl font-semibold text-[#1e2939] mb-2">{copy.title}</Text>
      <Text className="text-sm text-[#6a7282] mb-6">{copy.subtitle}</Text>
      <SocialAuthButtons onSocial={signIn} onUsername={onUsernamePress} busy={busy} />
    </View>
  );
}

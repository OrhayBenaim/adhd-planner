import {
  useState,
  useRef,
  useCallback,
  type ComponentType,
  type ReactNode,
} from "react";
import { View, Text, type TextInputProps, type StyleProp, type ViewStyle } from "react-native";
import { AppPressable as Pressable } from "../AppPressable";
import { onboardingColors as colors, onboardingStyles as styles } from "../onboarding/theme";
import { useSocialAuth } from "../../hooks/useSocialAuth";
import {
  initialAuthFlowState,
  transitionAuthFlow,
  type AuthFlowEvent,
  type AuthFlowMode,
  type AuthFlowView,
} from "../../lib/authFlow";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { SignInWithUsername } from "./SignInWithUsername";
import { SignUpWithUsername } from "./SignUpWithUsername";

const COPY = {
  link: {
    title: "Keep your progress with you.",
    subtitle: "Choose how you’d like to create your account.",
    errorTitle: "Link failed",
  },
  signIn: {
    title: "Welcome back.",
    subtitle: "Sign in to sync your saved tasks and progress.",
    errorTitle: "Sign-in failed",
  },
} as const;

export type { AuthFlowMode };

export interface AuthFlowPresentation {
  /** Hide title/subtitle above social buttons (parent provides its own header). */
  hideOptionsHeader?: boolean;
  socialLabelPrefix?: string;
  signUpName?: string;
  usernameSignInTitle?: string;
  usernameSignInSubtitle?: string;
  usernameSignUpTitle?: string;
  usernameSignUpSubtitle?: string;
  /** Back control below username form; omit when parent renders header back. */
  usernameBack?: "none" | "back" | "gate-link";
}

export interface AuthFlowProps {
  style?: StyleProp<ViewStyle>;
  renderOptions?: (props: { onSocial: (provider: "google" | "apple") => void; onUsername: () => void; busy: boolean }) => ReactNode;
  mode: AuthFlowMode;
  onSuccess: () => void | Promise<void>;
  onBeforeAuth?: () => Promise<void>;
  presentation?: AuthFlowPresentation;
  InputComponent?: ComponentType<TextInputProps>;
  /** Chrome above content (e.g. sheet header with context-aware back). */
  renderHeader?: (props: { view: AuthFlowView; onBack: () => void }) => ReactNode;
  /** Footer chrome (e.g. back to welcome / overlay main). */
  renderFooter?: (props: { view: AuthFlowView; onBack: () => void }) => ReactNode;
}

/**
 * Unified auth entry flow: social options, username sub-view, and back navigation.
 * Interprets the pure auth-flow state machine in src/lib/authFlow.ts.
 */
export function AuthFlow({
  style,
  renderOptions,
  mode,
  onSuccess,
  onBeforeAuth,
  presentation = {},
  InputComponent,
  renderHeader,
  renderFooter,
}: AuthFlowProps) {
  const [state, setState] = useState(() => initialAuthFlowState(mode));
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback(
    (event: AuthFlowEvent) => {
      const transition = transitionAuthFlow(stateRef.current, event);
      stateRef.current = transition.state;
      setState(transition.state);
      for (const effect of transition.effects) {
        if (effect.type === "onSuccess") {
          void onSuccess();
        }
      }
    },
    [onSuccess],
  );

  const authSucceededRef = useRef(false);

  const handleAuthSuccess = useCallback(async () => {
    authSucceededRef.current = true;
    apply({ type: "AUTH_SUCCEEDED" });
  }, [apply]);

  const copy = COPY[mode];
  const { busy: socialBusy, signIn } = useSocialAuth({
    errorTitle: copy.errorTitle,
    onBeforeAuth,
    onSuccess: handleAuthSuccess,
  });

  const handleSocialSignIn = useCallback(
    async (provider: "google" | "apple") => {
      authSucceededRef.current = false;
      apply({ type: "AUTH_STARTED" });
      await signIn(provider);
      if (!authSucceededRef.current) {
        apply({ type: "AUTH_FAILED" });
      }
    },
    [apply, signIn],
  );

  const handleUsernameSuccess = useCallback(() => {
    apply({ type: "AUTH_SUCCEEDED" });
  }, [apply]);

  const handleBack = useCallback(() => {
    apply({ type: "GO_BACK" });
  }, [apply]);

  const socialBusyOrMachine = state.status === "busy" || socialBusy;
  const {
    hideOptionsHeader = false,
    socialLabelPrefix,
    signUpName,
    usernameSignInTitle,
    usernameSignInSubtitle,
    usernameSignUpTitle,
    usernameSignUpSubtitle,
    usernameBack = "none",
  } = presentation;

  const usernameBackControl =
    state.view === "username" && usernameBack !== "none" ? (
      <UsernameBackButton variant={usernameBack} onPress={handleBack} />
    ) : null;

  return (
    <View style={style}>
      {renderHeader?.({ view: state.view, onBack: handleBack })}

      {state.view === "options" && (renderOptions ? renderOptions({
        onSocial: handleSocialSignIn,
        onUsername: () => apply({ type: "CHOOSE_USERNAME" }),
        busy: socialBusyOrMachine,
      }) : (
        <View style={{ gap: 18 }}>
          {!hideOptionsHeader && (
            <>
              <Text style={[styles.link, { fontSize: 13, color: colors.primary }]}>YOUR ACCOUNT</Text>
              <Text accessibilityRole="header" style={[styles.heading, { fontSize: 34, lineHeight: 43 }]}>
                {copy.title}
              </Text>
              <Text style={[styles.body, { fontSize: 17, lineHeight: 21 }]}>{copy.subtitle}</Text>
            </>
          )}
          <SocialAuthButtons
            onSocial={handleSocialSignIn}
            onUsername={() => apply({ type: "CHOOSE_USERNAME" })}
            busy={socialBusyOrMachine}
            labelPrefix={socialLabelPrefix}
          />
        </View>
      ))}

      {state.view === "username" && state.usernameView === "signIn" && (
        <SignInWithUsername
          onSuccess={handleUsernameSuccess}
          onBeforeAuth={onBeforeAuth}
          onSwitchToSignUp={
            state.mode === "link"
              ? () => apply({ type: "SWITCH_USERNAME_VIEW", view: "signUp" })
              : undefined
          }
          InputComponent={InputComponent}
          title={usernameSignInTitle}
          subtitle={usernameSignInSubtitle}
        />
      )}

      {state.view === "username" && state.usernameView === "signUp" && (
        <SignUpWithUsername
          onSuccess={handleUsernameSuccess}
          onBeforeAuth={onBeforeAuth}
          name={signUpName}
          onSwitchToSignIn={() => apply({ type: "SWITCH_USERNAME_VIEW", view: "signIn" })}
          InputComponent={InputComponent}
          title={usernameSignUpTitle}
          subtitle={usernameSignUpSubtitle}
        />
      )}

      {usernameBackControl}
      {renderFooter?.({ view: state.view, onBack: handleBack })}
    </View>
  );
}

function UsernameBackButton({
  variant,
  onPress,
}: {
  variant: Exclude<AuthFlowPresentation["usernameBack"], "none" | undefined>;
  onPress: () => void;
}) {
  const label = variant === "gate-link" ? "Back to sign-in options" : "Back";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center", marginTop: 18 }}
    >
      <Text style={[styles.link, { textAlign: "center" }]}>{label}</Text>
    </Pressable>
  );
}

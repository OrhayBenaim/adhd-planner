import { Fragment, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Application from "expo-application";
import * as Haptics from "expo-haptics";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_TOPICS,
  hasRealEmail,
  isValidEmail,
  type ContactTopic,
} from "@adhd-planner/types";
import { AppPressable } from "../../../src/components/AppPressable";
import { inputStyle } from "../../../src/components/auth/UsernameForm";
import { OnboardingButton } from "../../../src/components/onboarding/OnboardingButton";
import { onboardingStyles } from "../../../src/components/onboarding/theme";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { settingsColors as colors, settingsStyles as styles } from "../../../src/components/settings/theme";
import { authClient } from "../../../src/lib/authClient";
import { canSendContact, contactSendError } from "../../../src/lib/contactForm";
import { useSoundEnabled } from "../../../src/lib/soundStore";
import { CONFIRM_DELAY_MS, confirmEnter, errorLineEnter, formExit, topicMenuMotion } from "../../../src/components/settings/contactMotion";

const OS = `${Platform.OS} ${Platform.Version}`;
const APP_VERSION = `${Application.nativeApplicationVersion ?? "unknown"} (${Application.nativeBuildVersion ?? "?"})`;

export default function ContactRoute() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const sendMessage = useMutation(api.contactMessages.send);
  // Wait for the session, or the Email field would flash for accounts that have a real email.
  const needsEmail = !sessionPending && !hasRealEmail(session?.user);
  const reduced = useReducedMotion();
  // Settings groups vibration with sound ("Sound & haptics"), as in NextStepSlot.
  const soundEnabled = useSoundEnabled();

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [topic, setTopic] = useState<ContactTopic | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topicY, setTopicY] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    Keyboard.dismiss();
    setError(null);
    setSending(true);
    try {
      await sendMessage({ topic: topic!, message, email: needsEmail ? email.trim() : undefined,
        os: OS, appVersion: APP_VERSION });
      setSent(true);
      // On the frame the confirmation starts to appear.
      if (soundEnabled) setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}), CONFIRM_DELAY_MS);
    } catch (e) {
      setError(contactSendError(e));
      if (soundEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SettingsPage parent="Support" centered>
        <Animated.View key="sent" entering={confirmEnter(reduced)} style={{ gap: 24 }}>
          <View style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={[styles.title, { textAlign: "center" }]}>Thanks for reaching out</Text>
            <Text style={[styles.explanation, { textAlign: "center" }]}>
              We&apos;ve got your message. If we need anything else, we&apos;ll get back to you.
            </Text>
          </View>
          <OnboardingButton label="OK" onPress={() => router.back()} />
        </Animated.View>
      </SettingsPage>
    );
  }

  const emailError = needsEmail && emailTouched && !isValidEmail(email);
  const topicLabel = CONTACT_TOPICS.find((t) => t.value === topic)?.label;

  return (
    <SettingsPage parent="Support" dismiss={menuOpen ? () => setMenuOpen(false) : undefined}>
      {/* Title, explanation and note live here, not in SettingsPage props, so they fade out with the form. */}
      <Animated.View key="form" exiting={formExit} style={{ gap: 24 }}>
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={styles.title}>Contact us</Text>
          <Text style={styles.explanation}>
            Stuck, spotted a bug, or have an idea? Tell us. A real person reads every message.
          </Text>
        </View>
        <View style={{ gap: 24 }}>
          <View style={{ gap: 16 }}>
            {needsEmail && (
              <View style={{ gap: 8 }}>
                <Text style={styles.sectionTitle}>Email</Text>
                <TextInput value={email} onChangeText={setEmail} onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com" placeholderTextColor={colors.muted} accessibilityLabel="Email"
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  autoComplete="email" textContentType="emailAddress" maxLength={CONTACT_EMAIL_MAX_LENGTH}
                  style={[inputStyle, { borderColor: emailError ? colors.danger : colors.border }]} />
                {emailError
                  ? <Animated.Text key="email-error" entering={errorLineEnter} style={[styles.caption, { color: colors.danger }]}>
                      Enter a valid email address.
                    </Animated.Text>
                  : <Text key="email-hint" style={styles.caption}>We&apos;ll reply to this address.</Text>}
              </View>
            )}

            <View style={{ gap: 8 }} onLayout={(e) => setTopicY(e.nativeEvent.layout.y)}>
              <Text style={styles.sectionTitle}>Topic</Text>
              <AppPressable accessibilityRole="button" accessibilityLabel={`Topic, ${topicLabel ?? "Choose a topic"}`}
                accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(true)}
                style={[inputStyle, { flexDirection: "row", alignItems: "center", gap: 8,
                  borderColor: menuOpen ? colors.primary : colors.border }]}>
                <Text style={{ flex: 1, fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 22,
                  color: topicLabel ? colors.ink : colors.muted }}>{topicLabel ?? "Choose a topic"}</Text>
                <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.ink} />
              </AppPressable>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>Message</Text>
              <TextInput value={message} onChangeText={setMessage} multiline maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                placeholder="What's going on? The more detail you share, the easier it is to help."
                placeholderTextColor={colors.muted} accessibilityLabel="Message" textAlignVertical="top"
                style={[inputStyle, { height: 180, paddingVertical: 16, lineHeight: 22 }]} />
            </View>

            {error ? <Animated.Text entering={errorLineEnter} style={[onboardingStyles.link, { color: colors.danger }]}>{error}</Animated.Text> : null}
          </View>

          <OnboardingButton label="Send message" onPress={handleSend} loading={sending}
            disabled={sessionPending || !canSendContact({ topic, message, email, needsEmail })} />

          {menuOpen && (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Close topic menu"
                onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFill} />
              {/* Floats 6px under the 80px Topic field, over Message. */}
              <Animated.View {...topicMenuMotion(reduced)} style={{ position: "absolute", left: 0, right: 0,
                top: topicY + 86, borderRadius: 20, transformOrigin: "top",
                backgroundColor: colors.white, boxShadow: "0px 8px 24px rgba(81, 11, 49, 0.14)" }}>
                {/* Claims taps on its padding and dividers, so they don't bubble up to the page's dismiss. */}
                <View onStartShouldSetResponder={() => true} style={{ borderRadius: 20, overflow: "hidden", paddingVertical: 4 }}>
                  {CONTACT_TOPICS.map((t, i) => {
                    const selected = t.value === topic;
                    return (
                      <Fragment key={t.value}>
                        {i > 0 && <View style={styles.divider} />}
                        <AppPressable accessibilityRole="button" accessibilityLabel={t.label}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setTopic(t.value);
                            setMenuOpen(false);
                            if (soundEnabled) Haptics.selectionAsync().catch(() => {});
                          }}
                          style={({ pressed }) => ({ height: 52, paddingHorizontal: 16, flexDirection: "row",
                            alignItems: "center", gap: 12,
                            backgroundColor: selected || pressed ? colors.selected : colors.white })}>
                          <Text style={{ flex: 1, fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22,
                            color: selected ? colors.primary : colors.ink }}>{t.label}</Text>
                          {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </AppPressable>
                      </Fragment>
                    );
                  })}
                </View>
              </Animated.View>
            </>
          )}
        </View>
        <Text style={styles.caption}>Please don&apos;t include passwords or payment details.</Text>
        </Animated.View>
    </SettingsPage>
  );
}

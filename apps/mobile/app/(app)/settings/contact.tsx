import { Fragment, useEffect, useState } from "react";
import { BackHandler, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Application from "expo-application";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import { hasRealEmail } from "@adhd-planner/types";
import { AppPressable } from "../../../src/components/AppPressable";
import { inputStyle } from "../../../src/components/auth/UsernameForm";
import { OnboardingButton } from "../../../src/components/onboarding/OnboardingButton";
import { onboardingStyles } from "../../../src/components/onboarding/theme";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { settingsColors as colors, settingsStyles as styles } from "../../../src/components/settings/theme";
import { authClient } from "../../../src/lib/authClient";
import { canSendContact, CONTACT_TOPICS, contactSendError, isValidEmail, type ContactTopic } from "../../../src/lib/contactForm";

const OS = `${Platform.OS} ${Platform.Version}`;
const APP_VERSION = `${Application.nativeApplicationVersion ?? "unknown"} (${Application.nativeBuildVersion ?? "?"})`;

export default function ContactRoute() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const sendMessage = useMutation(api.contactMessages.send);
  const needsEmail = !hasRealEmail(session?.user);

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [topic, setTopic] = useState<ContactTopic | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topicY, setTopicY] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Registered after the page's own back handler, so it runs first and only closes the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setMenuOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [menuOpen]);

  const handleSend = async () => {
    Keyboard.dismiss();
    setError(null);
    setSending(true);
    try {
      await sendMessage({ topic: topic!, message, email: needsEmail ? email.trim() : undefined,
        os: OS, appVersion: APP_VERSION });
      setSent(true);
    } catch (e) {
      setError(contactSendError(e));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SettingsPage parent="Support" centered>
        <View style={{ gap: 24 }}>
          <View style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={[styles.title, { textAlign: "center" }]}>Thanks for reaching out</Text>
            <Text style={[styles.explanation, { textAlign: "center" }]}>
              We&apos;ve got your message. If we need anything else, we&apos;ll get back to you.
            </Text>
          </View>
          <OnboardingButton label="OK" onPress={() => router.back()} />
        </View>
      </SettingsPage>
    );
  }

  const emailError = needsEmail && emailTouched && !isValidEmail(email);
  const topicLabel = CONTACT_TOPICS.find((t) => t.value === topic)?.label;

  return (
    <SettingsPage parent="Support" title="Contact us"
      explanation="Stuck, spotted a bug, or have an idea? Tell us. A real person reads every message."
      note="Please don't include passwords or payment details.">
      <View style={{ gap: 24 }}>
        <View style={{ gap: 16 }}>
          {needsEmail && (
            <View style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} onBlur={() => setEmailTouched(true)}
                placeholder="you@example.com" placeholderTextColor={colors.muted} accessibilityLabel="Email"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" textContentType="emailAddress" maxLength={254}
                style={[inputStyle, { borderColor: emailError ? colors.danger : colors.border }]} />
              <Text style={[styles.caption, emailError && { color: colors.danger }]}>
                {emailError ? "Enter a valid email address." : "We'll reply to this address."}
              </Text>
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
            <TextInput value={message} onChangeText={setMessage} multiline maxLength={2000}
              placeholder="What's going on? The more detail you share, the easier it is to help."
              placeholderTextColor={colors.muted} accessibilityLabel="Message" textAlignVertical="top"
              style={[inputStyle, { height: 180, paddingVertical: 16, lineHeight: 22 }]} />
          </View>

          {error ? <Text style={[onboardingStyles.link, { color: colors.danger }]}>{error}</Text> : null}
        </View>

        <OnboardingButton label="Send message" onPress={handleSend} loading={sending}
          disabled={!canSendContact({ topic, message, email, needsEmail })} />

        {menuOpen && (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Close topic menu"
              onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFill} />
            {/* Floats 6px under the 80px Topic field, over Message. */}
            <View style={{ position: "absolute", left: 0, right: 0, top: topicY + 86, borderRadius: 20,
              backgroundColor: colors.white, boxShadow: "0px 8px 24px rgba(81, 11, 49, 0.14)" }}>
              <View style={{ borderRadius: 20, overflow: "hidden", paddingVertical: 4 }}>
                {CONTACT_TOPICS.map((t, i) => {
                  const selected = t.value === topic;
                  return (
                    <Fragment key={t.value}>
                      {i > 0 && <View style={styles.divider} />}
                      <AppPressable accessibilityRole="button" accessibilityLabel={t.label}
                        accessibilityState={{ selected }}
                        onPress={() => { setTopic(t.value); setMenuOpen(false); }}
                        style={{ height: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center",
                          gap: 12, backgroundColor: selected ? colors.selected : colors.white }}>
                        <Text style={{ flex: 1, fontFamily: "Inter-SemiBold", fontSize: 16, lineHeight: 22,
                          color: selected ? colors.primary : colors.ink }}>{t.label}</Text>
                        {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </AppPressable>
                    </Fragment>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>
    </SettingsPage>
  );
}

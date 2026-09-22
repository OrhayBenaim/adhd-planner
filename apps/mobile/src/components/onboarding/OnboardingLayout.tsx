import { useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ProgressBar } from "./ProgressBar";
import { OnboardingButton } from "./OnboardingButton";
import { onboardingStyles as styles } from "./theme";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";

interface Props {
  step: number;
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  continueEnabled?: boolean;
  showFooter?: boolean;
  showProgress?: boolean;
  reassurance?: string;
}

export function OnboardingLayout({ step, children, onBack, onContinue, onSkip,
  continueEnabled = true, showFooter = true, showProgress = true, reassurance }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const footer = showFooter && onContinue;
  const scrollRef = useRef<ScrollView>(null);
  const keyboardOpen = keyboardHeight > 0;
  const keyboardLift = footer ? keyboardHeight : 0;
  const bottomSafePadding = keyboardOpen ? 16 : Math.max(insets.bottom, 24);

  useEffect(() => {
    if (!keyboardOpen) return;
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [keyboardOpen, keyboardHeight]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: "white" }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingBottom: keyboardLift }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: footer ? 0 : 16 + keyboardHeight,
          }}
        >
          {showProgress && <ProgressBar currentStep={step} />}
          <View style={{ gap: 12, paddingTop: showProgress ? 12 : 24 }}>{children}</View>
          {footer && !keyboardOpen && <View style={{ flexGrow: 1, minHeight: 24 }} />}
        </ScrollView>
        {footer && (
          <View style={{ gap: 4, paddingHorizontal: 24, paddingBottom: bottomSafePadding }}>
            <OnboardingButton label="Continue" onPress={footer} disabled={!continueEnabled} />
            {reassurance ? <Text style={[styles.link, { textAlign: "center", fontSize: 13, marginTop: 8 }]}>{reassurance}</Text> : null}
            {(onBack || onSkip) && <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Pressable accessibilityRole="button" onPress={onBack} disabled={!onBack} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={styles.link}>{onBack ? "Back" : ""}</Text>
              </Pressable>
              {onSkip && <Pressable accessibilityRole="button" onPress={onSkip} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={styles.link}>Skip for now</Text>
              </Pressable>}
            </View>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

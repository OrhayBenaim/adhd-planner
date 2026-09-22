import { useCallback, useEffect } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { useFeatureFlag } from "posthog-react-native";
import { AppPressable } from "../../../src/components/AppPressable";
import { SettingsPage } from "../../../src/components/settings/SettingsPage";
import { settingsStyles as styles } from "../../../src/components/settings/theme";
import { usePremium } from "../../../src/hooks/usePremium";
import { track } from "../../../src/lib/analytics";

const INCLUDED = [
  "AI coach — personalised nudges & tips",
  "Insights — weekly stats and trends",
  "Achievements — badges and levels",
  "Voice languages — offline speech models",
];

const STORE_SUBSCRIPTIONS = Platform.OS === "ios"
  ? "https://apps.apple.com/account/subscriptions"
  : "https://play.google.com/store/account/subscriptions";

export default function SubscriptionRoute() {
  const { isPremium, expiresAt, willRenew, managementURL, showPaywall } = usePremium();
  const upgradeVariant = useFeatureFlag("profile-upgrade-variant");

  useEffect(() => {
    if (!isPremium && upgradeVariant) track("upgrade_cta_viewed", { variant: String(upgradeVariant) });
  }, [isPremium, upgradeVariant]);

  const handleUpgrade = useCallback(() => {
    track("paywall_opened", { variant: String(upgradeVariant), source: "subscription" });
    showPaywall(upgradeVariant === "locked-teasers" ? "feature_value" : undefined);
  }, [upgradeVariant, showPaywall]);

  const renewal = expiresAt
    ? `${willRenew ? "Renews" : "Expires"} ${new Date(expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  return (
    <SettingsPage parent="Account" title="Subscription"
      explanation="Lullio Pro unlocks the AI coach, insights and achievements."
      note={isPremium
        ? "Billing is handled by the App Store or Google Play.\nManage opens your store subscription settings."
        : "Billing is handled by the App Store or Google Play."}>
      <View style={styles.accentCard}>
        <Text style={styles.eyebrow}>CURRENT PLAN</Text>
        <Text style={styles.cardValue}>{isPremium ? "Lullio Pro" : "Free"}</Text>
        <Text style={styles.cardBody}>
          {isPremium ? renewal ?? "Active" : "Upgrade to unlock everything below."}
        </Text>
        <AppPressable accessibilityRole="button" style={styles.outlineButton}
          onPress={isPremium ? () => Linking.openURL(managementURL ?? STORE_SUBSCRIPTIONS) : handleUpgrade}>
          <Text style={styles.outlineButtonLabel}>{isPremium ? "Manage subscription" : "Upgrade to Pro"}</Text>
        </AppPressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.eyebrow}>WHAT&apos;S INCLUDED</Text>
        {INCLUDED.map((line) => (
          <Text key={line} style={styles.cardBody}>{`✓   ${line}`}</Text>
        ))}
      </View>
    </SettingsPage>
  );
}

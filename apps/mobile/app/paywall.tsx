import { useEffect } from "react";
import { View } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { router } from "expo-router";
import { usePremium } from "../src/hooks/usePremium";

export default function PaywallScreen() {
  const { isAnonymous } = usePremium();

  // Guard: anonymous users should not reach this screen
  useEffect(() => {
    if (isAnonymous) {
      router.back();
    }
  }, [isAnonymous]);

  if (isAnonymous) return null;

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall
        options={{ displayCloseButton: true }}
        onDismiss={() => router.back()}
        onPurchaseCompleted={() => router.back()}
        onRestoreCompleted={() => router.back()}
      />
    </View>
  );
}

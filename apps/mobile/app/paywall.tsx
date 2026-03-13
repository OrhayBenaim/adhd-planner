import { View } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { Redirect, router } from "expo-router";
import { usePremium } from "../src/hooks/usePremium";

export default function PaywallScreen() {
  const { isAnonymous } = usePremium();

  // Guard: anonymous users should not reach this screen
  if (isAnonymous) return <Redirect href=".." />;

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall
        options={{ displayCloseButton: true }}
        onDismiss={() => router.replace("/")}
        onPurchaseCompleted={() => router.replace("/")}
        onRestoreCompleted={() => router.replace("/")}

      />
    </View>
  );
}

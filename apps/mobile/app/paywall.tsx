import { View } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { router } from "expo-router";

export default function PaywallScreen() {
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

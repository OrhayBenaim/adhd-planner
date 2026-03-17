import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import Purchases, { type PurchasesOffering } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { usePremium } from "../src/hooks/usePremium";

export default function PaywallScreen() {
  const { isAnonymous } = usePremium();
  const { offering: offeringId } = useLocalSearchParams<{ offering?: string }>();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(!!offeringId);

  useEffect(() => {
    if (!offeringId) return;
    Purchases.getOfferings()
      .then((offerings) => setOffering(offerings.all[offeringId] ?? null))
      .finally(() => setLoading(false));
  }, [offeringId]);

  // Guard: anonymous users should not reach this screen
  if (isAnonymous) return <Redirect href=".." />;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall
        options={{
          displayCloseButton: true,
          ...(offering ? { offering } : {}),
        }}
        onDismiss={() => router.replace("/")}
        onPurchaseCompleted={() => router.replace("/")}
        onRestoreCompleted={() => router.replace("/")}
      />
    </View>
  );
}

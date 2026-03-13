import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { router } from "expo-router";
import { authClient } from "../lib/authClient";

const ENTITLEMENT_ID = "premium";

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  showPaywall: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const session = authClient.useSession();

  useEffect(() => {
    async function init() {
      const apiKey =
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY!
          : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY!;

      await Purchases.configure({ apiKey });

      const userId = session.data?.user?.id;
      if (userId) {
        await Purchases.logIn(userId);
      }

      const info = await Purchases.getCustomerInfo();
      setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);

      setIsLoading(false);
    }

    init().catch(() => setIsLoading(false));
  }, [session.data?.user?.id]);

  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  }, []);

  const showPaywall = useCallback(() => {
    router.push("/paywall");
  }, []);

  return (
    <PremiumContext value={{ isPremium, isLoading, showPaywall }}>
      {children}
    </PremiumContext>
  );
}

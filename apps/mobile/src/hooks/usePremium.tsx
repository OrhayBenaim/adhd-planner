import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { authClient } from "../lib/authClient";

const ENTITLEMENT_ID = "premium";

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  offerings: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
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
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);

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

      const offeringsResult = await Purchases.getOfferings();
      const current = offeringsResult.current;
      if (current) {
        setOfferings(current.availablePackages);
      }

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

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
        setIsPremium(active);
        return active;
      } catch {
        return false;
      }
    },
    [],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      const active = !!info.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);
      return active;
    } catch {
      return false;
    }
  }, []);

  return (
    <PremiumContext value={{ isPremium, isLoading, offerings, purchase, restore }}>
      {children}
    </PremiumContext>
  );
}

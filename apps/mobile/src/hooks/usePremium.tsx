import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { useMutation } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { authClient } from "../lib/authClient";
import { getDeviceId } from "../lib/deviceId";

const ENTITLEMENT_ID = "Lullio Pro";

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
}

type PremiumAction =
  | { type: "INIT_DONE"; isPremium: boolean }
  | { type: "INIT_FAILED" }
  | { type: "PREMIUM_CHANGED"; isPremium: boolean };

function premiumReducer(_state: PremiumState, action: PremiumAction): PremiumState {
  switch (action.type) {
    case "INIT_DONE":
      return { isPremium: action.isPremium, isLoading: false };
    case "INIT_FAILED":
      return { isPremium: false, isLoading: false };
    case "PREMIUM_CHANGED":
      return { ..._state, isPremium: action.isPremium };
  }
}

interface PremiumContextValue {
  isPremium: boolean;
  isAnonymous: boolean;
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
  const [{ isPremium, isLoading }, dispatch] = useReducer(premiumReducer, {
    isPremium: false,
    isLoading: true,
  });

  const session = authClient.useSession();
  const isAnonymous =
    (session.data?.user as any)?.isAnonymous ?? true;
  const registerDeviceIdMutation = useMutation(api.settings.registerDeviceId);

  useEffect(() => {
    async function init() {
      const apiKey =
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
          : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

      if (!apiKey) {
        // RevenueCat not configured — skip SDK init, stay on free tier
        dispatch({ type: "INIT_FAILED" });
        return;
      }

      await Purchases.configure({ apiKey });

      const userId = session.data?.user?.id;
      if (userId) {
        await Purchases.logIn(userId);
      }

      const user = session.data?.user;
      if (user?.email) {
        await Purchases.setEmail(user.email);
      }
      if (user?.name) {
        await Purchases.setDisplayName(user.name);
      }

      const info = await Purchases.getCustomerInfo();
      dispatch({
        type: "INIT_DONE",
        isPremium: !!info.entitlements.active[ENTITLEMENT_ID],
      });
    }

    init().catch(() => dispatch({ type: "INIT_FAILED" }));
  }, [session.data?.user?.id, isAnonymous]);

  // Register device ID with backend for cost ceiling enforcement
  useEffect(() => {
    if (!session.data?.user?.id) return;
    getDeviceId().then((deviceId) => {
      registerDeviceIdMutation({ deviceId }).catch(() => {});
    });
  }, [session.data?.user?.id, registerDeviceIdMutation]);

  useEffect(() => {
    const apiKey =
      Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
    if (!apiKey) return;

    const listener = (info: CustomerInfo) => {
      dispatch({
        type: "PREMIUM_CHANGED",
        isPremium: !!info.entitlements.active[ENTITLEMENT_ID],
      });
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, []);

  const showPaywall = useCallback(() => {
    if (isAnonymous) {
      router.push("/sign-in-gate");
    } else {
      router.push("/paywall");
    }
  }, [isAnonymous]);

  // Handle lullio://paywall deep link from widgets
  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      if (parsed.path === "paywall") {
        showPaywall();
      }
    }

    // Handle URL when app is already open
    const subscription = Linking.addEventListener("url", handleUrl);

    // Handle URL that launched the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [showPaywall]);

  return (
    <PremiumContext value={{ isPremium, isAnonymous, isLoading, showPaywall }}>
      {children}
    </PremiumContext>
  );
}

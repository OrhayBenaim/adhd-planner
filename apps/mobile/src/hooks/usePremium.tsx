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
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@adhd-planner/convex/convex/_generated/api";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { authClient } from "../lib/authClient";
import { posthog } from "../lib/posthog";
import { getDeviceId } from "../lib/deviceId";
import { getSessionAnonymousState } from "../lib/sessionState";
import { evaluateBackendPremium } from "../lib/subscriptionStatus";
import { usePreferences } from "./usePreferences";

const ENTITLEMENT_ID = "Lullio Pro";

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
}

type PremiumAction =
  | {
      type: "INIT_DONE";
      isPremium: boolean;
      expiresAt: string | null;
      willRenew: boolean;
      managementURL: string | null;
    }
  | { type: "INIT_FAILED" }
  | {
      type: "PREMIUM_CHANGED";
      isPremium: boolean;
      expiresAt: string | null;
      willRenew: boolean;
      managementURL: string | null;
    };

function premiumReducer(
  _state: PremiumState,
  action: PremiumAction,
): PremiumState {
  switch (action.type) {
    case "INIT_DONE":
      return {
        isPremium: action.isPremium,
        isLoading: false,
        expiresAt: action.expiresAt,
        willRenew: action.willRenew,
        managementURL: action.managementURL,
      };
    case "INIT_FAILED":
      return {
        isPremium: false,
        isLoading: false,
        expiresAt: null,
        willRenew: false,
        managementURL: null,
      };
    case "PREMIUM_CHANGED":
      return {
        ..._state,
        isPremium: action.isPremium,
        expiresAt: action.expiresAt,
        willRenew: action.willRenew,
        managementURL: action.managementURL,
      };
  }
}

interface PremiumContextValue {
  isPremium: boolean;
  isBackendPremium: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
  showPaywall: (offering?: string) => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [
    { isPremium: sdkPremium, isLoading, expiresAt, willRenew, managementURL },
    dispatch,
  ] = useReducer(premiumReducer, {
    isPremium: false,
    isLoading: true,
    expiresAt: null,
    willRenew: false,
    managementURL: null,
  });

  const preferences = usePreferences();

  const session = authClient.useSession();
  const isAnonymous = getSessionAnonymousState(session.data) ?? true;
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const registerDeviceIdMutation = useMutation(api.settings.registerDeviceId);
  const backendSubscription = useQuery(
    api.subscriptions.getStatus,
    !isAnonymous && isAuthenticated && !isConvexAuthLoading ? {} : "skip",
  );
  const isBackendPremium = evaluateBackendPremium(backendSubscription);
  const isPremium = sdkPremium || isBackendPremium;
  const resolvedExpiresAt = expiresAt ?? backendSubscription?.expiresAt ?? null;

  const extractSubscriptionInfo = useCallback((info: CustomerInfo) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    return {
      isPremium: !!entitlement,
      expiresAt: entitlement?.expirationDate ?? null,
      willRenew: entitlement?.willRenew ?? false,
      managementURL: info.managementURL ?? null,
    };
  }, []);

  useEffect(() => {
    async function init() {
      const userName = preferences?.name ?? session.data?.user?.name;

      if (!userName || userName === "Anonymous" || !session.data?.user?.id) {
        dispatch({ type: "INIT_FAILED" });
        return;
      }

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
      await Purchases.logIn(session.data.user.id);

      const user = session.data.user;
      const attributeSyncs: Promise<void>[] = [
        Purchases.setAttributes({
          $posthogUserId: posthog.getDistinctId(),
        }),
      ];
      if (user.email) {
        attributeSyncs.push(Purchases.setEmail(user.email));
      }
      if (userName) {
        attributeSyncs.push(Purchases.setDisplayName(userName));
      }
      await Promise.all(attributeSyncs);

      await Purchases.invalidateCustomerInfoCache();
      const info = await Purchases.getCustomerInfo();
      dispatch({ type: "INIT_DONE", ...extractSubscriptionInfo(info) });
    }

    init().catch(() => dispatch({ type: "INIT_FAILED" }));
  }, [session.data?.user?.id, isAnonymous, preferences]);

  // Register device ID with backend for cost ceiling enforcement
  useEffect(() => {
    if (!session.data?.user?.id) return;
    getDeviceId().then((deviceId) => {
      registerDeviceIdMutation({ deviceId }).catch(() => {});
    });
  }, [session.data?.user?.id, registerDeviceIdMutation]);

  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      const subInfo = extractSubscriptionInfo(info);
      dispatch({ type: "PREMIUM_CHANGED", ...subInfo });

      // Track new subscription purchase (free → premium transition)
      if (subInfo.isPremium && !sdkPremium) {
        posthog.capture("subscription_purchased", {
          variant: String(
            posthog.getFeatureFlag("profile-upgrade-variant") ?? "unknown",
          ),
        });
      }
    };
    if (!isAnonymous && session?.data?.user.id) {
      const apiKey =
        Platform.OS === "ios"
          ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
          : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
      if (!apiKey) return;

      Purchases.addCustomerInfoUpdateListener(listener);
    }
    return () => {
      if (!isAnonymous && session?.data?.user.id) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [
    isAnonymous,
    session.data?.user?.id,
    sdkPremium,
    extractSubscriptionInfo,
  ]);

  const showPaywall = useCallback(
    (offering?: string) => {
      const params = offering ? `?offering=${offering}` : "";
      if (isAnonymous) {
        router.push(`/sign-in-gate${params}` as any);
      } else {
        router.push(`/paywall${params}` as any);
      }
    },
    [isAnonymous],
  );

  // Handle lullio://paywall deep link from widgets
  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      if (parsed.hostname === "paywall" || parsed.path === "paywall") {
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
    <PremiumContext
      value={{
        isPremium,
        isBackendPremium,
        isAnonymous,
        isLoading,
        expiresAt: resolvedExpiresAt,
        willRenew,
        managementURL,
        showPaywall,
      }}
    >
      {children}
    </PremiumContext>
  );
}

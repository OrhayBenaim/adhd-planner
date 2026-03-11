// apps/mobile/src/lib/authClient.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { anonymousClient } from "better-auth/client/plugins";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";



export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL!,
  plugins: [
    convexClient(),
    expoClient({
      scheme: "lullio",
      storagePrefix: "lullio",
      storage: SecureStore,
    }),
    anonymousClient(),
  ],
});

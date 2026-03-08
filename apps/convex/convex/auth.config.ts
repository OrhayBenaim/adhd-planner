// apps/convex/convex/auth.config.ts
import type { AuthConfig } from "@convex-dev/better-auth";

export default {
  baseURL: process.env.CONVEX_SITE_URL!,
} satisfies AuthConfig;

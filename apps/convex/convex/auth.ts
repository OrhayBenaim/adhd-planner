// apps/convex/convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { expo } from "@better-auth/expo";
import { anonymous } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import { sentryCaptureEvent } from "./lib/sentry";
import type { DataModel } from "./_generated/dataModel";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const required = [
    "BETTER_AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    // "APPLE_CLIENT_ID",    // TODO: enable when Apple Developer account is set up
    // "APPLE_CLIENT_SECRET",
    "CONVEX_SITE_URL",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: ["lullio://"],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
        ? {
            apple: {
              clientId: process.env.APPLE_CLIENT_ID,
              clientSecret: process.env.APPLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    plugins: [
      expo(),
      convex({
        authConfig: {
          providers: [
            {
              type: "customJwt",
              issuer: process.env.CONVEX_SITE_URL!,
              applicationID: "convex",
              algorithm: "RS256",
              jwks: `${process.env.CONVEX_SITE_URL!}/api/auth/convex/jwks`,
            },
          ],
        },
      }),
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          console.log(
            `[auth] onLinkAccount: migrating data from ${anonymousUser.user.id} to ${newUser.user.id}`,
          );
          if ("runMutation" in ctx) {
            await ctx.runMutation(internal.migration.migrateUserData, {
              oldUserId: anonymousUser.user.id,
              newUserId: newUser.user.id,
            });
          } else {
            await sentryCaptureEvent(
              "error",
              "[auth] onLinkAccount: ctx missing runMutation, migration skipped",
              { anonymousUserId: anonymousUser.user.id, newUserId: newUser.user.id },
            );
          }
        },
      }),
    ],
  });
};

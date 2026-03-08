// apps/convex/convex/auth.ts
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { expo } from "@better-auth/expo";
import { anonymous } from "better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: ["adhd-planner://"],
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
      apple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      expo(),
      convex({
        authConfig: {
          providers: [
            {
              type: "customJwt",
              issuer: "https://affable-tiger-74.eu-west-1.convex.site",
              applicationID: "convex",
              algorithm: "RS256",
              jwks: "https://affable-tiger-74.eu-west-1.convex.site/api/auth/convex/jwks",
            },
          ],
        },
      }),
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          console.log(
            `[auth] onLinkAccount: migrating data from ${anonymousUser.id} to ${newUser.id}`,
          );
          if ("runMutation" in ctx) {
            await ctx.runMutation(internal.migration.migrateUserData, {
              oldUserId: anonymousUser.id,
              newUserId: newUser.id,
            });
          } else {
            console.error(
              "[auth] onLinkAccount: ctx missing runMutation, migration skipped",
            );
          }
        },
      }),
    ],
  });

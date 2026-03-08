import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  emailAndPassword: {
    enabled: true,
  },
  // TODO: replace with persistent adapter before production
  // e.g. import { drizzleAdapter } from "better-auth/adapters/drizzle"
});

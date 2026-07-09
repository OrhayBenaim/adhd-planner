import PostHog from "posthog-react-native";

function createClient(): PostHog {
  return new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
    host: "https://eu.i.posthog.com",
    captureAppLifecycleEvents: true,
  });
}

const productionClient = createClient();
let client: PostHog = productionClient;

/** PostHog singleton — for PostHogProvider and survey internals only. */
export function getPostHogClient(): PostHog {
  return client;
}

/** Replace the client in tests. */
export function setPostHogClientForTests(mock: PostHog): void {
  client = mock;
}

/** Restore production client after tests. */
export function resetPostHogClientForTests(): void {
  client = productionClient;
}

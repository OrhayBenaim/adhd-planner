// apps/mobile/app/index.tsx
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { authClient } from "../src/lib/authClient";
import { HomeScreen } from "../src/components/home/HomeScreen";

export default function IndexPage() {
  const { data: session, isPending } = authClient.useSession();

  // Trigger anonymous sign-in when there's no session
  useEffect(() => {
    if (!isPending && !session) {
      authClient.signIn.anonymous().catch((e) =>
        console.error("[index] sign-in error:", e)
      );
    }
  }, [session, isPending]);

  // Show loader until session is ready — Convex queries won't mount until then
  if (isPending || !session) {
    return (
      <View className="flex-1 bg-[#f5f7fa] items-center justify-center">
        <ActivityIndicator size="large" color="#a2d2ff" />
      </View>
    );
  }

  return <HomeScreen />;
}

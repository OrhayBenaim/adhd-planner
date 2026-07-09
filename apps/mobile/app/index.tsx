import { Redirect } from "expo-router";
import { HomeScreen } from "../src/components/home/HomeScreen";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { useAuthBootstrap } from "../src/hooks/useAuthBootstrap";

export default function IndexPage() {
  const { status, recoveryHref } = useAuthBootstrap();

  switch (status) {
    case "loading":
      return <LoadingScreen />;
    case "recovery":
      return <Redirect href={recoveryHref} />;
    case "onboarding":
      return <Redirect href={"/(onboarding)/welcome"} />;
    case "home":
      return <HomeScreen />;
  }
}

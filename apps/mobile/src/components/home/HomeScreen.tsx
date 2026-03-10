// apps/mobile/src/components/home/HomeScreen.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeProvider } from "./HomeProvider";
import { SheetFlowProvider } from "./SheetFlowProvider";
import { MainContent } from "./MainContent";
import { SheetManager } from "./SheetManager";
import { usePushToken } from "../../hooks/usePushToken";

export function HomeScreen() {
  usePushToken();
  return (
    <HomeProvider>
      <SheetFlowProvider>
        <SafeAreaView className="flex-1 bg-[#f5f7fa]">
          <MainContent />
          <SheetManager />
        </SafeAreaView>
      </SheetFlowProvider>
    </HomeProvider>
  );
}

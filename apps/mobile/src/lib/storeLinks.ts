import { Linking, Platform } from "react-native";

// Fill in when the iOS App Store listing exists.
const IOS_APP_STORE_ID: string | null = null;

const ANDROID_PACKAGE = "com.ottersprod.lullio";

export function canRateOnStore(): boolean {
  return Platform.OS === "android" || IOS_APP_STORE_ID !== null;
}

export async function openStoreReviewPage(): Promise<void> {
  if (Platform.OS === "android") {
    const marketUrl = `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`;
    const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    try {
      await Linking.openURL(marketUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
    return;
  }

  if (Platform.OS === "ios" && IOS_APP_STORE_ID !== null) {
    await Linking.openURL(
      `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`,
    );
  }
}

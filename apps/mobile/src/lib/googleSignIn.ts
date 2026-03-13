import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/**
 * Triggers native Google Sign-In and returns the ID token.
 * Returns null if the user cancels or sign-in fails.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  console.log("[GoogleSignIn] webClientId configured:", !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  console.log("[GoogleSignIn] response type:", response.type);
  if (isSuccessResponse(response)) {
    console.log("[GoogleSignIn] hasIdToken:", !!response.data.idToken);
    if (response.data.idToken) {
      return response.data.idToken;
    }
    console.warn("[GoogleSignIn] Sign-in succeeded but no idToken returned. Check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
  }
  return null;
}

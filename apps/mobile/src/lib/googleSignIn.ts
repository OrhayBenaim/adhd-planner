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
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (isSuccessResponse(response) && response.data.idToken) {
    return response.data.idToken;
  }
  return null;
}

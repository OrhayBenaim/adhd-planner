import * as SecureStore from "expo-secure-store";

const HAD_LINKED_ACCOUNT_KEY = "lullio.hadLinkedAccount";

export interface AuthSessionUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  isAnonymous?: boolean | null;
}

export interface AuthSession {
  user?: AuthSessionUser | null;
}

export function getSessionAnonymousState(
  session: AuthSession | null | undefined,
): boolean | undefined {
  if (!session?.user?.id) return undefined;
  return session.user.isAnonymous === true;
}

export function hasLinkedAccountSession(
  session: AuthSession | null | undefined,
): boolean {
  return !!session?.user?.id && session.user.isAnonymous !== true;
}

export async function readHadLinkedAccountMarker(): Promise<boolean> {
  return (await SecureStore.getItemAsync(HAD_LINKED_ACCOUNT_KEY)) === "true";
}

export async function markHadLinkedAccount(): Promise<void> {
  await SecureStore.setItemAsync(HAD_LINKED_ACCOUNT_KEY, "true");
}

export async function clearHadLinkedAccountMarker(): Promise<void> {
  await SecureStore.deleteItemAsync(HAD_LINKED_ACCOUNT_KEY);
}

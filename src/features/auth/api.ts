import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { completeAuthRedirect } from "@/src/features/auth/callback";
import { appEnv } from "@/src/lib/env";
import { requireSupabase } from "@/src/lib/supabase";

const AUTH_CALLBACK_PATH = "auth-callback";
const APP_SCHEME = "selftend";

export function getWebAuthRedirectUrl(publicAppUrl = appEnv.publicAppUrl) {
  const configuredPublicAppUrl = publicAppUrl.trim();
  if (!configuredPublicAppUrl) {
    return Linking.createURL(AUTH_CALLBACK_PATH);
  }

  return new URL(`/${AUTH_CALLBACK_PATH}`, configuredPublicAppUrl).toString();
}

export function getOAuthRedirectUrl() {
  if (Platform.OS === "web") {
    return getWebAuthRedirectUrl();
  }

  return Linking.createURL(AUTH_CALLBACK_PATH, { scheme: APP_SCHEME });
}

export function getMagicLinkRedirectUrl() {
  if (Platform.OS === "web") {
    return getWebAuthRedirectUrl();
  }

  return Linking.createURL(AUTH_CALLBACK_PATH, { scheme: APP_SCHEME });
}

export async function signInWithGoogle() {
  const client = requireSupabase();
  const redirectTo = getOAuthRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (Platform.OS === "web") {
    return false;
  }

  const authUrl = data?.url;
  if (!authUrl) {
    throw new Error("Unable to start Google sign-in.");
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
  if (result.type !== "success") {
    return false;
  }

  await completeAuthRedirect(result.url);
  return true;
}

export async function signInWithMagicLink(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getMagicLinkRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

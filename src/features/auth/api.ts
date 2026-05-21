import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { completeAuthRedirect } from "@/src/features/auth/callback";
import { appEnv } from "@/src/lib/env";
import { requireSupabase } from "@/src/lib/supabase";

const AUTH_CALLBACK_PATH = "auth-callback";

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

  return getNativeAuthRedirectUrl();
}

export function getEmailRedirectUrl() {
  if (Platform.OS === "web") {
    return getWebAuthRedirectUrl();
  }

  return getNativeAuthRedirectUrl();
}

export function getNativeAuthRedirectUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
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

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
}

export const EMAIL_ALREADY_EXISTS_ERROR = "EMAIL_ALREADY_EXISTS";

export async function signUpWithPassword(email: string, password: string, name?: string) {
  const client = requireSupabase();
  const trimmedName = name?.trim();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
      ...(trimmedName ? { data: { full_name: trimmedName } } : {}),
    },
  });
  if (error) {
    throw error;
  }

  // When email enumeration protection is on, Supabase silently succeeds for
  // existing accounts — identities will be empty instead of throwing an error.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(EMAIL_ALREADY_EXISTS_ERROR);
  }

  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getEmailRedirectUrl(),
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
}

export async function resendVerificationEmail(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getEmailRedirectUrl(),
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

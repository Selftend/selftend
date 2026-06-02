import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { completeAuthRedirect } from "@/src/features/auth/callback";
import { appEnv } from "@/src/lib/env";
import { requireSupabase } from "@/src/lib/supabase";

const AUTH_CALLBACK_PATH = "auth-callback";

// Under the PKCE flow the recovery email redirects to the callback as
// `…/auth-callback?code=<uuid>` with NO `type` param, and supabase-js emits a
// plain SIGNED_IN event (not PASSWORD_RECOVERY). Without a marker the callback
// can't tell a reset link from a normal sign-in and would drop the user into the
// app instead of the update-password screen. We carry the intent in redirect_to;
// Supabase preserves the query param and appends `&code=…`, so the callback sees
// `?code=…&type=recovery`. parseAuthCallbackUrl reads `type` from the query.
const RECOVERY_REDIRECT_TYPE = "recovery";

export function getWebAuthRedirectUrl(publicAppUrl = appEnv.publicAppUrl) {
  const configuredPublicAppUrl = publicAppUrl.trim();
  if (!configuredPublicAppUrl) {
    return Linking.createURL(AUTH_CALLBACK_PATH);
  }

  return new URL(`/${AUTH_CALLBACK_PATH}`, configuredPublicAppUrl).toString();
}

export function getPasswordResetRedirectUrl() {
  if (Platform.OS === "web") {
    const url = new URL(getWebAuthRedirectUrl());
    url.searchParams.set("type", RECOVERY_REDIRECT_TYPE);
    return url.toString();
  }

  return Linking.createURL(AUTH_CALLBACK_PATH, {
    queryParams: { type: RECOVERY_REDIRECT_TYPE },
  });
}

function getOAuthRedirectUrl() {
  if (Platform.OS === "web") {
    return getWebAuthRedirectUrl();
  }

  return getNativeAuthRedirectUrl();
}

function getEmailRedirectUrl() {
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
export const LEAKED_PASSWORD_ERROR = "LEAKED_PASSWORD";

type SupabaseAuthError = Error & {
  code?: string;
  weakPassword?: { reasons?: string[] };
};

function isLeakedPasswordError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as SupabaseAuthError;
  if (e.code !== "weak_password") return false;
  const reasons = e.weakPassword?.reasons ?? [];
  return reasons.includes("pwned");
}

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
    if (isLeakedPasswordError(error)) {
      throw new Error(LEAKED_PASSWORD_ERROR);
    }
    throw error;
  }

  // When email enumeration protection is on, Supabase silently succeeds for
  // existing accounts - identities will be empty instead of throwing an error.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(EMAIL_ALREADY_EXISTS_ERROR);
  }

  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    if (isLeakedPasswordError(error)) {
      throw new Error(LEAKED_PASSWORD_ERROR);
    }
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

import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { completeAuthRedirect } from "@/src/features/auth/callback";
import { appEnv } from "@/src/lib/env";
import { requireSupabase } from "@/src/lib/supabase";

const AUTH_CALLBACK_PATH = "auth-callback";

// Email links are templated as `{{ .SiteURL }}/auth-callback?token_hash={{ .TokenHash }}&type=...`
// (see supabase/templates/ and docs/operations-runbook.md "Auth Email Templates"): the
// link base is the project Site URL, NOT the redirect URL this app sends. Native
// clients send the app scheme (`selftend://auth-callback`) as redirect_to, and Go's
// html/template refuses custom schemes in an href - a `{{ .RedirectTo }}`-based link
// renders as the dead literal `ZgotmplZ?...` in those emails. The redirect URLs below
// are still sent (GoTrue validates them against the allowlist, and OAuth uses them for
// the actual browser return trip); they just no longer decide where email links point.
// The `type` the callback needs to route (recovery -> update-password, signup ->
// verified card) comes from the template's `&type=` param. Links from emails sent by
// older template revisions still work - they route through /auth/v1/verify and arrive
// as `?code=...`, which the callback's `code` branch handles.

export function getWebAuthRedirectUrl(publicAppUrl = appEnv.publicAppUrl) {
  const configuredPublicAppUrl = publicAppUrl.trim();
  if (!configuredPublicAppUrl) {
    return Linking.createURL(AUTH_CALLBACK_PATH);
  }

  return new URL(`/${AUTH_CALLBACK_PATH}`, configuredPublicAppUrl).toString();
}

export function getPasswordResetRedirectUrl() {
  // Query-less on purpose: the recovery template appends `?token_hash=...&type=recovery`.
  return getDefaultAuthRedirectUrl();
}

function getDefaultAuthRedirectUrl() {
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
  const redirectTo = getDefaultAuthRedirectUrl();
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
    if ((error as SupabaseAuthError).code === "invalid_credentials") {
      throw new Error(INVALID_CREDENTIALS_ERROR);
    }
    throw error;
  }
}

export const EMAIL_ALREADY_EXISTS_ERROR = "EMAIL_ALREADY_EXISTS";
export const LEAKED_PASSWORD_ERROR = "LEAKED_PASSWORD";
export const INVALID_CREDENTIALS_ERROR = "INVALID_CREDENTIALS";

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
      emailRedirectTo: getDefaultAuthRedirectUrl(),
      ...(trimmedName ? { data: { full_name: trimmedName } } : {}),
    },
  });
  if (error) {
    if (isLeakedPasswordError(error)) {
      throw new Error(LEAKED_PASSWORD_ERROR);
    }
    // Without email enumeration protection (the local stack, and hosted projects
    // that disable it) GoTrue rejects an existing email outright instead of
    // silently succeeding - map it to the same friendly branch as the
    // empty-identities case below so local and hosted behave identically.
    if ((error as SupabaseAuthError).code === "user_already_exists") {
      throw new Error(EMAIL_ALREADY_EXISTS_ERROR);
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
    // `signup` here is NOT the type deprecated on the verifyOtp docs page. `resend` takes a
    // different, narrower enum - `Extract<EmailOtpType, "signup" | "email_change">` - in which
    // `email` is not spellable at all, so this call site cannot move even in principle. See
    // the note in `callback.ts` for why the verify side deliberately stays on `signup` too.
    type: "signup",
    email,
    options: {
      emailRedirectTo: getDefaultAuthRedirectUrl(),
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

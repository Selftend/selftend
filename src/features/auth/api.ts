import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { completeAuthRedirect } from "@/src/features/auth/callback";
import { updateUserPreferences } from "@/src/features/settings/repository";
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

/**
 * Whether this device can offer Sign in with Apple.
 *
 * Required by App Store Guideline 4.8: an app offering Google Sign-In must also
 * offer a login option that lets users keep their email address private, and
 * the existing email/password auth cannot do that by construction (see #540).
 *
 * Availability is asked of the OS rather than inferred from the platform -
 * `isAvailableAsync` is false on iOS versions without the capability, and the
 * module is iOS-only, so a bare `Platform.OS` check would render a button that
 * cannot work.
 */
export async function isAppleSignInAvailable() {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Sign in with Apple.
 *
 * Unlike Google this never opens a browser: Apple returns an identity token
 * straight from the system sheet, which Supabase exchanges via
 * `signInWithIdToken`. So there is no redirect trip and no `completeAuthRedirect`.
 *
 * Account linking, decided in #540: when the user chooses **Share My Email**,
 * Supabase auto-links to an existing confirmed account with that address and
 * nothing extra is needed. When they choose **Hide My Email**, Apple issues a
 * `@privaterelay.appleid.com` relay that matches nothing, so a separate account
 * is created - deliberately, because silently merging accounts in a private
 * journal is worse than an honest separate one. The sign-in screens carry a
 * hint steering returning users to Share My Email, and Settings will offer
 * explicit linking for anyone who hid it anyway.
 *
 * Returns false when the user dismisses the sheet, matching signInWithGoogle's
 * contract so the callers can stay identical.
 */
export async function signInWithApple() {
  const client = requireSupabase();

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    // Apple reports a cancelled sheet as a thrown error rather than a result,
    // and a user backing out is not a failure worth surfacing.
    if (isAppleCancellation(error)) {
      return false;
    }
    throw error;
  }

  const identityToken = credential.identityToken;
  if (!identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const { error } = await client.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
  });

  if (error) {
    throw error;
  }

  return true;
}

function isAppleCancellation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ERR_REQUEST_CANCELED"
  );
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
export const EMAIL_RATE_LIMITED_ERROR = "EMAIL_RATE_LIMITED";
export const SESSION_MISSING_ERROR = "SESSION_MISSING";

type SupabaseAuthError = Error & {
  code?: string;
  status?: number;
  weakPassword?: { reasons?: string[] };
};

function isEmailRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as SupabaseAuthError;
  return e.status === 429 || e.code === "over_email_send_rate_limit";
}

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
    if (isEmailRateLimitError(error)) {
      throw new Error(EMAIL_RATE_LIMITED_ERROR);
    }
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
    // Submitting without a recovery session (expired or reused reset link, or
    // direct navigation to /update-password) - the form shows its expired-link
    // state rather than the raw "Auth session missing!" string.
    if (error.name === "AuthSessionMissingError") {
      throw new Error(SESSION_MISSING_ERROR);
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

// The verify-email banner's send half (#489): a signInWithOtp email carrying a
// 6-digit code (and a token_hash link fallback - see supabase/templates/
// magic_link.html). shouldCreateUser:false because the caller is already a
// signed-in account holder; a typo'd address must bounce, not mint a user.
export async function sendVerificationCode(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: getDefaultAuthRedirectUrl(),
    },
  });
  if (error) {
    if (isEmailRateLimitError(error)) {
      throw new Error(EMAIL_RATE_LIMITED_ERROR);
    }
    throw error;
  }
}

export const INVALID_VERIFICATION_CODE_ERROR = "INVALID_VERIFICATION_CODE";

// The banner's verify half: exchanges the emailed code. `email` (not the
// deprecated `magiclink`) is the one spelling GoTrue resolves against every
// email token kind - see the type notes in callback.ts. Success replaces the
// current session with the OTP-minted one for the same user, which is fine.
export async function verifyEmailCode(email: string, code: string) {
  const client = requireSupabase();
  const { error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    if ((error as SupabaseAuthError).code === "otp_expired") {
      throw new Error(INVALID_VERIFICATION_CODE_ERROR);
    }
    throw error;
  }
}

// Completing ANY emailed auth artifact - confirmation link, recovery link,
// OTP link - proves the holder controls the mailbox, so the auth callback
// stamps the app's verified flag (#489) as a side effect. This is the path
// that covers environments on the default Supabase templates (no visible
// code in the email, link only). Fire-and-forget from callers: a failure
// only means the banner stays until the next proof.
export async function markEmailVerifiedFromCallback() {
  const client = requireSupabase();
  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user || user.app_metadata?.provider !== "email") {
    return;
  }
  await updateUserPreferences(user.id, { emailVerified: true });
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

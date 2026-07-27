import type { EmailOtpType } from "@supabase/supabase-js";

import {
  AuthCallbackError,
  classifyAuthCallbackFailure,
} from "@/src/features/auth/callback-errors";
import { requireSupabase } from "@/src/lib/supabase";

// Supabase's docs deprecate the `signup` and `magiclink` verifyOtp types in favour of `email`,
// and we deliberately stay on `signup` anyway (`magiclink` is unused here). Three reasons:
//
//  1. `email` is a strictly WIDER lookup, not a rename - GoTrue resolves it against confirmation
//     OR recovery tokens, then rewrites the type back to `signup`/`magiclink` internally before
//     it branches. We use `type` for our own client-side decisions (the outcome classified
//     below, the gate copy key and the "request a new link" route in auth-callback-screen), so
//     adopting `email` would tell US less about which link just arrived, for no behaviour change.
//  2. `resend` cannot follow. Its param type excludes `email` outright (see api.ts), so `signup`
//     stays in this codebase permanently regardless - migrating buys two spellings, not one.
//  3. The deprecation is documentation-only, and only on the Dart reference page. `EmailOtpType`
//     in @supabase/auth-js carries no `@deprecated` tag, the server treats every type as
//     first-class, and no removal timeline has been published.
//
// Revisit if a real removal signal appears (an `@deprecated` tag, a changelog entry, or the
// server rejecting the type). Verified against supabase/auth master, 2026-07-27 - see #355.
const supportedEmailOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "recovery",
  "email_change",
  "email",
]);

interface ParsedAuthCallbackUrl {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

type CompletedAuthRedirect = "authenticated" | "confirmed" | "password-recovery" | "email-verified";

function classifyAuthOutcome(type: string | null, hasSession: boolean): CompletedAuthRedirect {
  if (type === "recovery") {
    return "password-recovery";
  }

  if (type === "signup") {
    return "email-verified";
  }

  return hasSession ? "authenticated" : "confirmed";
}

function splitAuthUrl(url: string) {
  const [pathAndQuery, hash = ""] = url.split("#", 2);
  const queryIndex = pathAndQuery.indexOf("?");
  const query = queryIndex >= 0 ? pathAndQuery.slice(queryIndex + 1) : "";

  return {
    hashParams: new URLSearchParams(hash),
    queryParams: new URLSearchParams(query),
  };
}

function getParamFromAuthUrl(
  queryParams: URLSearchParams,
  hashParams: URLSearchParams,
  key: string,
) {
  return hashParams.get(key) ?? queryParams.get(key);
}

function toEmailOtpType(type: string | null): EmailOtpType | null {
  if (!type || !supportedEmailOtpTypes.has(type as EmailOtpType)) {
    return null;
  }

  return type as EmailOtpType;
}

export function parseAuthCallbackUrl(url: string): ParsedAuthCallbackUrl {
  const { hashParams, queryParams } = splitAuthUrl(url);

  return {
    code: getParamFromAuthUrl(queryParams, hashParams, "code"),
    tokenHash: getParamFromAuthUrl(queryParams, hashParams, "token_hash"),
    type: getParamFromAuthUrl(queryParams, hashParams, "type"),
    errorCode: getParamFromAuthUrl(queryParams, hashParams, "error_code"),
    errorDescription: getParamFromAuthUrl(queryParams, hashParams, "error_description"),
  };
}

export async function completeAuthRedirect(url: string): Promise<CompletedAuthRedirect> {
  const client = requireSupabase();
  const params = parseAuthCallbackUrl(url);

  if (params.errorCode || params.errorDescription) {
    // Never re-throw errorDescription: it is URL text under the sender's control
    // (an attacker can craft a link with arbitrary error_description) and raw
    // GoTrue phrasing reads as jargon anyway. Classify into a closed code set.
    throw new AuthCallbackError(
      classifyAuthCallbackFailure(params.errorCode, params.errorDescription),
    );
  }

  if (params.code) {
    const { data, error } = await client.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw new AuthCallbackError(
        classifyAuthCallbackFailure((error as { code?: string }).code, error.message),
      );
    }

    return classifyAuthOutcome(params.type, Boolean(data.session));
  }

  const otpType = toEmailOtpType(params.type);
  if (params.tokenHash && otpType) {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: otpType,
    });
    if (error) {
      throw new AuthCallbackError(
        classifyAuthCallbackFailure((error as { code?: string }).code, error.message),
      );
    }

    return classifyAuthOutcome(otpType, Boolean(data.session));
  }

  // Only the PKCE `code` exchange and the `token_hash` OTP verification can establish
  // a session - both are single-use, server-minted values. The previous implicit-grant
  // branch accepted access_token/refresh_token straight from the callback URL, which an
  // attacker controls: a crafted link carrying the attacker's own tokens would silently
  // sign the victim into the ATTACKER's account (session fixation). The client is
  // configured flowType:'pkce' with detectSessionInUrl:false, so real email links arrive
  // as `code`/`token_hash` and never as `#access_token`.
  throw new AuthCallbackError("missing_params");
}

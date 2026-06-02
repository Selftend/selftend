import type { EmailOtpType } from "@supabase/supabase-js";

import { requireSupabase } from "@/src/lib/supabase";

const supportedEmailOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

interface ParsedAuthCallbackUrl {
  accessToken: string | null;
  refreshToken: string | null;
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
    accessToken: getParamFromAuthUrl(queryParams, hashParams, "access_token"),
    refreshToken: getParamFromAuthUrl(queryParams, hashParams, "refresh_token"),
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
    throw new Error(params.errorDescription ?? "Unable to complete the authentication link.");
  }

  if (params.code) {
    const { data, error } = await client.auth.exchangeCodeForSession(params.code);
    if (error) {
      throw error;
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
      throw error;
    }

    return classifyAuthOutcome(otpType, Boolean(data.session));
  }

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (error) {
      throw error;
    }

    return classifyAuthOutcome(params.type, Boolean(data.session));
  }

  throw new Error("The authentication link is missing the required parameters.");
}

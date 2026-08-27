// Closed union of user-facing auth-callback failure codes. The callback NEVER
// surfaces raw GoTrue messages or the URL's error_description - both read as
// jargon, and error_description is attacker-influenceable text (anyone can craft
// a link `.../auth-callback?error_description=<anything>`). Failures are
// classified into these codes and the screen maps each code to calm, translated
// copy (auth:callback.errors.<code>).

export const AUTH_CALLBACK_ERROR_CODES = [
  "expired_or_used",
  "cross_device",
  "missing_params",
  // A linkIdentity dance (#1445) that found the identity already on another
  // account - GoTrue's 422 `identity_already_exists`, arriving as error
  // params on the redirect back. The callback screen hands this one back to
  // the conversion form instead of rendering a failure card.
  "identity_exists",
  "generic",
] as const;

export type AuthCallbackErrorCode = (typeof AUTH_CALLBACK_ERROR_CODES)[number];

export class AuthCallbackError extends Error {
  readonly code: AuthCallbackErrorCode;

  constructor(code: AuthCallbackErrorCode) {
    // Stable, non-sensitive identifier for logs and tests only - never rendered.
    super(`auth-callback:${code}`);
    this.name = "AuthCallbackError";
    this.code = code;
  }
}

export function isAuthCallbackError(error: unknown): error is AuthCallbackError {
  return error instanceof AuthCallbackError;
}

// GoTrue error codes that mean "the link itself is spent": the OTP behind a
// token_hash link expired or was consumed, or the PKCE flow state backing a
// `code` link is gone/expired.
const EXPIRED_OR_USED_ERROR_CODES = new Set([
  "otp_expired",
  "flow_state_not_found",
  "flow_state_expired",
]);

/**
 * Classify a failure observed while completing an auth callback link.
 * Accepts the structured GoTrue error code when available (supabase-js
 * AuthError.code, or the URL's error_code param) plus the raw message, and
 * returns a code from the closed union above. The raw inputs are only ever
 * MATCHED against - they must not be re-thrown or rendered.
 */
export function classifyAuthCallbackFailure(
  errorCode: string | null | undefined,
  message: string | null | undefined,
): AuthCallbackErrorCode {
  const code = errorCode?.toLowerCase() ?? "";
  const text = message?.toLowerCase() ?? "";

  if (
    EXPIRED_OR_USED_ERROR_CODES.has(code) ||
    text.includes("invalid or has expired") ||
    text.includes("flow state")
  ) {
    return "expired_or_used";
  }

  // A PKCE `code` link opened in a browser that never stored the code verifier
  // (different browser/device than the one that requested the email).
  if (code === "bad_code_verifier" || text.includes("code verifier")) {
    return "cross_device";
  }

  // GoTrue's messages are "Identity is already linked to another user" /
  // "Identity is already linked" - matched loosely like the branches above.
  if (code === "identity_already_exists" || text.includes("identity is already linked")) {
    return "identity_exists";
  }

  return "generic";
}

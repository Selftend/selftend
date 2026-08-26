// Runtime-agnostic validation + email rendering for the send-feedback edge
// function. No Deno globals, so jest can unit-test it directly.

export interface FeedbackValidation {
  valid: boolean;
  trimmed: string;
  /** Sanitized category: control characters stripped, used for the email subject + body. */
  category: string;
}

const MAX_CATEGORY_LENGTH = 40;

// Drop ASCII control characters (codes < 32, plus DEL 127) so a category can't inject
// email headers (CR/LF) or break the subject line.
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code !== 127) out += ch;
  }
  return out;
}

// Category required (1..MAX chars, control chars stripped), message a string of
// 10-1000 trimmed chars.
export function validateFeedbackInput(category: unknown, message: unknown): FeedbackValidation {
  const trimmed = typeof message === "string" ? message.trim() : "";
  const rawCategory = typeof category === "string" ? category.trim() : "";
  const safeCategory = stripControlChars(rawCategory);
  const categoryValid = safeCategory.length > 0 && safeCategory.length <= MAX_CATEGORY_LENGTH;
  const valid = categoryValid && trimmed.length >= 10 && trimmed.length <= 1000;
  return { valid, trimmed, category: safeCategory };
}

// Deliberately simple (no exotic RFC forms): one @, no whitespace/control
// chars, a dot in the domain. It gates a Reply-To header, not deliverability.
const REPLY_TO_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_REPLY_TO_LENGTH = 254;

export interface ReplyToResolution {
  valid: boolean;
  /** The address the support email should carry as Reply-To (and "From:" line). */
  replyTo?: string;
}

/**
 * The reply-to guard (#1447): a REGISTERED caller's address always comes from
 * the JWT-resolved user - a client-supplied value is ignored, never an error,
 * so an out-of-date client cannot break their form. Only an anonymous caller
 * (guest, who has no email of their own) may supply one, optionally; a filled
 * but malformed value is invalid rather than silently dropped, because the
 * person typed it expecting a reply.
 */
export function resolveReplyTo(
  user: { email?: string | null; is_anonymous?: boolean },
  clientReplyTo: unknown,
): ReplyToResolution {
  if (user.is_anonymous !== true) {
    return { valid: true, replyTo: user.email ?? undefined };
  }
  if (clientReplyTo === undefined || clientReplyTo === null || clientReplyTo === "") {
    return { valid: true };
  }
  if (typeof clientReplyTo !== "string") return { valid: false };
  const trimmed = clientReplyTo.trim();
  if (trimmed === "") return { valid: true };
  if (trimmed.length > MAX_REPLY_TO_LENGTH || !REPLY_TO_PATTERN.test(trimmed)) {
    return { valid: false };
  }
  return { valid: true, replyTo: trimmed };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// User input is HTML-escaped before interpolation to prevent HTML/content injection
// into the support email.
//
// `fromLabel` names what the address IS: "From" for a JWT-resolved account
// email, and an explicit unverified label for a guest-typed reply-to (#1447) -
// anyone can type anyone's address into that field, so presenting it as the
// sender would invite support to trust an unproven identity.
export function buildFeedbackEmailHtml(
  rawCategory: string,
  rawTrimmed: string,
  rawFromEmail: string,
  rawFromLabel = "From",
): string {
  const category = escapeHtml(rawCategory);
  const trimmed = escapeHtml(rawTrimmed);
  const fromEmail = escapeHtml(rawFromEmail);
  const fromLabel = escapeHtml(rawFromLabel);
  return `<html>
  <body style="margin:0;padding:0;background-color:#f9f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f8fb;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;border:1px solid #dad8e2;padding:40px;max-width:480px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#221d2a;">Selftend feedback</p>
                <p style="margin:0 0 24px;font-size:13px;color:#9d99a8;">Category: ${category}</p>
                <p style="margin:0 0 24px;font-size:15px;color:#221d2a;white-space:pre-wrap;">${trimmed}</p>
                <p style="margin:0;font-size:13px;color:#9d99a8;">${fromLabel}: ${fromEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

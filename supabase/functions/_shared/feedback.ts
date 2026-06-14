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
export function buildFeedbackEmailHtml(
  rawCategory: string,
  rawTrimmed: string,
  rawFromEmail: string,
): string {
  const category = escapeHtml(rawCategory);
  const trimmed = escapeHtml(rawTrimmed);
  const fromEmail = escapeHtml(rawFromEmail);
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
                <p style="margin:0;font-size:13px;color:#9d99a8;">From: ${fromEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

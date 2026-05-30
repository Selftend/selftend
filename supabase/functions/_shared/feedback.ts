// Runtime-agnostic validation + email rendering for the send-feedback edge
// function. No Deno globals, so jest can unit-test it directly.

export interface FeedbackValidation {
  valid: boolean;
  trimmed: string;
}

// Mirrors the inline check in index.ts: category required, message a string of
// 10–1000 trimmed chars.
export function validateFeedbackInput(category: unknown, message: unknown): FeedbackValidation {
  const trimmed = typeof message === "string" ? message.trim() : "";
  const valid = Boolean(category) && trimmed.length >= 10 && trimmed.length <= 1000;
  return { valid, trimmed };
}

// NOTE: user input is interpolated WITHOUT HTML-escaping, mirroring current
// production behavior. The test documents this; do not silently change it here.
export function buildFeedbackEmailHtml(
  category: string,
  trimmed: string,
  fromEmail: string,
): string {
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

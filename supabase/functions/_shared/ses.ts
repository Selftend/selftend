// Signed AWS SES v2 SendEmail call (SigV4 via aws4fetch). Deno-runtime only: it
// uses the npm: aws4fetch import and WebCrypto, so it is never loaded by jest —
// the pure payload builder it delegates to (ses-email.ts) is unit-tested instead.
// Reusable across projects migrating off Resend (imdb-notifier, wikicanvas).
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { buildSesEmailPayload, type SendEmailParams } from "./ses-email.ts";

export type { SendEmailParams } from "./ses-email.ts";

export interface SesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  /** SES region, e.g. "eu-central-1". Used for both the endpoint host and SigV4. */
  region: string;
}

export async function sendEmail(config: SesConfig, params: SendEmailParams): Promise<void> {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    // SES signs under the "ses" service name; without this aws4fetch would infer
    // "email" from the email.<region>.amazonaws.com host and the signature would fail.
    service: "ses",
  });

  const response = await client.fetch(
    `https://email.${config.region}.amazonaws.com/v2/email/outbound-emails`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSesEmailPayload(params)),
    },
  );

  if (!response.ok) {
    // Surface SES's error body server-side; the caller returns a generic message.
    throw new Error(`SES error ${response.status}: ${await response.text()}`);
  }
}

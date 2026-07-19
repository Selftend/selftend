// Pure builder for the AWS SES v2 SendEmail (outbound-emails) request payload.
// No runtime globals or npm imports, so jest can unit-test it directly. The signed
// HTTP call that consumes this lives in ses.ts (Deno-only).

export interface SendEmailParams {
  /** RFC 5322 From value, e.g. "Selftend <noreply@send.selftend.org>". */
  from: string;
  to: string | string[];
  /** Optional Reply-To; omitted from the payload when absent. */
  replyTo?: string;
  subject: string;
  html: string;
}

export interface SesV2Payload {
  FromEmailAddress: string;
  Destination: { ToAddresses: string[] };
  ReplyToAddresses?: string[];
  Content: {
    Simple: {
      Subject: { Data: string; Charset: string };
      Body: { Html: { Data: string; Charset: string } };
    };
  };
}

export function buildSesEmailPayload(params: SendEmailParams): SesV2Payload {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
  const payload: SesV2Payload = {
    FromEmailAddress: params.from,
    Destination: { ToAddresses: toAddresses },
    Content: {
      Simple: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: { Html: { Data: params.html, Charset: "UTF-8" } },
      },
    },
  };
  // Omit Reply-To entirely when the caller has no address (e.g. an anonymous user),
  // rather than sending an empty array.
  if (params.replyTo) payload.ReplyToAddresses = [params.replyTo];
  return payload;
}

import { buildSesEmailPayload } from "./ses-email";

describe("buildSesEmailPayload", () => {
  it("builds a SES v2 Simple payload with UTF-8 charset and a Reply-To", () => {
    expect(
      buildSesEmailPayload({
        from: "Selftend <noreply@send.selftend.org>",
        to: "support@selftend.org",
        replyTo: "user@example.com",
        subject: "Selftend feedback [bug]",
        html: "<p>hi</p>",
      }),
    ).toEqual({
      FromEmailAddress: "Selftend <noreply@send.selftend.org>",
      Destination: { ToAddresses: ["support@selftend.org"] },
      ReplyToAddresses: ["user@example.com"],
      Content: {
        Simple: {
          Subject: { Data: "Selftend feedback [bug]", Charset: "UTF-8" },
          Body: { Html: { Data: "<p>hi</p>", Charset: "UTF-8" } },
        },
      },
    });
  });

  it("wraps a single recipient in an array and omits Reply-To when absent", () => {
    const payload = buildSesEmailPayload({
      from: "a@send.selftend.org",
      to: "b@selftend.org",
      subject: "s",
      html: "<p></p>",
    });
    expect(payload.Destination.ToAddresses).toEqual(["b@selftend.org"]);
    expect(payload.ReplyToAddresses).toBeUndefined();
  });

  it("passes an array of recipients through unchanged", () => {
    const payload = buildSesEmailPayload({
      from: "a@send.selftend.org",
      to: ["x@selftend.org", "y@selftend.org"],
      subject: "s",
      html: "<p></p>",
    });
    expect(payload.Destination.ToAddresses).toEqual(["x@selftend.org", "y@selftend.org"]);
  });
});

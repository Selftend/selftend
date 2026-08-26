import { buildFeedbackEmailHtml, resolveReplyTo, validateFeedbackInput } from "./feedback";

describe("validateFeedbackInput", () => {
  it("accepts a category with a 10-1000 char message and returns trimmed text + category", () => {
    expect(validateFeedbackInput("bug", "  this is long enough  ")).toEqual({
      valid: true,
      trimmed: "this is long enough",
      category: "bug",
    });
  });

  it("rejects a trimmed message shorter than 10 chars", () => {
    expect(validateFeedbackInput("bug", "  short  ").valid).toBe(false);
  });

  it("accepts exactly 10 chars and rejects 9", () => {
    expect(validateFeedbackInput("bug", "a".repeat(10)).valid).toBe(true);
    expect(validateFeedbackInput("bug", "a".repeat(9)).valid).toBe(false);
  });

  it("accepts exactly 1000 chars and rejects 1001", () => {
    expect(validateFeedbackInput("bug", "a".repeat(1000)).valid).toBe(true);
    expect(validateFeedbackInput("bug", "a".repeat(1001)).valid).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(validateFeedbackInput("", "a".repeat(20)).valid).toBe(false);
  });

  it("rejects a null category", () => {
    expect(validateFeedbackInput(null, "a".repeat(20)).valid).toBe(false);
  });

  it("rejects an over-long category (> 40 chars)", () => {
    expect(validateFeedbackInput("a".repeat(41), "a".repeat(20)).valid).toBe(false);
  });

  it("strips control characters from the category (Subject-header injection guard)", () => {
    const result = validateFeedbackInput("bug\r\nBcc: evil@x.com", "a".repeat(20));
    expect(result.category).toBe("bugBcc: evil@x.com");
  });

  it("coerces a non-string message to an empty (invalid) trim", () => {
    expect(validateFeedbackInput("bug", 123)).toEqual({
      valid: false,
      trimmed: "",
      category: "bug",
    });
  });
});

// #1447: the reply-to guard. A registered caller's address is the JWT-resolved
// one whatever the client sends; only an anonymous caller may supply an
// optional reply-to, and a filled-but-malformed one is an error, not a drop.
describe("resolveReplyTo", () => {
  const registered = { email: "person@example.com", is_anonymous: false };
  const guest = { email: null, is_anonymous: true };

  it("a registered caller keeps the JWT-resolved address", () => {
    expect(resolveReplyTo(registered, undefined)).toEqual({
      valid: true,
      replyTo: "person@example.com",
    });
  });

  it("a registered caller's client-supplied value is ignored, not an error", () => {
    expect(resolveReplyTo(registered, "spoof@evil.example")).toEqual({
      valid: true,
      replyTo: "person@example.com",
    });
  });

  it("a claimless caller (older token) counts as registered", () => {
    expect(resolveReplyTo({ email: "person@example.com" }, "spoof@evil.example")).toEqual({
      valid: true,
      replyTo: "person@example.com",
    });
  });

  it("a guest with no reply-to sends with none", () => {
    expect(resolveReplyTo(guest, undefined)).toEqual({ valid: true });
    expect(resolveReplyTo(guest, "")).toEqual({ valid: true });
    expect(resolveReplyTo(guest, "   ")).toEqual({ valid: true });
    expect(resolveReplyTo(guest, null)).toEqual({ valid: true });
  });

  it("a guest's valid reply-to is used, trimmed", () => {
    expect(resolveReplyTo(guest, "  reply@example.com  ")).toEqual({
      valid: true,
      replyTo: "reply@example.com",
    });
  });

  it("a guest's malformed reply-to is invalid", () => {
    expect(resolveReplyTo(guest, "not-an-email").valid).toBe(false);
    expect(resolveReplyTo(guest, "a@b").valid).toBe(false);
    expect(resolveReplyTo(guest, "two words@example.com").valid).toBe(false);
    expect(resolveReplyTo(guest, 42).valid).toBe(false);
  });

  it("a guest's header-injection attempt is invalid (CR/LF is whitespace)", () => {
    expect(resolveReplyTo(guest, "a@example.com\r\nBcc: evil@x.com").valid).toBe(false);
  });

  it("an over-long address is invalid", () => {
    expect(resolveReplyTo(guest, `${"a".repeat(250)}@example.com`).valid).toBe(false);
  });
});

describe("buildFeedbackEmailHtml", () => {
  it("interpolates category, message, and sender into the template", () => {
    const html = buildFeedbackEmailHtml("bug", "it broke", "user@example.com");
    expect(html).toContain("Category: bug");
    expect(html).toContain("it broke");
    expect(html).toContain("From: user@example.com");
  });

  // #1447: a guest-typed reply-to is anyone's address - the template must
  // present it under the caller-supplied unverified label, never as "From".
  it("labels a guest-supplied address as unverified rather than as the sender", () => {
    const html = buildFeedbackEmailHtml(
      "bug",
      "it broke",
      "reply@example.com",
      "Guest reply-to (unverified)",
    );
    expect(html).toContain("Guest reply-to (unverified): reply@example.com");
    expect(html).not.toContain("From: reply@example.com");
  });

  it("HTML-escapes user input to prevent injection into the email", () => {
    const html = buildFeedbackEmailHtml("bug", "<script>x</script>", "user@example.com");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});

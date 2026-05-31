import { buildFeedbackEmailHtml, validateFeedbackInput } from "./feedback";

describe("validateFeedbackInput", () => {
  it("accepts a category with a 10–1000 char message and returns trimmed text + category", () => {
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

describe("buildFeedbackEmailHtml", () => {
  it("interpolates category, message, and sender into the template", () => {
    const html = buildFeedbackEmailHtml("bug", "it broke", "user@example.com");
    expect(html).toContain("Category: bug");
    expect(html).toContain("it broke");
    expect(html).toContain("From: user@example.com");
  });

  it("HTML-escapes user input to prevent injection into the email", () => {
    const html = buildFeedbackEmailHtml("bug", "<script>x</script>", "user@example.com");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});

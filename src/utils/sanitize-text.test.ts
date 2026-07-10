import { sanitizeUserText } from "@/src/utils/sanitize-text";

describe("sanitizeUserText", () => {
  it("normalizes non-breaking spaces to regular spaces", () => {
    expect(sanitizeUserText("pasted\u00A0from\u00A0a\u00A0web\u00A0page")).toBe(
      "pasted from a web page",
    );
  });

  it("drops an unpaired high surrogate (emoji cut in half by truncation)", () => {
    expect(sanitizeUserText("ends mid-emoji \uD83D")).toBe("ends mid-emoji ");
  });

  it("drops an unpaired low surrogate", () => {
    expect(sanitizeUserText("\uDE00 starts with the tail half")).toBe(" starts with the tail half");
  });

  it("keeps real emoji (paired surrogates) intact", () => {
    expect(sanitizeUserText("felt calm today 😀🙏")).toBe("felt calm today 😀🙏");
  });

  it("handles mixed corruption in one string", () => {
    expect(sanitizeUserText("a b\uD800c\uDC00d😀")).toBe("a bcd😀");
  });

  it("leaves ordinary multiline text untouched", () => {
    const text = "First line.\nSecond line with punctuation, quotes \"and\" 'apostrophes'.";
    expect(sanitizeUserText(text)).toBe(text);
  });

  it("strips zero-width spaces and BOMs (invisible paste artifacts)", () => {
    expect(sanitizeUserText("\uFEFFzero\u200Bwidth\u200Bspace")).toBe("zerowidthspace");
  });

  it("keeps ZWJ emoji sequences and ZWNJ intact", () => {
    // Family emoji is four code points glued by U+200D - stripping ZWJ would
    // shatter it into separate faces.
    const text = "family \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 and zwnj\u200Cjoin";
    expect(sanitizeUserText(text)).toBe(text);
  });

  it("strips C0 control characters except tab and newline", () => {
    expect(sanitizeUserText("a\u0000b\u0007c\u0001d\u001Fe\u007Ff")).toBe("abcdef");
    expect(sanitizeUserText("keeps\ttabs\nand newlines")).toBe("keeps\ttabs\nand newlines");
  });

  it("normalizes Windows line endings instead of gluing lines together", () => {
    expect(sanitizeUserText("line one\r\nline two\rrest")).toBe("line one\nline tworest");
  });
});

import { formatOneDecimal, makeLocaleFormats } from "@/src/lib/locale-format";

const SAMPLE = "2026-07-02T14:30:00Z";

describe("makeLocaleFormats", () => {
  it("formats dates per language", () => {
    const en = makeLocaleFormats("en");
    const bg = makeLocaleFormats("bg");
    expect(en.formatDate(SAMPLE)).toMatch(/Jul/);
    expect(bg.formatDate(SAMPLE)).not.toMatch(/Jul/);
    expect(bg.formatDate(SAMPLE)).toMatch(/юли|07|7/);
  });

  it("formats date-times with a time component", () => {
    const en = makeLocaleFormats("en");
    expect(en.formatDateTime(SAMPLE)).toMatch(/\d{1,2}:\d{2}/);
  });

  it("accepts Date and epoch inputs", () => {
    const en = makeLocaleFormats("en");
    expect(en.formatDate(new Date(SAMPLE))).toEqual(en.formatDate(SAMPLE));
    expect(en.formatDate(new Date(SAMPLE).getTime())).toEqual(en.formatDate(SAMPLE));
  });

  it("exposes the one-decimal formatter bound to the language", () => {
    expect(makeLocaleFormats("en").formatOneDecimal(3)).toBe("3.0");
    expect(makeLocaleFormats("bg").formatOneDecimal(3)).toBe("3,0");
  });
});

describe("formatOneDecimal", () => {
  it("uses the language's decimal separator", () => {
    expect(formatOneDecimal(7.85, "en")).toBe("7.9");
    expect(formatOneDecimal(7.85, "bg")).toBe("7,9");
  });

  it("keeps the trailing zero the old toFixed(1) sites printed", () => {
    expect(formatOneDecimal(3, "en")).toBe("3.0");
    expect(formatOneDecimal(3, "bg")).toBe("3,0");
  });
});

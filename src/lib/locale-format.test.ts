import { makeLocaleFormats } from "@/src/lib/locale-format";

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
});

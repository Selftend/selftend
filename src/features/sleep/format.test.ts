import { formatCompactHours, formatDuration, formatHours } from "@/src/features/sleep/format";
import bgCommon from "@/src/i18n/locales/bg/common.json";
import enCommon from "@/src/i18n/locales/en/common.json";
import { bundleTranslator } from "@/test/bundle-translator";

// Resolved against the shipped bundles, so a template added to en and forgotten in bg
// fails here rather than shipping.
const en = bundleTranslator("common", enCommon);
const bg = bundleTranslator("common", bgCommon);

describe("formatDuration", () => {
  it("keeps the shipped English compact form", () => {
    expect(formatDuration(450, en)).toBe("7h 30m");
    expect(formatDuration(480, en)).toBe("8h");
  });

  it("translates both units in Bulgarian", () => {
    expect(formatDuration(450, bg)).toBe("7 ч 30 мин");
    expect(formatDuration(480, bg)).toBe("8 ч");
  });

  it("drops the minutes clause only on an exact hour", () => {
    expect(formatDuration(60, en)).toBe("1h");
    expect(formatDuration(61, en)).toBe("1h 1m");
  });
});

describe("formatHours", () => {
  it("keeps the shipped English rendering", () => {
    expect(formatHours(432, "en", en)).toBe("7.2h");
  });

  it("uses a comma separator and a translated unit in Bulgarian", () => {
    expect(formatHours(432, "bg", bg)).toBe("7,2 ч");
  });

  it("prints the trailing zero rather than a bare integer", () => {
    expect(formatHours(420, "en", en)).toBe("7.0h");
    expect(formatHours(420, "bg", bg)).toBe("7,0 ч");
  });

  it("still renders the shared dash placeholder for no data", () => {
    expect(formatHours(null, "en", en)).toBe("-");
    expect(formatHours(null, "bg", bg)).toBe("-");
  });
});

describe("formatCompactHours", () => {
  // Unchanged by #962 — pinned here so the chart path's deliberately different contract
  // (no trailing zero, caller owns the unit) is not "tidied" into formatHours later.
  it("drops a trailing zero and returns a bare number", () => {
    expect(formatCompactHours(420, "en")).toBe("7");
    expect(formatCompactHours(450, "bg")).toBe("7,5");
  });
});

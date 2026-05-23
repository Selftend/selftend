import i18n from "@/src/i18n";
import enHelp from "@/src/i18n/locales/en/help.json";
import bgHelp from "@/src/i18n/locales/bg/help.json";
import { HELP_CONTENT, HELP_KEYS } from "@/src/features/help/help-content";

describe("HELP_CONTENT", () => {
  it("has an entry for every help key", () => {
    for (const key of HELP_KEYS) {
      expect(HELP_CONTENT[key]).toBeDefined();
    }
  });

  it("resolves every referenced i18n key in English", () => {
    for (const key of HELP_KEYS) {
      const entry = HELP_CONTENT[key];
      for (const i18nKey of [entry.titleKey, entry.whatKey, entry.howKey, entry.whyKey]) {
        const value = i18n.t(i18nKey, { ns: "help" });
        expect(value).not.toBe(i18nKey);
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the Bulgarian help namespace at parity with English", () => {
    const enKeys = Object.keys(enHelp).sort();
    const bgKeys = Object.keys(bgHelp).sort();
    expect(bgKeys).toEqual(enKeys);
    for (const key of HELP_KEYS) {
      const bgEntry = (bgHelp as Record<string, Record<string, string>>)[key];
      for (const field of ["title", "what", "how", "why"]) {
        expect(bgEntry?.[field]?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});

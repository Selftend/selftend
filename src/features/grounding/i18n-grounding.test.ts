import en from "@/src/i18n/locales/en/cbt.json";
import bg from "@/src/i18n/locales/bg/cbt.json";

const SLUGS = ["54321", "cold-water", "feet-floor"] as const;

describe("grounding i18n additions", () => {
  for (const locale of [
    { name: "en", data: en },
    { name: "bg", data: bg },
  ]) {
    describe(locale.name, () => {
      const g = (locale.data as Record<string, any>).grounding;

      it("has stepCounter and meta plural keys", () => {
        expect(typeof g.stepCounter).toBe("string");
        expect(typeof g.meta.senses_one).toBe("string");
        expect(typeof g.meta.senses_other).toBe("string");
        expect(typeof g.meta.guided_one).toBe("string");
        expect(typeof g.meta.guided_other).toBe("string");
      });

      it.each(SLUGS)("has stepLabels aligned with steps for %s", (slug) => {
        const tech = g.techniques[slug];
        expect(Array.isArray(tech.stepLabels)).toBe(true);
        expect(tech.stepLabels).toHaveLength(tech.steps.length);
      });

      // The hint line under each prompt (design 5b, #874) — index-aligned so a
      // missing hint can't silently shift the rest.
      it.each(SLUGS)("has stepHints aligned with steps for %s", (slug) => {
        const tech = g.techniques[slug];
        expect(Array.isArray(tech.stepHints)).toBe(true);
        expect(tech.stepHints).toHaveLength(tech.steps.length);
      });
    });
  }
});

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

      // The cold-water caution (#1996, shape ruled on #1985): two lines at
      // most, the stop rule first and the who-should-check line second. It is
      // the first technique-level caution in the app, so the shape is pinned
      // here for the DBT physical skills to reuse. A caution is a technique's
      // own line, not a shared one — the other two techniques carry none, which
      // is what keeps the "no caution" branch in the session real.
      it("carries a two-line caution on cold-water and none on the others", () => {
        const caution = g.techniques["cold-water"].caution;
        expect(Array.isArray(caution)).toBe(true);
        expect(caution).toHaveLength(2);
        for (const line of caution) {
          expect(typeof line).toBe("string");
          expect(line.trim().length).toBeGreaterThan(0);
        }
        expect(g.techniques["54321"].caution).toBeUndefined();
        expect(g.techniques["feet-floor"].caution).toBeUndefined();
      });
    });
  }
});

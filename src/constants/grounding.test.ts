import en from "@/src/i18n/locales/en/cbt.json";
import bg from "@/src/i18n/locales/bg/cbt.json";
import { groundingTechniques, groundingSlugs } from "@/src/constants/grounding";

describe("grounding technique config", () => {
  it("keeps the three slugs in order", () => {
    expect(groundingSlugs).toEqual(["54321", "cold-water", "feet-floor"]);
  });

  it.each(groundingTechniques)(
    "aligns config step count with i18n steps + labels for $slug",
    (tech) => {
      const e = (en as Record<string, any>).grounding.techniques[tech.slug];
      const b = (bg as Record<string, any>).grounding.techniques[tech.slug];
      expect(tech.steps.length).toBe(e.steps.length);
      expect(tech.steps.length).toBe(e.stepLabels.length);
      expect(tech.steps.length).toBe(b.steps.length);
      expect(tech.steps.length).toBe(b.stepLabels.length);
    },
  );

  it("gives every technique and step an icon and hue", () => {
    for (const tech of groundingTechniques) {
      expect(tech.icon).toBeTruthy();
      expect(tech.hue).toBeTruthy();
      for (const step of tech.steps) {
        expect(step.icon).toBeTruthy();
        expect(step.hue).toBeTruthy();
      }
    }
  });
});

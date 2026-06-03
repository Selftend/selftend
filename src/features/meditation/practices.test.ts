import { MEDITATION_PRACTICES, practicesLookup, suggestedDuration } from "./practices";

describe("meditation practices", () => {
  it("exposes the 4 seated practices (no walking/eating)", () => {
    expect(MEDITATION_PRACTICES.map((p) => p.slug)).toEqual([
      "breath-awareness",
      "body-scan",
      "loving-kindness",
      "observing-thoughts",
    ]);
  });

  it("builds a lookup keyed by slug", () => {
    expect(practicesLookup["body-scan"].icon).toBe("accessibility-new");
    expect(practicesLookup["mindful-walking"]).toBeUndefined();
  });

  it("suggests the middle duration", () => {
    expect(suggestedDuration({ slug: "x", durations: [3, 5, 10], icon: "air", hue: "mist" })).toBe(
      5,
    );
    expect(suggestedDuration({ slug: "y", durations: [5, 10], icon: "air", hue: "mist" })).toBe(10);
  });
});

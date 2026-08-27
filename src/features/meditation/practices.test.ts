import { MEDITATION_PRACTICES, practicesLookup, suggestedDuration } from "./practices";

describe("meditation practices", () => {
  it("exposes the 6 practices, seated and off-cushion", () => {
    expect(MEDITATION_PRACTICES.map((p) => p.slug)).toEqual([
      "breath-awareness",
      "body-scan",
      "loving-kindness",
      "observing-thoughts",
      "mindful-walking",
      "mindful-eating",
    ]);
  });

  it("builds a lookup keyed by slug", () => {
    expect(practicesLookup["body-scan"].icon).toBe("accessibility-new");
    expect(practicesLookup["mindful-walking"].icon).toBe("directions-walk");
  });

  it("suggests the middle duration", () => {
    expect(suggestedDuration({ slug: "x", durations: [3, 5, 10], icon: "air", hue: "mist" })).toBe(
      5,
    );
    expect(suggestedDuration({ slug: "y", durations: [5, 10], icon: "air", hue: "mist" })).toBe(10);
  });
});

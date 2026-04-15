import { distortionDefinitions } from "@/src/constants/distortions";

describe("distortion definitions", () => {
  it("uses unique keys", () => {
    const keys = distortionDefinitions.map((distortion) => distortion.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the list focused", () => {
    expect(distortionDefinitions.length).toBeGreaterThanOrEqual(8);
  });
});

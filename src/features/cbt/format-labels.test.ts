import { formatDistortionLabels, formatEmotionLabels } from "./format-labels";

const fakeT = (key: string, fallback: string): string => {
  const table: Record<string, string> = {
    "emotions.anxious": "Anxious",
    "emotions.sad": "Sad",
    "distortions.mind-reading.title": "Mind reading",
  };
  return table[key] ?? fallback;
};

describe("formatEmotionLabels", () => {
  it("maps slugs to display labels", () => {
    expect(formatEmotionLabels(["anxious", "sad"], fakeT)).toBe("Anxious, Sad");
  });

  it("passes unknown values through unchanged", () => {
    expect(formatEmotionLabels(["anxious", "my own words"], fakeT)).toBe("Anxious, my own words");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatEmotionLabels([], fakeT)).toBe("");
  });
});

describe("formatDistortionLabels", () => {
  it("maps distortion slugs to their titles", () => {
    expect(formatDistortionLabels(["mind-reading"], fakeT)).toBe("Mind reading");
  });
});

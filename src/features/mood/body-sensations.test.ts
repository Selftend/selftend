import { parseBodyChips, toggleBodyChip } from "@/src/features/mood/body-sensations";

describe("body-sensations helpers", () => {
  it("parses a comma-separated string into trimmed, non-empty labels", () => {
    expect(parseBodyChips("Shoulders, Jaw ,, Chest tight")).toEqual([
      "Shoulders",
      "Jaw",
      "Chest tight",
    ]);
    expect(parseBodyChips("")).toEqual([]);
  });

  it("adds a label when absent and removes it when present", () => {
    expect(toggleBodyChip("", "Jaw")).toBe("Jaw");
    expect(toggleBodyChip("Jaw", "Shoulders")).toBe("Jaw, Shoulders");
    expect(toggleBodyChip("Jaw, Shoulders", "Jaw")).toBe("Shoulders");
  });
});

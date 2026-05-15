import {
  GRATITUDE_ITEM_COUNT,
  GRATITUDE_ITEM_MAX,
  GRATITUDE_NOTE_MAX,
  gratitudeEntrySchema,
} from "@/src/features/gratitude/schemas";

describe("gratitudeEntrySchema", () => {
  it("accepts one gratitude item with no note", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: ["Warm coffee"],
      note: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts up to three gratitude items", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: ["Coffee", "Sunlight", "A quiet walk"],
      note: "Small things helped.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty item list", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: [],
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only items", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: ["   \n\t "],
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than three items", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: Array.from({ length: GRATITUDE_ITEM_COUNT + 1 }, (_, index) => `Item ${index}`),
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong item", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: ["x".repeat(GRATITUDE_ITEM_MAX + 1)],
      note: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong note", () => {
    const result = gratitudeEntrySchema.safeParse({
      items: ["A kind message"],
      note: "x".repeat(GRATITUDE_NOTE_MAX + 1),
    });
    expect(result.success).toBe(false);
  });
});

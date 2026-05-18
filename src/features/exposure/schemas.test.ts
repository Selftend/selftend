import {
  exposureHierarchyFormSchema,
  exposureItemSchema,
  exposureSessionFormSchema,
} from "@/src/features/exposure/schemas";

describe("exposureItemSchema", () => {
  it("accepts a valid item", () => {
    expect(
      exposureItemSchema.safeParse({ description: "Sit in car", sudsRating: 30 }).success,
    ).toBe(true);
  });

  it("rejects description shorter than 3 chars", () => {
    expect(exposureItemSchema.safeParse({ description: "ab", sudsRating: 30 }).success).toBe(false);
  });

  it("rejects suds outside 0-100", () => {
    expect(exposureItemSchema.safeParse({ description: "ok", sudsRating: -1 }).success).toBe(false);
    expect(exposureItemSchema.safeParse({ description: "ok", sudsRating: 101 }).success).toBe(
      false,
    );
  });
});

describe("exposureHierarchyFormSchema", () => {
  const base = {
    title: "Driving",
    anxietyType: "phobia",
    items: [{ description: "Sit in car", sudsRating: 30 }],
  };

  it("accepts a hierarchy with at least one item", () => {
    expect(exposureHierarchyFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty items list", () => {
    expect(exposureHierarchyFormSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("rejects a short title", () => {
    expect(exposureHierarchyFormSchema.safeParse({ ...base, title: "ab" }).success).toBe(false);
  });

  it("rejects a short anxiety type", () => {
    expect(exposureHierarchyFormSchema.safeParse({ ...base, anxietyType: "a" }).success).toBe(
      false,
    );
  });
});

describe("exposureSessionFormSchema", () => {
  const base = {
    preSuds: 60,
    postSuds: 30,
    durationMinutes: 15,
    safetyBehaviorsUsed: false,
    safetyBehaviorDescription: "",
    notes: "",
  };

  it("accepts a valid session", () => {
    expect(exposureSessionFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects negative duration", () => {
    expect(exposureSessionFormSchema.safeParse({ ...base, durationMinutes: -1 }).success).toBe(
      false,
    );
  });

  it("rejects suds outside 0-100", () => {
    expect(exposureSessionFormSchema.safeParse({ ...base, preSuds: 101 }).success).toBe(false);
    expect(exposureSessionFormSchema.safeParse({ ...base, postSuds: -1 }).success).toBe(false);
  });
});

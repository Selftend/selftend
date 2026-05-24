import { personalValuesList } from "@/src/constants/personal-values-list";

describe("personalValuesList", () => {
  it("contains the 38 Think CBT Workbook values", () => {
    expect(personalValuesList).toHaveLength(38);
  });

  it("uses unique keys", () => {
    const keys = personalValuesList.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes workbook-specific keys and drops the old curated ones", () => {
    const keys = personalValuesList.map((v) => v.key);
    expect(keys).toEqual(
      expect.arrayContaining(["assertive", "humour", "trusted", "emotionally-aware"]),
    );
    expect(keys).not.toContain("balanced");
    expect(keys).not.toContain("committed");
  });
});

import { TODAY_STAT_CATALOG } from "@/src/features/widgets/today-stat-catalog";
describe("today stat catalog", () => {
  it("has 8 unique stats with label keys", () => {
    expect(TODAY_STAT_CATALOG).toHaveLength(8);
    expect(new Set(TODAY_STAT_CATALOG.map((s) => s.key)).size).toBe(8);
    for (const s of TODAY_STAT_CATALOG) {
      expect(s.labelKey).toMatch(/^home\.widgets\.today\./);
      expect(s.emoji).toBeTruthy();
    }
  });
});

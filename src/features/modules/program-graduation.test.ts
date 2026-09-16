import { isGraduated } from "@/src/features/modules/program-graduation";

describe("isGraduated", () => {
  it("is false with no run in progress", () => {
    expect(isGraduated(null, null)).toBe(false);
    expect(isGraduated(null, "2026-01-01T00:00:00.000Z")).toBe(false);
    expect(isGraduated(undefined, undefined)).toBe(false);
  });

  it("is false for a run that has started and not finished", () => {
    expect(isGraduated("2026-01-01T00:00:00.000Z", null)).toBe(false);
  });

  it("is true when the completion belongs to the current run", () => {
    expect(isGraduated("2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")).toBe(true);
  });

  /**
   * ☠️ The case the whole function exists for. Before ADR-0012 every writer
   * nulled `completedAt`, so `completedAt != null` was a safe test. Now a
   * completion outlives the run that earned it, and a fresh start must retire
   * it - otherwise someone who finished CBT last year opens a brand-new run and
   * the app congratulates them on finishing it.
   */
  it("is false when the completion predates the current run", () => {
    expect(isGraduated("2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("is true when a run is completed at the instant it started", () => {
    const sameInstant = "2026-01-01T00:00:00.000Z";
    expect(isGraduated(sameInstant, sameInstant)).toBe(true);
  });

  it("reads a corrupt timestamp as not graduated rather than graduated", () => {
    expect(isGraduated("2026-01-01T00:00:00.000Z", "not a date")).toBe(false);
    expect(isGraduated("not a date", "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("compares instants rather than strings, across timezone offsets", () => {
    // The same moment, written two ways: a lexicographic compare would get this
    // wrong, because "2026-01-01T00:30:00+01:00" sorts after "2026-01-01T00:00:00Z".
    expect(isGraduated("2026-01-01T00:00:00.000Z", "2026-01-01T00:30:00.000+01:00")).toBe(false);
  });
});

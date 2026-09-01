import { isConcernKey, resolveConcernWidgetIds } from "@/src/features/onboarding/concerns";

describe("resolveConcernWidgetIds", () => {
  it("returns no widgets when nothing is picked", () => {
    expect(resolveConcernWidgetIds([])).toEqual([]);
  });

  it("preserves picked-concern and tool priority order", () => {
    const result = resolveConcernWidgetIds(["sleep", "habits"]);
    expect(result.slice(0, 3)).toEqual(["sleep-latest", "meditation-pick", "breathing-suggested"]);
    expect(result).toContain("habits-today");
  });

  it("dedupes widgets shared between concerns", () => {
    const result = resolveConcernWidgetIds(["anxious-thoughts", "stress-overwhelm"]);
    expect(result.filter((id) => id === "breathing-suggested")).toHaveLength(1);
  });

  it("does not append unrelated tools or module-specific exercises", () => {
    const result = resolveConcernWidgetIds(["low-mood"]);
    expect(result).toEqual(["mood-checkin", "gratitude-latest", "habits-today"]);
    expect(result).not.toContain("cbt-open-record");
    expect(result).not.toContain("act-drop-anchor");
  });

  it("ignores unknown keys", () => {
    expect(resolveConcernWidgetIds(["not-a-concern"])).toEqual([]);
  });
});

describe("concern metadata", () => {
  it("isConcernKey narrows correctly", () => {
    expect(isConcernKey("sleep")).toBe(true);
    expect(isConcernKey("nope")).toBe(false);
    expect(isConcernKey(3)).toBe(false);
  });
});

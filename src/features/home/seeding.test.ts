import { DEFAULT_WIDGET_IDS, resolveInitialWidgetIds } from "@/src/features/home/seeding";

describe("resolveInitialWidgetIds", () => {
  it("returns the default set when there are no plan items", () => {
    expect(resolveInitialWidgetIds([])).toEqual(DEFAULT_WIDGET_IDS);
  });

  it("maps plan-item toolIds to widget IDs, preserving order", () => {
    const result = resolveInitialWidgetIds([
      { toolId: "journal", order: 0 },
      { toolId: "breathing", order: 1 },
    ]);
    expect(result).toEqual(["journal-latest", "breathing-suggested"]);
  });

  it("drops the legacy mood plan-item (mood-checkin is pinned, not a row) by mapping to mood-trend", () => {
    expect(resolveInitialWidgetIds([{ toolId: "mood", order: 0 }])).toEqual(["mood-trend"]);
  });

  it("dedupes when two plan items map to the same widget id", () => {
    expect(
      resolveInitialWidgetIds([
        { toolId: "cbt", order: 0 },
        { toolId: "module-cbt", order: 1 },
      ]),
    ).toEqual(["cbt-open-record"]);
  });

  it("drops unknown toolIds", () => {
    expect(resolveInitialWidgetIds([{ toolId: "totally-unknown", order: 0 }])).toEqual([]);
  });

  it("never includes the pinned mood-checkin in the seeded rows", () => {
    expect(DEFAULT_WIDGET_IDS).not.toContain("mood-checkin");
    expect(resolveInitialWidgetIds([{ toolId: "mood", order: 0 }])).not.toContain("mood-checkin");
  });

  it("default set includes the phase-1 default widgets", () => {
    for (const id of [
      "cbt-open-record",
      "act-values",
      "mindfulness-anchor",
      "grounding-54321",
      "sleep-last-night",
      "sleep-7-nights",
    ]) {
      expect(DEFAULT_WIDGET_IDS).toContain(id);
    }
    expect(DEFAULT_WIDGET_IDS).toHaveLength(12);
  });
});

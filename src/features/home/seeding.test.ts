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
    expect(result).toEqual(["journal-week", "breathing-suggested"]);
  });

  it("maps the legacy mood plan-item to mood-trend", () => {
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

  it("seeds the daily check-in as a normal default widget", () => {
    expect(DEFAULT_WIDGET_IDS).toContain("mood-checkin");
  });

  it("default set includes the phase-1 default widgets", () => {
    for (const id of ["cbt-open-record", "act-drop-anchor", "sleep-latest"]) {
      expect(DEFAULT_WIDGET_IDS).toContain(id);
    }
    expect(DEFAULT_WIDGET_IDS).not.toContain("act-values");
    expect(DEFAULT_WIDGET_IDS).not.toContain("sleep-last-night");
    expect(DEFAULT_WIDGET_IDS).not.toContain("sleep-7-nights");
    expect(DEFAULT_WIDGET_IDS).toHaveLength(10);
  });

  it("no longer seeds the 5-4-3-2-1 grounding widget by default", () => {
    expect(DEFAULT_WIDGET_IDS).not.toContain("grounding-54321");
  });
});

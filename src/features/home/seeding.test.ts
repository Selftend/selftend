import { resolveInitialWidgetIds } from "@/src/features/home/seeding";

describe("resolveInitialWidgetIds", () => {
  it("returns no widgets when there are no explicit plan items", () => {
    expect(resolveInitialWidgetIds([])).toEqual([]);
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
});

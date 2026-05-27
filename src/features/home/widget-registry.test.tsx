import {
  WIDGET_META,
  WIDGET_REGISTRY,
  PINNED_WIDGET_ID,
  isImplemented,
  metaForWidget,
  spanForWidget,
  clampSpan,
} from "@/src/features/home/widget-registry";

describe("widget registry", () => {
  it("exposes the pinned mood-checkin meta", () => {
    expect(PINNED_WIDGET_ID).toBe("mood-checkin");
    expect(WIDGET_META["mood-checkin"]).toBeDefined();
    expect(WIDGET_META["mood-checkin"].status).toBe("default");
  });

  it("every implemented widget has metadata", () => {
    for (const id of Object.keys(WIDGET_REGISTRY)) {
      expect(WIDGET_META[id]).toBeDefined();
    }
  });

  it("isImplemented reflects registry membership", () => {
    expect(isImplemented("mood-trend")).toBe(true);
    expect(isImplemented("cbt-open-record")).toBe(true);
    expect(isImplemented("not-a-widget")).toBe(false);
  });

  it("registers cbt-recent-records as an available widget", () => {
    expect(isImplemented("cbt-recent-records")).toBe(true);
    expect(WIDGET_META["cbt-recent-records"].status).toBe("available");
    expect(WIDGET_META["cbt-recent-records"].toolKey).toBe("cbt");
  });

  it("registers cbt-distortion-patterns as an available widget", () => {
    expect(isImplemented("cbt-distortion-patterns")).toBe(true);
    expect(WIDGET_META["cbt-distortion-patterns"].status).toBe("available");
    expect(WIDGET_META["cbt-distortion-patterns"].toolKey).toBe("cbt");
  });

  it("registers cbt-distortion-guide as an available widget", () => {
    expect(isImplemented("cbt-distortion-guide")).toBe(true);
    expect(WIDGET_META["cbt-distortion-guide"].status).toBe("available");
    expect(WIDGET_META["cbt-distortion-guide"].toolKey).toBe("cbt");
  });

  it("registers cbt-programme as an available widget", () => {
    expect(isImplemented("cbt-programme")).toBe(true);
    expect(WIDGET_META["cbt-programme"].status).toBe("available");
    expect(WIDGET_META["cbt-programme"].toolKey).toBe("cbt");
  });

  it("registers act-committed-actions as an available widget", () => {
    expect(isImplemented("act-committed-actions")).toBe(true);
    expect(WIDGET_META["act-committed-actions"].status).toBe("available");
    expect(WIDGET_META["act-committed-actions"].toolKey).toBe("act");
  });

  it("registers act-defusion as an available widget", () => {
    expect(isImplemented("act-defusion")).toBe(true);
    expect(WIDGET_META["act-defusion"].status).toBe("available");
    expect(WIDGET_META["act-defusion"].toolKey).toBe("act");
  });

  it("registers act-programme as an available widget", () => {
    expect(isImplemented("act-programme")).toBe(true);
    expect(WIDGET_META["act-programme"].status).toBe("available");
    expect(WIDGET_META["act-programme"].toolKey).toBe("act");
  });

  it("registers act-acceptance-prompt as an available widget", () => {
    expect(isImplemented("act-acceptance-prompt")).toBe(true);
    expect(WIDGET_META["act-acceptance-prompt"].status).toBe("available");
    expect(WIDGET_META["act-acceptance-prompt"].toolKey).toBe("act");
  });

  it("registers journal-week as an available widget", () => {
    expect(isImplemented("journal-week")).toBe(true);
    expect(WIDGET_META["journal-week"].status).toBe("available");
    expect(WIDGET_META["journal-week"].toolKey).toBe("journal");
  });

  it("registers journal-prompt as an available widget", () => {
    expect(isImplemented("journal-prompt")).toBe(true);
    expect(WIDGET_META["journal-prompt"].status).toBe("available");
    expect(WIDGET_META["journal-prompt"].toolKey).toBe("journal");
  });

  it("registers journal-resurface as an available widget", () => {
    expect(isImplemented("journal-resurface")).toBe(true);
    expect(WIDGET_META["journal-resurface"].status).toBe("available");
    expect(WIDGET_META["journal-resurface"].toolKey).toBe("journal");
  });

  it.each([
    ["breathing-library", "breathing"],
    ["breathing-log", "breathing"],
    ["mindfulness-library", "mindfulness"],
    ["mindfulness-log", "mindfulness"],
    ["grounding-library", "grounding"],
    ["grounding-log", "grounding"],
  ])("registers %s as an available practice-tool widget", (id, toolKey) => {
    expect(isImplemented(id)).toBe(true);
    expect(WIDGET_META[id].status).toBe("available");
    expect(WIDGET_META[id].toolKey).toBe(toolKey);
  });

  it.each([
    ["gratitude-week", "gratitude"],
    ["gratitude-resurface", "gratitude"],
    ["gratitude-prompt", "gratitude"],
    ["meditation-sit-time", "meditation"],
    ["meditation-continue", "meditation"],
    ["sleep-notes", "sleep"],
    ["sleep-wind-down", "sleep"],
    ["habits-quiet", "habits"],
    ["habits-one-deep", "habits"],
  ])("registers %s as an available tracker/reflection widget", (id, toolKey) => {
    expect(isImplemented(id)).toBe(true);
    expect(WIDGET_META[id].status).toBe("available");
    expect(WIDGET_META[id].toolKey).toBe(toolKey);
  });

  it.each([
    "composite-paragraph",
    "composite-pickup",
    "composite-quiet-week",
    "composite-from-past",
    "composite-safety",
  ])("registers %s as a composite widget", (id) => {
    expect(isImplemented(id)).toBe(true);
    expect(WIDGET_META[id].status).toBe("composite");
    expect(WIDGET_META[id].toolKey).toBe("composite");
  });

  it("metaForWidget returns undefined for unknown ids", () => {
    expect(metaForWidget("nope")).toBeUndefined();
  });

  it("default widgets all carry a tint and a category", () => {
    for (const [id, meta] of Object.entries(WIDGET_META)) {
      expect({ id, tint: meta.tint }).toMatchObject({ tint: expect.any(String) });
      expect({ id, toolKey: meta.toolKey }).toMatchObject({ toolKey: expect.any(String) });
    }
  });

  it("spanForWidget returns the widget's declared span", () => {
    expect(spanForWidget("mood-trend")).toEqual({ colSpan: 1, rowSpan: 1 });
    expect(spanForWidget("journal-latest")).toEqual({ colSpan: 1, rowSpan: 1 });
  });

  it("spanForWidget defaults to 1x1 for unknown widgets", () => {
    expect(spanForWidget("nonexistent")).toEqual({ colSpan: 1, rowSpan: 1 });
  });

  it("clampSpan caps colSpan to the column count, leaves rowSpan", () => {
    expect(clampSpan({ colSpan: 2, rowSpan: 2 }, 1)).toEqual({ colSpan: 1, rowSpan: 2 });
    expect(clampSpan({ colSpan: 2, rowSpan: 1 }, 3)).toEqual({ colSpan: 2, rowSpan: 1 });
  });

  it("every widget meta declares a span", () => {
    for (const [id, meta] of Object.entries(WIDGET_META)) {
      expect({ id, span: meta.span }).toMatchObject({
        span: {
          colSpan: expect.any(Number),
          rowSpan: expect.any(Number),
        },
      });
    }
  });
});

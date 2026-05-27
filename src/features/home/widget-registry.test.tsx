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

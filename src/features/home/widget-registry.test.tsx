import {
  WIDGET_META,
  WIDGET_REGISTRY,
  PINNED_WIDGET_ID,
  isImplemented,
  metaForWidget,
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
    expect(isImplemented("cbt-open-record")).toBe(false);
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
});

import {
  WIDGET_META,
  WIDGET_REGISTRY,
  isImplemented,
  metaForWidget,
} from "@/src/features/home/widget-registry";

describe("widget registry", () => {
  it("exposes the daily check-in (mood-checkin) meta", () => {
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

  it("no longer registers the removed journal widgets", () => {
    expect(isImplemented("journal-latest")).toBe(false);
    expect(isImplemented("journal-prompt")).toBe(false);
    expect(isImplemented("journal-resurface")).toBe(false);
    expect(WIDGET_META["journal-latest"]).toBeUndefined();
    expect(WIDGET_META["journal-prompt"]).toBeUndefined();
    expect(WIDGET_META["journal-resurface"]).toBeUndefined();
  });

  it.each([
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

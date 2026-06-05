import { WIDGET_CATALOG, catalogEntryByName } from "@/src/features/widgets/widget-catalog";

describe("widget catalog", () => {
  it("has 3 prototype widgets with unique ids/names", () => {
    expect(WIDGET_CATALOG).toHaveLength(3);
    expect(WIDGET_CATALOG.map((w) => w.name).sort()).toEqual(["Mood", "Shortcuts", "Today"]);
  });
  it("looks up by manifest name", () => {
    expect(catalogEntryByName("Shortcuts")?.kind).toBe("shortcuts");
  });
});

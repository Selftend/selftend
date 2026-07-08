import { WIDGET_CATALOG, catalogEntryByName } from "@/src/features/widgets/widget-catalog";

describe("widget catalog", () => {
  it("has exactly one reconfigurable SelftendCard widget", () => {
    expect(WIDGET_CATALOG).toHaveLength(1);
    expect(WIDGET_CATALOG[0].name).toBe("SelftendCard");
    expect(WIDGET_CATALOG[0].kind).toBe("card");
    expect(WIDGET_CATALOG[0].widgetFeatures).toBe("reconfigurable");
  });
  it("looks up by manifest name", () => {
    expect(catalogEntryByName("SelftendCard")?.kind).toBe("card");
  });
});

import { SHORTCUT_CATALOG } from "@/src/features/widgets/shortcut-catalog";
describe("shortcut catalog", () => {
  it("has unique ids and app-relative paths", () => {
    expect(SHORTCUT_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(new Set(SHORTCUT_CATALOG.map((s) => s.id)).size).toBe(SHORTCUT_CATALOG.length);
    for (const s of SHORTCUT_CATALOG) {
      expect(s.path.startsWith("/")).toBe(true);
      expect(s.emoji).toBeTruthy();
      expect(s.labelKey).toMatch(/^home\.widgets\.shortcutCatalog\./);
    }
  });
});

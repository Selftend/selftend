import {
  CATALOGUE,
  MODULE_ITEMS,
  TOOL_ITEMS,
  favoriteScopeId,
} from "@/src/features/favorites/items";

/**
 * The one referent for "catalogue order" (#1955, spec #1885 §1.1). Favourites is this
 * array FILTERED, so the array's shape is a contract: eleven items, the eight tools first,
 * then CBT, ACT, DBT, and no two sharing a `(kind, key)`.
 */
describe("the favourites catalogue", () => {
  it("holds exactly eleven items: eight tools, then the three modules in CBT, ACT, DBT order", () => {
    expect(CATALOGUE).toHaveLength(11);
    expect(CATALOGUE.slice(0, 8).every((item) => item.kind === "tool")).toBe(true);
    expect(CATALOGUE.slice(8).map((item) => item.key)).toEqual(["cbt", "act", "dbt"]);
  });

  it("slices into the tools page's eight and the modules page's three without reordering", () => {
    expect(TOOL_ITEMS).toEqual(CATALOGUE.slice(0, 8));
    expect(MODULE_ITEMS).toEqual(CATALOGUE.slice(8));
  });

  it("never repeats a (kind, key) - the favourites row is unique on exactly that pair", () => {
    const pairs = CATALOGUE.map((item) => `${item.kind}:${item.key}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("gives every tool a glyph and every module an abbreviation, never both", () => {
    for (const item of CATALOGUE) {
      if (item.kind === "tool") {
        expect(item.icon).toEqual(expect.any(String));
        expect(item).not.toHaveProperty("abbreviation");
      } else {
        expect(item.abbreviation).toEqual(expect.any(String));
        expect(item).not.toHaveProperty("icon");
      }
    }
  });

  it("names the mutation scope after the row it serialises", () => {
    // One pending mutation per (kind, key) at a time, in press order (spec §2.4).
    expect(favoriteScopeId("tool", "mood")).toBe("favorite:tool:mood");
    expect(favoriteScopeId("module", "cbt")).toBe("favorite:module:cbt");
  });
});

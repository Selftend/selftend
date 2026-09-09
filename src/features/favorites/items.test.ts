import {
  CATALOGUE,
  favoriteId,
  favoriteItems,
  isFavorite,
  MODULES,
  TOOLS,
} from "@/src/features/favorites/items";

describe("the favourites catalogue (#1955)", () => {
  it("is eleven items: the eight tools, then CBT, ACT, DBT", () => {
    expect(CATALOGUE).toHaveLength(11);
    expect(CATALOGUE.slice(0, 8)).toEqual(TOOLS);
    expect(CATALOGUE.slice(8)).toEqual(MODULES);
    expect(MODULES.map((module) => module.key)).toEqual(["cbt", "act", "dbt"]);
    expect(TOOLS.every((tool) => tool.kind === "tool")).toBe(true);
  });

  it("gives every item a distinct identity", () => {
    const ids = CATALOGUE.map((item) => favoriteId(item.kind, item.key));
    expect(new Set(ids).size).toBe(ids.length);
    expect(favoriteId("tool", "mood")).toBe("favorite:tool:mood");
  });

  /**
   * Favourites is the catalogue FILTERED, never sorted: whatever order the rows come
   * back in, a favourited item holds its catalogue position. Asserted with the rows
   * deliberately reversed, so a `map` over the rows (the obvious wrong shape) fails.
   */
  it("filters the catalogue in catalogue order, whatever order the rows hold", () => {
    const rows = [
      { kind: "module" as const, key: "act" },
      { kind: "tool" as const, key: "sleep" },
      { kind: "tool" as const, key: "mood" },
    ];

    expect(favoriteItems(rows).map((item) => `${item.kind}:${item.key}`)).toEqual([
      "tool:mood",
      "tool:sleep",
      "module:act",
    ]);
  });

  /**
   * `key` is unconstrained in SQL on purpose: a row a downgraded build does not know is
   * ignored on read rather than crashing the screen or being drawn as a blank card.
   */
  it("ignores rows whose key the catalogue does not know", () => {
    const rows = [
      { kind: "tool" as const, key: "some-future-tool" },
      { kind: "module" as const, key: "cbt" },
    ];

    expect(favoriteItems(rows).map((item) => item.key)).toEqual(["cbt"]);
    expect(isFavorite(rows, "tool", "some-future-tool")).toBe(true);
    expect(isFavorite(rows, "tool", "cbt")).toBe(false);
  });
});

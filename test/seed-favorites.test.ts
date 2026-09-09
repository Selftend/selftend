import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CATALOGUE, favoriteId } from "@/src/features/favorites/items";

/**
 * The seeded favourites, checked against the catalogue they have to come from.
 *
 * `favorites.key` is bare TEXT with no FK and no check (#1953): a mistyped key inserts
 * fine, Home silently ignores it, and the reviewer blames the screen for a missing card.
 * Neither seed can import the catalogue - `supabase/seed.sql` is plain SQL and the demo
 * seeder is plain `.mjs` - so this is where the two literals meet the TypeScript source.
 * The demo seeder's own read-back (the last thing `npm run db:reset` runs) owns what only
 * a database can answer: that the rows actually landed.
 *
 * Until #1959 this was `seed-widget-layouts.test.ts`, deriving each account's favourites
 * from its `widget_preferences` rows through the catalogue's `toolKey`. No seed writes
 * that table now, so the favourites are the seeds' own truth and this test checks them
 * directly.
 */

const ROOT = join(__dirname, "..");
const SQL_SEED = readFileSync(join(ROOT, "supabase", "seed.sql"), "utf8");
const DEMO_SEED = readFileSync(join(ROOT, "scripts", "seed-demo-data.mjs"), "utf8");

const ALICE_USER_ID = "00000000-0000-0000-0000-000000000001";
const BOB_USER_ID = "00000000-0000-0000-0000-000000000002";

const CATALOGUE_IDS = new Set(CATALOGUE.map((item) => favoriteId(item.kind, item.key)));

/** One `const NAME = [["kind", "key"], ...]` literal out of the demo seed, as sorted ids. */
function readJsPairs(name: string): string[] {
  const block = DEMO_SEED.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!block) throw new Error(`Could not find \`const ${name} = [...]\` in the demo seed.`);
  return Array.from(block[1].matchAll(/\[\s*"(tool|module)"\s*,\s*"([a-z]+)"\s*\]/g))
    .map((pair) => favoriteId(pair[1] as "tool" | "module", pair[2]))
    .sort();
}

/** Every `favorites` row `supabase/seed.sql` writes, as `userId` → sorted ids. */
function readSqlFavorites(): Map<string, string[]> {
  const rows = new Map<string, string[]>();
  for (const statement of SQL_SEED.matchAll(/insert into public\.favorites[\s\S]*?;/g)) {
    for (const row of statement[0].matchAll(
      /\(\s*'([0-9a-f-]+)'\s*,\s*'(tool|module)'\s*,\s*'([a-z]+)'\s*\)/g,
    )) {
      const id = favoriteId(row[2] as "tool" | "module", row[3]);
      rows.set(row[1], [...(rows.get(row[1]) ?? []), id].sort());
    }
  }
  return rows;
}

const sqlFavorites = readSqlFavorites();
const demoFavorites = readJsPairs("DEMO_FAVORITES");
const bobFavorites = readJsPairs("BOB_FAVORITES");

describe("seeded favourites", () => {
  it("parses both seed files (so nothing below is vacuous)", () => {
    expect(demoFavorites).toHaveLength(10);
    expect(bobFavorites).toHaveLength(4);
    expect(sqlFavorites.get(BOB_USER_ID)).toHaveLength(4);
    // A catalogue this small would mean the import is wrong, not that the product shrank.
    expect(CATALOGUE_IDS.size).toBe(11);
  });

  it("neither seed writes widget_preferences (#1959)", () => {
    // The table survives for older native builds; the seeds stopped writing it.
    expect(SQL_SEED).not.toMatch(/insert into public\.widget_preferences/);
    expect(DEMO_SEED).not.toMatch(/insert\(\s*"widget_preferences"/);
  });

  it.each([
    ["demo (scripts/seed-demo-data.mjs)", demoFavorites],
    ["bob (supabase/seed.sql)", sqlFavorites.get(BOB_USER_ID) ?? []],
  ])("%s stars only real catalogue items", (_label, ids) => {
    expect(ids.filter((id) => !CATALOGUE_IDS.has(id))).toEqual([]);
  });

  it("demo stars ten of the eleven - everything but DBT", () => {
    // Ten, not eleven, on purpose: DBT is the one card whose star reads as off, so the
    // off state is reviewable beside ten on ones.
    expect(demoFavorites).toEqual(
      [...CATALOGUE_IDS].filter((id) => id !== "favorite:module:dbt").sort(),
    );
  });

  it("bob's four are the same in seed.sql and in the demo seeder's read-back", () => {
    expect(bobFavorites).toEqual(sqlFavorites.get(BOB_USER_ID));
    expect(bobFavorites).toEqual(
      ["module:cbt", "tool:mood", "tool:breathing", "tool:journal"]
        .map((k) => `favorite:${k}`)
        .sort(),
    );
  });

  it("alice keeps zero favourites (the empty-Favourites fixture)", () => {
    expect(sqlFavorites.has(ALICE_USER_ID)).toBe(false);
    expect([...sqlFavorites.keys()]).toEqual([BOB_USER_ID]);
  });
});

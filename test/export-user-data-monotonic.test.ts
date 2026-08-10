import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// `export_user_data` is redeclared IN FULL by every migration that adds an
// exportable column, per supabase/README.md "Modifying export_user_data". Each
// author copies the whole 400-line body from whatever was newest when they
// started, and the LAST declaration to apply wins outright.
//
// That is safe only while everyone copies from the true newest declaration.
// When two such migrations are in flight at once - the normal case while a
// workstream is split per module - whichever lands second was written against a
// parent that predates the first, so merging it silently removes the first
// module's columns from the export. The two migrations touch DIFFERENT FILES,
// so git reports no conflict, and nothing else compares them.
//
// It is not hypothetical. On 2026-07-28 #423 and #424 each carried their own
// occurrence offsets and neither carried the other's; `dev` shipped a GDPR
// export with `activity_logs.completed_offset_minutes` and
// `scheduled_offset_minutes` missing, and every suite was green (#431, #429).
//
// So: a later declaration may ADD columns and may not LOSE them. That is
// checkable from the migration files alone, with no database, which is why this
// is a unit test and runs in `verify` rather than only in `integration`.
//
// This does NOT check that a newly added table column reached the export at all
// - that needs the live schema. It checks the regression that actually happened.

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

// Everything up to and including the squash is history; declarations before it
// use the old `export_user_data_before_*` wrapper chain that
// test/migration-conventions.test.ts bans from returning.
const SQUASH_MIGRATION = "20260704_export_user_data_flatten.sql";

const DECLARATION = "create or replace function public.export_user_data";

/**
 * Columns a later declaration is ALLOWED to stop reading, because the thing
 * itself is gone. Each entry has to name why, and the assertion below fails if
 * an entry stops being necessary - so this list cannot quietly absorb a real
 * regression the way an unexplained one would.
 */
const INTENTIONALLY_DROPPED = new Set([
  // `20260715_routines.sql:186` drops the table outright - `plan_items` was the
  // pre-routines "plan" concept, replaced by routines/routine_steps in the same
  // migration. Confirmed absent from information_schema on a migrated database.
  "plan_items.*",
]);

/**
 * Every `select <bare columns> from public.<table>` inside the declaration.
 *
 * Deliberately matches every read anywhere in the function body, not just the
 * `'key', ( … )` projections: `preferences` is assembled from three separate
 * reads of `user_preferences` that are merged with `||`, so a per-projection
 * parse would report two thirds of that table as missing.
 *
 * The column list is required to be bare identifiers. If a future declaration
 * introduces an expression there this stops matching that block, which would
 * weaken the check silently - so `reads a plausible number of columns` below
 * pins the total.
 */
const READ = /select\s+((?:[a-z_][a-z0-9_]*\s*,\s*)*[a-z_][a-z0-9_]*)\s+from\s+public\.(\w+)\b/gi;

function declarationsInOrder(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter(
      (f) =>
        f >= SQUASH_MIGRATION &&
        readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(DECLARATION),
    );
}

/** `table.column` pairs the declaration in `file` reads. */
function readSet(file: string): Set<string> {
  const source = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  const body = source.slice(source.indexOf(DECLARATION));
  const pairs = new Set<string>();

  for (const match of body.matchAll(READ)) {
    for (const column of match[1].split(",")) {
      pairs.add(`${match[2]}.${column.trim()}`);
    }
  }
  return pairs;
}

const allowed = (pair: string) =>
  INTENTIONALLY_DROPPED.has(pair) || INTENTIONALLY_DROPPED.has(`${pair.split(".")[0]}.*`);

describe("export_user_data never loses a column it once exported", () => {
  const declarations = declarationsInOrder();

  it("finds the declarations it is meant to police", () => {
    // If this drops to one, the check below passes by having nothing to compare
    // and the export is unguarded again.
    expect(declarations.length).toBeGreaterThan(1);
    expect(declarations[0]).toBe(SQUASH_MIGRATION);
  });

  it("reads a plausible number of columns from the newest declaration", () => {
    // Guards the parser, not the export. A regex that stopped matching would
    // make every assertion below vacuously true - the read set would be empty,
    // so nothing could ever be "lost".
    const newest = readSet(declarations[declarations.length - 1]);

    expect(newest.size).toBeGreaterThan(400);
    expect([...newest]).toContain("thought_records.created_offset_minutes");
    expect([...newest]).toContain("activity_logs.scheduled_offset_minutes");
  });

  it("has the winning declaration carry every column any declaration ever exported", () => {
    // Held against the LAST declaration rather than each step in turn, because
    // the last one is the only one a user's export is actually built from - and
    // because a mid-history step that lost a column and was repaired afterwards
    // is a fact about the past that no later change can make untrue. Checking
    // the winner catches the same mistake at the same moment: a stale copy is
    // by definition the newest declaration when it lands, so it fails here on
    // its own PR.
    const winner = declarations[declarations.length - 1];
    const winnerReads = readSet(winner);

    // The NEWEST declaration that still had each column, so the failure names
    // the file to copy the missing lines back from rather than just the column.
    const lastSeen = new Map<string, string>();
    for (const file of declarations) {
      for (const pair of readSet(file)) lastSeen.set(pair, file);
    }

    const lost = [...lastSeen.keys()]
      .filter((pair) => !winnerReads.has(pair) && !allowed(pair))
      .sort()
      .map((pair) => `${pair} (last exported by ${lastSeen.get(pair)})`);

    // Rebuild your declaration from the newest one on `dev` and add only your
    // own lines - do NOT delete the column from this expectation. See
    // supabase/README.md "Modifying export_user_data".
    expect(lost).toEqual([]);
  });

  it("keeps no allowlist entry that has stopped being needed", () => {
    // A stale exemption is indistinguishable from a real regression being
    // waved through, so every entry has to still be load-bearing.
    const everRead = new Set<string>();
    for (const file of declarations) {
      for (const pair of readSet(file)) everRead.add(pair);
    }
    const newest = readSet(declarations[declarations.length - 1]);

    const unnecessary = [...INTENTIONALLY_DROPPED].filter((entry) => {
      const wildcard = entry.endsWith(".*");
      const prefix = wildcard ? entry.slice(0, -1) : entry;
      const wasRead = [...everRead].some((pair) =>
        wildcard ? pair.startsWith(prefix) : pair === entry,
      );
      const stillRead = [...newest].some((pair) =>
        wildcard ? pair.startsWith(prefix) : pair === entry,
      );
      return !wasRead || stillRead;
    });

    expect(unnecessary).toEqual([]);
  });
});

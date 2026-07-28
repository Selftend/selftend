import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

// The squash migration: everything up to and including it is history and may
// mention the old wrapper names (renames, drops, comments). Anything NEWER
// must not re-introduce the pattern - extend the flat function with
// `create or replace` instead (see supabase/README.md "Modifying export_user_data").
const SQUASH_MIGRATION = "20260704_export_user_data_flatten.sql";

describe("migration conventions", () => {
  it("no migration after the squash re-introduces export_user_data_before_* wrappers", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const newerThanSquash = files.filter((f) => f > SQUASH_MIGRATION);

    const offenders = newerThanSquash.filter((f) =>
      readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes("export_user_data_before"),
    );

    expect(offenders).toEqual([]);
  });

  it("no two migrations share a version prefix", () => {
    // Supabase keys `supabase_migrations.schema_migrations` on the leading
    // numeric run, NOT the filename. Two files dated the same day are therefore
    // ONE version, and the second to apply dies with
    //
    //   ERROR: duplicate key value violates unique constraint
    //   "schema_migrations_pkey" - Key (version)=(20260730) already exists
    //
    // which surfaces only when CI starts Supabase: `verify` is green, the diff
    // looks fine, and the two files were written days apart by people who each
    // saw a free date. It bit twice in one afternoon once parallel work started
    // landing migrations on the same day (#414, #256).
    //
    // Timestamped versions (YYYYMMDDHHMMSS) are collision-proof and already used
    // in this directory; plain YYYYMMDD is only safe while one migration a day
    // lands. Prefer the long form for anything new.
    const versions = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => ({ file: f, version: /^(\d+)/.exec(f)?.[1] ?? "" }));

    const unversioned = versions.filter((v) => v.version === "").map((v) => v.file);
    expect(unversioned).toEqual([]);

    const seen = new Map<string, string[]>();
    for (const { file, version } of versions) {
      seen.set(version, [...(seen.get(version) ?? []), file]);
    }
    const collisions = [...seen.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([version, files]) => `${version}: ${files.join(", ")}`);

    // Rename the newer file to a timestamped version rather than deleting it.
    expect(collisions).toEqual([]);
  });
});

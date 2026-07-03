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
});

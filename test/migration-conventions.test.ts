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

    // Rename the newer file to a timestamped version rather than deleting it -
    // but pick a version that is not a prefix of, and does not extend, any
    // version already here. See the next test for why.
    expect(collisions).toEqual([]);
  });

  it("no version is a prefix of another version", () => {
    // The companion hazard to the collision above, and the one its own remedy
    // used to create (#432).
    //
    // `db push` walks the local migration files and the remote
    // `schema_migrations` rows as two SORTED lists, in one pass, expecting them
    // to agree on order. The remote list is ordered by version. The local list
    // is ordered by FILENAME - and a version that extends another sorts the
    // wrong way round, because every digit sorts before the `_` that ends the
    // short version:
    //
    //   20260730120000_program_widget_day_key.sql     <- '1' (0x31)
    //   20260730_mindfulness_occurrence_offset.sql    <- '_' (0x5f)
    //
    // so the file for version `20260730120000` sorts BEFORE the file for
    // `20260730`, while the remote orders `20260730` first. The walk hits a
    // local version greater than the remote one it is looking for, concludes
    // the remote version has no local counterpart, and aborts:
    //
    //   Remote migration versions not found in local migrations directory.
    //   supabase migration repair --status reverted 20260728 20260730
    //
    // even though both files are present and unrenamed. This broke every
    // staging run from 0c664ec (#419) onward.
    //
    // Two things make it hard to catch. It is invisible until the shorter
    // version has actually been applied somewhere, so CI is green - `db reset`
    // builds from empty and never compares histories. And once BOTH versions
    // are applied it never recovers on its own: every later push fails the same
    // way, so the first push to succeed is what wedges the database.
    //
    // The rule is therefore stronger than "no duplicate versions": no version
    // may be a prefix of another. Sticking to one width (YYYYMMDDHHMMSS for
    // anything new) satisfies both tests at once.
    const versions = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => ({ file: f, version: /^(\d+)/.exec(f)?.[1] ?? "" }))
      .filter((v) => v.version !== "")
      .sort((a, b) => a.version.localeCompare(b.version));

    const offenders: string[] = [];
    for (let i = 0; i < versions.length; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        if (!versions[j].version.startsWith(versions[i].version)) break;
        offenders.push(
          `${versions[i].version} (${versions[i].file}) is a prefix of ` +
            `${versions[j].version} (${versions[j].file})`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  it("filename order matches version order", () => {
    // The invariant the test above protects, asserted directly: `db push`'s
    // one-pass walk is only correct while sorting the files by name gives the
    // same sequence as sorting them by version. Prefix pairs are the only way
    // this repo has broken it so far, but the invariant is what actually
    // matters, so pin it rather than only its known cause.
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const byVersion = [...files].sort((a, b) => {
      const va = /^(\d+)/.exec(a)?.[1] ?? "";
      const vb = /^(\d+)/.exec(b)?.[1] ?? "";
      return va.localeCompare(vb);
    });

    expect(files).toEqual(byVersion);
  });
});

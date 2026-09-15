import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ACCOUNT_ORIGINS } from "@/src/features/auth/account-origin";

/**
 * The four `account_origin` values exist in two places - the TypeScript union
 * the client derives from, and the column's inline `CHECK` (#2323). This reads
 * the migration and compares, because the alternative is a claim rather than a
 * guarantee.
 *
 * ☠️ A test that asserted `ACCOUNT_ORIGINS` against a hand-copied literal would
 * pass green through exactly the drift worth catching: a fifth value added to
 * the TypeScript side alone would be derived, written, and rejected by the
 * database at the age gate - the one write a person cannot retry, because the
 * gate is the only place the value is derivable.
 *
 * ⚠️ Lives in `test/` rather than beside the module because it reads a file
 * outside `src/`: a source-scanning test is invisible to jest's
 * `--findRelatedTests`, so the pre-commit hook would not run it on a change to
 * either side. The full suite does.
 */
const MIGRATION = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260914000000_account_origin.sql",
);

function checkConstraintValues(): string[] {
  const sql = readFileSync(MIGRATION, "utf8");
  const match = sql.match(/check\s*\(\s*account_origin\s+in\s*\(([^)]*)\)\s*\)/i);

  if (!match) {
    throw new Error("No `check (account_origin in (...))` found in the migration.");
  }

  return match[1]
    .split(",")
    .map((value) => value.trim().replace(/^'|'$/g, ""))
    .filter(Boolean);
}

describe("account_origin values", () => {
  it("are the same four in the TypeScript union and the column's CHECK", () => {
    expect(checkConstraintValues().sort()).toEqual([...ACCOUNT_ORIGINS].sort());
  });

  it("reads a real constraint, so the comparison cannot be vacuously green", () => {
    // Guards the parser above: an empty list on either side would make the
    // assertion trivially true.
    expect(checkConstraintValues()).toHaveLength(4);
    expect(checkConstraintValues()).toContain("native_cold_start");
  });
});

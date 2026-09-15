import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { journalWritingReservationBuckets } from "@/src/features/journal/journal-overview";

/**
 * The journal overview reserves its writing chart's space while the buckets behind it are
 * in flight, and it sizes that reservation by re-deriving the shape the read will land
 * (`journalWritingReservationBuckets`, ADR-0009 edge 4). The shape itself is decided by
 * `journal_writing_buckets` in SQL, so the rule is written down twice - once where it runs
 * and once where it is waited on.
 *
 * ☠️ **Nothing else can compare the two copies.** The unit tests pin the TypeScript half
 * against itself, and the integration suite that calls the real RPC cannot import this
 * function: that project deliberately runs off the jest-expo preset, and the date helpers
 * behind the derivation reach `@/src/i18n`. So this reads the migration and asserts the
 * mapping it still declares - a unit changing in SQL would otherwise leave the reservation
 * quietly holding the wrong height, with every test green.
 *
 * ⚠️ It reads the NEWEST declaration, not the first. `create or replace function` means a
 * later migration wins, and a guard pinned to the original file would keep passing while
 * the function it describes had been redefined elsewhere.
 */
const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");
const DECLARATION = "create or replace function public.journal_writing_buckets";

function newestDeclaration(): string {
  const declaring = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => readFileSync(join(MIGRATIONS, name), "utf8").includes(DECLARATION));

  expect(declaring.length).toBeGreaterThan(0);
  // Whitespace-normalised: the assertions below are about the mapping, not about how the
  // SQL happens to be wrapped.
  return readFileSync(join(MIGRATIONS, declaring[declaring.length - 1]!), "utf8").replace(
    /\s+/g,
    " ",
  );
}

describe("the writing chart's reservation mirrors the RPC", () => {
  const sql = newestDeclaration();

  // The client cannot ask for a range the RPC will not bucket, and the reservation cannot
  // be asked for one either - `JournalWritingRange` is these three and "all".
  it("still accepts exactly the ranges the range control offers", () => {
    expect(sql).toContain("p_days not in (7, 30, 90)");
  });

  /**
   * The unit is what picks the caption line under the bars, so a range whose unit moves
   * moves the reserved height with it. Read in the SQL's own words.
   */
  it.each([
    ["p_days = 90 then 'week'", 90 as const, "week"],
    ["else 'day'", 30 as const, "day"],
    ["else 'day'", 7 as const, "day"],
  ])("maps %s, and the reservation agrees for %s", (clause, range, unit) => {
    expect(sql).toContain(clause);
    expect(journalWritingReservationBuckets(range).every((bucket) => bucket.unit === unit)).toBe(
      true,
    );
  });

  /**
   * All time is the one range the reservation cannot follow exactly: the RPC picks months
   * or years by how much history exists, which is what the read is about to report. It
   * guesses months, and neither the unit nor the count reaches the height - past seven
   * buckets no column carries a label, and both captions are one line. Pinned so that the
   * guess stays a guess about something harmless.
   */
  it("leaves All time to the RPC's two shapes, and reserves for the commoner one", () => {
    expect(sql).toContain("p_days is null then 'month'");
    expect(sql).toContain("then 'year'");
    expect(journalWritingReservationBuckets("all").every((bucket) => bucket.unit === "month")).toBe(
      true,
    );
  });

  /**
   * Thirteen seven-day buckets across ninety days is arithmetic the reservation repeats
   * rather than inherits, and the count is what decides whether the columns carry labels
   * at all. `generate_series(0, (end - start) / 7)` is the line it repeats.
   */
  it("repeats the weekly bucket arithmetic the RPC generates", () => {
    expect(sql).toContain("generate_series(0, ((bounds.end_day - bounds.start_day) / 7)::integer)");
    expect(journalWritingReservationBuckets(90)).toHaveLength(13);
  });
});

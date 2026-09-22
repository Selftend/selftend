/**
 * The parser behind both hold-out guards (#2717, decided on #2701).
 *
 * `docs/releasing.md` § _The hold-out table_ is the register of everything
 * Selftend withholds from everyone on purpose. Two things read it: the merge
 * gate in `holdout-table.test.ts`, which runs in `verify` and compares the
 * table against the live constants, and the weekly alarm in
 * `scripts/check-holdout-versions.mjs`, which compares still-held rows against
 * the two store versions.
 *
 * ☠️ **The alarm reads only the table, never the constants.** It is a `.mjs`
 * script and cannot import TypeScript. That is safe *only because* the merge
 * gate enforces a two-way equality between the table and the constants on every
 * PR — so by the time the alarm runs, the table is known to be a faithful
 * mirror. Weaken the gate to a one-way check and the alarm silently starts
 * reading fiction.
 *
 * The table is delimited by HTML comments rather than located by position or
 * heading, so an edit elsewhere in the document cannot change which table the
 * guards read, and the markers are visible to anyone editing the file.
 */

export const TABLE_START = "<!-- holdout-table:start -->";
export const TABLE_END = "<!-- holdout-table:end -->";

/** One row of the register. Every cell is the trimmed markdown source. */
export type HoldoutRow = {
  /** The exported constant the entry lives in, without backticks. */
  constant: string;
  /** The entry itself — a reminder target key or a steppable tool id. */
  entry: string;
  withholds: string;
  shippedIn: string;
  liftsWhen: string;
  liftIssue: string;
  /** Empty means STILL HELD OUT. Both guards key off exactly this. */
  lifted: string;
};

/** A problem the merge gate reports. `entry` is empty when the row is the fault. */
export type HoldoutProblem = { constant: string; entry: string; reason: string };

const EXPECTED_HEADERS = [
  "Constant",
  "Entry",
  "Withholds",
  "Shipped in",
  "Lifts when",
  "Lift issue",
  "Lifted",
];

/** `` `dbt` `` → `dbt`; a link cell is left as-is. */
function unticked(cell: string): string {
  const m = /^`(.+)`$/.exec(cell.trim());
  return m ? m[1] : cell.trim();
}

function splitRow(line: string): string[] {
  // Drop the leading and trailing pipe, then split. Cell text never contains a
  // pipe here; if it ever needs to, escape it and revisit this.
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Pull the register out of `docs/releasing.md`.
 *
 * ⚠️ Throws rather than returning `[]` when the markers or the header are
 * missing or renamed. A parser that returns nothing on a structural change
 * would make the merge gate pass over everything — the failure mode
 * `registry.test.ts` records, where six stems were matched by no probe at all
 * and a typo in any one would have passed forever.
 */
export function parseHoldoutTable(markdown: string): HoldoutRow[] {
  const start = markdown.indexOf(TABLE_START);
  const end = markdown.indexOf(TABLE_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `The hold-out table markers are missing from the document (${TABLE_START} … ${TABLE_END}). ` +
        `The guards in #2717 read the table between them; restore the markers rather than removing the guards.`,
    );
  }

  const lines = markdown
    .slice(start + TABLE_START.length, end)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  if (lines.length < 2) {
    throw new Error("The hold-out table has no header and separator rows between its markers.");
  }

  const headers = splitRow(lines[0]);
  if (headers.join("|") !== EXPECTED_HEADERS.join("|")) {
    throw new Error(
      `The hold-out table's columns changed. Expected [${EXPECTED_HEADERS.join(", ")}], ` +
        `found [${headers.join(", ")}]. Update test/holdout-table.ts and ` +
        `scripts/check-holdout-versions.mjs together, or the weekly alarm reads the wrong column.`,
    );
  }

  // lines[1] is the `| --- |` separator.
  return lines.slice(2).map((line) => {
    const cells = splitRow(line);
    if (cells.length !== EXPECTED_HEADERS.length) {
      throw new Error(
        `A hold-out table row has ${cells.length} cells, expected ${EXPECTED_HEADERS.length}: ${line}`,
      );
    }
    const [constant, entry, withholds, shippedIn, liftsWhen, liftIssue, lifted] = cells;
    return {
      constant: unticked(constant),
      entry: unticked(entry),
      withholds,
      shippedIn,
      liftsWhen,
      liftIssue,
      lifted,
    };
  });
}

/** Rows still held out — an empty `Lifted` cell. This is what the alarm watches. */
export function stillHeld(rows: HoldoutRow[]): HoldoutRow[] {
  return rows.filter((r) => r.lifted === "");
}

/**
 * The gate itself: a **two-way** comparison between the live constants and the
 * register.
 *
 * ☠️ **An equality, not an implication**, for the same reason `index-list.test.ts`
 * gives (#2715): with both constants empty today, a one-way "every entry is
 * documented" check passes over nothing and would pass equally well if it were
 * broken. Both directions fail:
 *
 * - an entry in a constant with no row, or a row missing its release or its
 *   condition → the hold-out is **invisible**, which is what #2717 exists to fix;
 * - a row with an empty `Lifted` cell whose entry is no longer in its constant →
 *   the register claims something is withheld that is not, and the weekly alarm
 *   (which trusts this column) would chase it forever;
 * - a row marked lifted whose entry is still in its constant → the opposite lie,
 *   and the one that silences the alarm for a hold-out that is still live.
 */
export function findHoldoutProblems(
  live: Record<string, readonly string[]>,
  rows: HoldoutRow[],
): HoldoutProblem[] {
  const problems: HoldoutProblem[] = [];

  for (const [constant, entries] of Object.entries(live)) {
    for (const entry of entries) {
      const row = rows.find((r) => r.constant === constant && r.entry === entry);
      if (!row) {
        problems.push({
          constant,
          entry,
          reason: `held out in the code but absent from the hold-out table in docs/releasing.md`,
        });
        continue;
      }
      if (row.lifted !== "") {
        problems.push({
          constant,
          entry,
          reason: `the table records it lifted on "${row.lifted}", but it is still in ${constant}`,
        });
      }
      if (row.shippedIn === "") {
        problems.push({ constant, entry, reason: `the table gives no "Shipped in" release` });
      }
      if (row.liftsWhen === "") {
        problems.push({ constant, entry, reason: `the table gives no "Lifts when" condition` });
      }
    }
  }

  for (const row of stillHeld(rows)) {
    const entries = live[row.constant];
    if (entries === undefined) {
      problems.push({
        constant: row.constant,
        entry: row.entry,
        reason: `the table names a constant the gate does not know about — add it to LIVE_HOLDOUTS in test/holdout-table.test.ts`,
      });
      continue;
    }
    if (!entries.includes(row.entry)) {
      problems.push({
        constant: row.constant,
        entry: row.entry,
        reason: `the table shows it still held out (empty "Lifted"), but it is not in ${row.constant}`,
      });
    }
  }

  return problems;
}

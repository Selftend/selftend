import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FLOOR_BY_COUNTRY } from "@/src/features/auth/age-floor";
import { countryName } from "@/src/features/auth/countries";
import { tableCells } from "@/test/markdown-doc";

/**
 * Every floor in the shipped table has a sourced provenance row (#1763, spec
 * #227 §2).
 *
 * §2's execution item is that a (C)-marked row — one established from a
 * consolidated mapping rather than from the statute — must be checked against a
 * primary source **before it governs anyone's access**.
 * `docs/age-floor-statute-checks.md` is that check. This file is what stops it
 * drifting away from the code it describes.
 *
 * ☠️ **The drift this catches is the one that already happened.** Denmark moved
 * its age of digital consent from 13 to 15 in 2024 and the mapping our table
 * came from did not notice, so `FLOOR_BY_COUNTRY` shipped a number the Danish
 * statute contradicts. A floor is a claim about a foreign statute; the only
 * thing that makes it checkable later is the row that says where it came from.
 * So: a country in the code with no row here, or a row whose stated floor has
 * silently diverged from the code, fails.
 *
 * ⚠️ It deliberately does NOT assert that every row is `CONFIRMED`. Hungary is
 * `UNRESOLVED` and must be allowed to stay that way, and a future contradiction
 * must be allowed to sit here as one — the rule is that a contradiction is
 * raised, never silently applied. A guard that forced every row green would
 * force exactly the silent edit that rule forbids. Denmark was `CONTRADICTED`
 * until [#1921](https://github.com/Selftend/selftend/issues/1921) took the
 * owner's decision to follow the statute; the row now reads 15 on both sides.
 */

const ROOT = resolve(__dirname, "..");
const DOC = "docs/age-floor-statute-checks.md";

const record = readFileSync(resolve(ROOT, DOC), "utf8");

const VERDICTS = ["CONFIRMED", "CONTRADICTED", "UNRESOLVED"] as const;

/** Code · floor · verdict · provision · source — the checked table's shape. */
const CHECKED_COLUMNS = 5;

interface Row {
  code: string;
  /** The floor the row claims the code carries. */
  statedFloor: number;
  /** Present only on rows from the checked table. */
  verdict?: (typeof VERDICTS)[number];
  /** The whole row, for assertions about its remaining cells. */
  cells: string[];
}

/**
 * Every markdown table row in the document whose first cell is a bolded
 * two-letter code. Both tables are read — the rows checked in this pass and the
 * rows carried over — because the claim being guarded is that the code table is
 * *completely* accounted for, not that most of it is.
 */
function provenanceRows(markdown: string): Row[] {
  const rows: Row[] = [];

  for (const line of markdown.split("\n")) {
    const cells = tableCells(line);
    if (!cells) continue;

    const code = cells[0]?.match(/^\*\*([A-Z]{2})\*\*$/)?.[1];
    if (!code) continue;

    // ⚠️ A verdict is only read from the five-column checked table. The
    // carried-over table is three columns wide and its third cell is free
    // prose about provenance - a basis that happened to contain the word
    // UNRESOLVED would otherwise enrol an unchecked row as a checked one, and
    // the count assertions below would pass on the wrong set.
    const verdict =
      cells.length >= CHECKED_COLUMNS
        ? VERDICTS.find((candidate) => new RegExp(`\\b${candidate}\\b`).test(cells[2] ?? ""))
        : undefined;

    rows.push({ code, statedFloor: Number(cells[1]), verdict, cells });
  }

  return rows;
}

const rows = provenanceRows(record);
const byCode = new Map(rows.map((row) => [row.code, row]));

describe("the provenance record covers the shipped floor table", () => {
  it("has exactly one row per country in FLOOR_BY_COUNTRY, and no strays", () => {
    const inCode = Object.keys(FLOOR_BY_COUNTRY).sort();
    const inDoc = rows.map((row) => row.code).sort();

    expect(inDoc).toEqual(inCode);
  });

  /**
   * The heart of it. Each row's second cell states the floor that country
   * carries in code, so a change to `FLOOR_BY_COUNTRY` that leaves this file
   * behind makes the file assert something false about its own repository.
   * Reading it back out and comparing is what keeps the two from parting.
   */
  it.each(Object.keys(FLOOR_BY_COUNTRY))("states %s's shipped floor correctly", (code) => {
    const row = byCode.get(code);

    expect(row).toBeDefined();
    expect(row?.statedFloor).toBe(FLOOR_BY_COUNTRY[code]);
  });
});

describe("the rows checked in this pass", () => {
  const checked = rows.filter((row) => row.verdict !== undefined);

  /**
   * Twenty-one rows carried the (C) mark; Spain was checked alongside them
   * because its (P) mark rested on a law firm's summary. Dropping below that
   * means a row lost its verdict.
   */
  it("carries a verdict for every row it claims to have checked", () => {
    expect(checked.length).toBeGreaterThanOrEqual(22);
  });

  it("cites a source for every row it resolved", () => {
    for (const row of checked) {
      if (row.verdict === "UNRESOLVED") continue;

      // The provision cell says what was read; the source cell says where from.
      // A placeholder in either is the shape a half-finished row takes, so it
      // is rejected as explicitly as an empty one.
      expect(row.cells[3]).not.toBe("");
      expect(row.cells[3]).not.toMatch(/^(TBD|TODO|N\/A|\?+|-)$/i);
      expect(row.cells[4] ?? "").toMatch(/https:\/\//);
    }
  });

  /**
   * A row that is not `CONFIRMED` is a live problem — a floor the statute
   * contradicts, or one nobody could verify. Left as a table cell it is a
   * footnote; the ticket requires it to be raised. So each one has to be
   * discussed by name in the prose, and the country's name is read out of
   * `countries.ts` rather than spelled here, so the three artefacts cannot
   * disagree about what the country is called.
   */
  it("discusses every row it could not confirm, by name, outside the tables", () => {
    const prose = record
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("|"))
      .join("\n");

    for (const row of checked) {
      if (row.verdict === "CONFIRMED") continue;

      expect(prose).toContain(countryName(row.code, "en"));
    }
  });

  /**
   * A contradicted floor is the one finding that must not stay inside this
   * file. `docs/age-floor.md` carries the table itself and is what a reader
   * reaches first, so a row the statute contradicts has to be warned about
   * there too — otherwise the table reads as settled and the correction lives
   * only in a document nobody was sent to.
   *
   * Keyed on the country name and the issue that raises it, not on wording.
   *
   * ☠️ The table rows are stripped first, and that is the whole assertion. A
   * country is named in `age-floor.md`'s own floor table, so a bare
   * `toContain(name)` over the file passes no matter what — the claim is that
   * the file *discusses* it, which is only true outside the table.
   *
   * ⚠️ **Dormant as of #1921**: no row is `CONTRADICTED` any more, so this loops
   * zero times and cannot fail. It is kept rather than deleted because it is a
   * standing rule for the next contradiction, not a check on this one — but
   * green here currently means "nothing to check", not "checked".
   */
  it("warns about a contradicted floor in the file that carries the table", () => {
    const prose = readFileSync(resolve(ROOT, "docs/age-floor.md"), "utf8")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("|"))
      .join("\n");

    for (const row of checked) {
      if (row.verdict !== "CONTRADICTED") continue;

      expect(prose).toContain(countryName(row.code, "en"));
      expect(prose).toMatch(/issues\/1921/);
    }
  });
});

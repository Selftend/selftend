// test/analytics-programme-phases.test.ts
//
// The engagement report's programme funnel (#2375) prints one row per phase,
// and it gets the number of phases from a `total_phases` literal in its own
// `programme_progress` view rather than from the app. Nothing else connects the
// two: adding a sixth CBT week would leave the funnel printing five steps and
// quietly losing the last one, and the report would still run clean.
//
// ☠️ So this holds the report's numbers equal to the LENGTH OF THE PROGRAMME
// ARRAYS THEMSELVES, parsed from the definition files. It deliberately does not
// compare the report against a list of numbers written here - a constant
// asserted against a literal sitting beside it pins nothing.
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "scripts", "analytics-engagement.sql");

/** Which array in which file defines each programme the funnel reports. */
const PROGRAMMES = {
  cbt: { file: "src/features/cbt/program-definition.ts", constant: "CBT_PROGRAM" },
  act: { file: "src/features/act/program-definition.ts", constant: "ACT_PROGRAM" },
  dbt: { file: "src/features/dbt/program-definition.ts", constant: "DBT_PROGRAM" },
} as const;

/**
 * How many entries the named array literal holds, by walking bracket depth from
 * its opening `[` — so nested objects, arrays of milestones and any future
 * shape inside a phase are counted as part of their phase rather than as
 * phases. A line-shape regex would miscount the first time someone reformats.
 */
function phaseCount(file: string, constant: string): number {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const declaration = source.indexOf(`export const ${constant}`);
  if (declaration === -1) throw new Error(`${file}: no ${constant} declaration`);

  // ⚠️ Anchored on `= [`, not on the first `[`: the declaration is
  // `export const CBT_PROGRAM: ProgramWeek[] = [`, so the first bracket belongs
  // to the TYPE and walking from it counts an empty pair and returns zero.
  const assignment = source.indexOf("= [", declaration);
  if (assignment === -1) throw new Error(`${file}: ${constant} has no array literal`);
  const open = assignment + 2;

  let depth = 0;
  let entries = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === "[" || char === "{") {
      depth += 1;
      // A `{` one level inside the array literal opens a phase.
      if (char === "{" && depth === 2) entries += 1;
    } else if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return entries;
    }
  }
  throw new Error(`${file}: ${constant} array literal is never closed`);
}

/** The `total_phases` the report's `programme_progress` view uses per programme. */
function reportedPhases(): Record<string, number> {
  const source = fs.readFileSync(REPORT, "utf8");
  const rows = [...source.matchAll(/\('(cbt|act|dbt)', (\d+), up\./g)];
  return Object.fromEntries(rows.map((row) => [row[1], Number(row[2])]));
}

describe("the programme funnel prints one row per phase the app actually has", () => {
  const reported = reportedPhases();

  it("finds a total_phases literal for every programme it reports", () => {
    // Guards the parser. If the view is rewritten into a shape this regex does
    // not match, every comparison below would pass by comparing nothing.
    expect(Object.keys(reported).sort()).toEqual(["act", "cbt", "dbt"]);
  });

  it("counts phases from the definition arrays, not from a shape in the file", () => {
    // Guards the other parser, and pins the fact that these programmes differ
    // in length - a counter that returned the same number for all three would
    // make the real assertion below vacuous.
    expect(phaseCount(PROGRAMMES.cbt.file, PROGRAMMES.cbt.constant)).toBeGreaterThan(
      phaseCount(PROGRAMMES.act.file, PROGRAMMES.act.constant),
    );
  });

  for (const [programme, { file, constant }] of Object.entries(PROGRAMMES)) {
    it(`reports as many ${programme} phases as ${constant} defines`, () => {
      // Move them together: a programme that grows a phase needs the literal in
      // `programme_progress` moved with it, or the funnel silently stops
      // printing its last step.
      expect(reported[programme]).toBe(phaseCount(file, constant));
    });
  }
});

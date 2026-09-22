/**
 * ☠️ **The merge gate that makes a hold-out findable** (#2717, decided on #2701).
 *
 * Selftend withholds things from everyone on purpose — a reminder target whose
 * deep link the shipped client cannot route, a tool id it would throw on. Each
 * carries a condition that a later release meets. **Nothing lifts one
 * automatically, and until 2026-09-22 nothing went red while one sat past its
 * condition.** Three did: `dbt` by 13 days, the six DBT step tools by 13, and
 * `general` by 5, across 32 releases in which neither list was ever emptied.
 *
 * This file closes the first half of that — **invisible**. Every entry of every
 * hold-out constant must appear in the register in `docs/releasing.md` with a
 * release and a condition, so someone reading the release recipe can settle it
 * by opening two store pages. The second half — **unchecked** — is the weekly
 * alarm in `.github/workflows/holdout-alarm.yml`.
 *
 * ⛔ **This gate does not lift anything and must never try.** A lift is a
 * judgement about what is live on two stores; it stays a person's.
 *
 * ☠️ **BOTH CONSTANTS ARE EMPTY TODAY, WHICH IS WHY THE FIXTURES BELOW EXIST.**
 * A gate that walks an empty list passes over nothing and would pass exactly the
 * same way if the parser returned `[]`, the markers were deleted, or the
 * comparison were inverted. That is the `registry.test.ts` failure recorded at
 * its line 216 — six stems matched by no probe at all, so a typo in any one
 * would have passed forever *while the docblock cited the very convention it was
 * breaking*. Every assertion here is therefore either exercised against the real
 * document or driven by a synthetic constant list.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { HELD_OUT_REMINDER_TARGETS } from "@/src/features/notifications/reminder-rollout";
import { WITHHELD_STEP_TOOL_IDS } from "@/src/features/routines/step-tool-rollout";

import {
  TABLE_END,
  TABLE_START,
  findHoldoutProblems,
  parseHoldoutTable,
  stillHeld,
  type HoldoutRow,
} from "./holdout-table";

const RELEASING = readFileSync(join(__dirname, "..", "docs", "releasing.md"), "utf8");

/**
 * The constants this gate knows about, by their exported name.
 *
 * ⚠️ **Adding a third hold-out constant means adding it here.** Nothing can
 * detect a constant the gate has never heard of — that is a real limit, stated
 * rather than papered over. What the gate *can* catch is the other direction: a
 * table row naming a constant absent from this map is reported, so the register
 * and this list cannot drift apart silently once a constant is in either.
 */
const LIVE_HOLDOUTS: Record<string, readonly string[]> = {
  HELD_OUT_REMINDER_TARGETS,
  WITHHELD_STEP_TOOL_IDS,
};

describe("the hold-out register ↔ the hold-out constants", () => {
  const rows = parseHoldoutTable(RELEASING);

  it("finds the register between its markers, with the columns both guards read", () => {
    // Non-vacuous: the document really does carry rows, so every assertion
    // below walks something. If this is ever legitimately empty, the guards
    // have nothing to guard and that should be a deliberate, visible change.
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(RELEASING).toContain(TABLE_START);
    expect(RELEASING).toContain(TABLE_END);
  });

  it("records a release and a condition for every entry it lists", () => {
    // The two columns the register exists for. A row without them is a hold-out
    // nobody can settle - which is the state #2717 was filed about.
    for (const row of rows) {
      expect({
        entry: row.entry,
        shippedIn: row.shippedIn === "",
        liftsWhen: row.liftsWhen === "",
      }).toEqual({ entry: row.entry, shippedIn: false, liftsWhen: false });
    }
  });

  it("names only constants this gate knows about", () => {
    const named = [...new Set(rows.map((r) => r.constant))].sort();
    expect(named).toEqual(Object.keys(LIVE_HOLDOUTS).sort());
  });

  it("agrees with the live constants in both directions", () => {
    expect(findHoldoutProblems(LIVE_HOLDOUTS, rows)).toEqual([]);
  });

  it("shows nothing still held out while both constants are empty", () => {
    // Today's true state, asserted rather than assumed - and the thing the
    // weekly alarm reads. If this goes red, either something was held out
    // without emptying the column or a lift forgot its table edit.
    const held = stillHeld(rows).map((r) => `${r.constant}.${r.entry}`);
    const live = Object.entries(LIVE_HOLDOUTS).flatMap(([c, es]) => es.map((e) => `${c}.${e}`));
    expect(held).toEqual(live);
  });
});

/**
 * ☠️ **The positive controls.** Everything above is green against an empty pair
 * of constants; these prove the gate would go red if it should. Each drives the
 * real parser and the real comparison against a synthetic input - the
 * probe-per-member shape, one probe per way the gate can fail.
 */
describe("the hold-out gate, proved against fixtures", () => {
  const rows = parseHoldoutTable(RELEASING);

  const FIXTURE = [
    TABLE_START,
    "",
    "| Constant | Entry | Withholds | Shipped in | Lifts when | Lift issue | Lifted |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "| `DEMO_CONSTANT` | `stillHeld` | a thing | v9.9.9, 2026-01-01 | the build is live | [#1](http://x/1) |  |",
    "| `DEMO_CONSTANT` | `alreadyLifted` | a thing | v9.9.8, 2026-01-01 | the build is live | [#2](http://x/2) | 2026-02-02 |",
    "| `DEMO_CONSTANT` | `noCondition` | a thing | v9.9.7, 2026-01-01 |  | [#3](http://x/3) |  |",
    "",
    TABLE_END,
  ].join("\n");

  it("reads every column off a row, so no cell is silently dropped", () => {
    const [first] = parseHoldoutTable(FIXTURE);
    expect(first).toEqual<HoldoutRow>({
      constant: "DEMO_CONSTANT",
      entry: "stillHeld",
      withholds: "a thing",
      shippedIn: "v9.9.9, 2026-01-01",
      liftsWhen: "the build is live",
      liftIssue: "[#1](http://x/1)",
      lifted: "",
    });
  });

  it("treats an empty Lifted cell, and only that, as still held out", () => {
    expect(stillHeld(parseHoldoutTable(FIXTURE)).map((r) => r.entry)).toEqual([
      "stillHeld",
      "noCondition",
    ]);
  });

  it("catches an entry that is held out in the code and absent from the register", () => {
    // The failure this whole ticket is about: somebody adds a hold-out and does
    // not write it down. Driven against the REAL table, so it proves the real
    // register would reject it.
    const problems = findHoldoutProblems({ HELD_OUT_REMINDER_TARGETS: ["undocumented"] }, rows);
    expect(problems).toEqual([
      {
        constant: "HELD_OUT_REMINDER_TARGETS",
        entry: "undocumented",
        reason: "held out in the code but absent from the hold-out table in docs/releasing.md",
      },
    ]);
  });

  it("catches a row marked lifted whose entry is still in its constant", () => {
    // The lie that would silence the weekly alarm for a live hold-out.
    const problems = findHoldoutProblems({ HELD_OUT_REMINDER_TARGETS: ["dbt"] }, rows);
    expect(problems.map((p) => p.reason)).toEqual([
      expect.stringContaining("the table records it lifted"),
    ]);
  });

  it("catches a row still shown held out whose entry has left its constant", () => {
    // The opposite lie: the register over-claims and the alarm chases a ghost.
    const problems = findHoldoutProblems({ DEMO_CONSTANT: [] }, parseHoldoutTable(FIXTURE));
    expect(problems.map((p) => `${p.entry}: ${p.reason}`)).toEqual([
      'stillHeld: the table shows it still held out (empty "Lifted"), but it is not in DEMO_CONSTANT',
      'noCondition: the table shows it still held out (empty "Lifted"), but it is not in DEMO_CONSTANT',
    ]);
  });

  it("catches a documented entry with no lift condition", () => {
    // Both still-held fixture rows are supplied as live, so the two-way check
    // is satisfied and the ONLY thing left to report is the missing condition.
    // Passing just `noCondition` would also - correctly - report `stillHeld` as
    // a row the constant no longer contains, which would make this probe pass
    // for the wrong reason.
    const problems = findHoldoutProblems(
      { DEMO_CONSTANT: ["stillHeld", "noCondition"] },
      parseHoldoutTable(FIXTURE),
    );
    expect(problems).toEqual([
      {
        constant: "DEMO_CONSTANT",
        entry: "noCondition",
        reason: 'the table gives no "Lifts when" condition',
      },
    ]);
  });

  it("catches a table row naming a constant the gate has never heard of", () => {
    const problems = findHoldoutProblems({}, parseHoldoutTable(FIXTURE));
    expect(problems.map((p) => p.reason)).toEqual([
      expect.stringContaining("names a constant the gate does not know about"),
      expect.stringContaining("names a constant the gate does not know about"),
    ]);
  });

  it("throws rather than reporting an empty register when the markers are gone", () => {
    // ☠️ The one that matters most. Returning [] here would make every
    // assertion above pass over nothing, forever, silently.
    expect(() => parseHoldoutTable("# a document with no table in it")).toThrow(
      /markers are missing/,
    );
  });

  it("throws when a column is renamed, because the alarm reads by position", () => {
    const renamed = FIXTURE.replace("| Lifted |", "| Done |");
    expect(() => parseHoldoutTable(renamed)).toThrow(/columns changed/);
  });
});

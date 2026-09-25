import { HELD_OUT_REMINDER_TARGETS } from "@/src/features/notifications/reminder-rollout";
import { WITHHELD_STEP_TOOL_IDS } from "@/src/features/routines/step-tool-rollout";

/**
 * ☠️ **A hold-out must be findable, or nobody can check it** (#2717, decided on
 * #2701).
 *
 * A hold-out is a change built, shipped in the binary and withheld from EVERY
 * user until something outside this repository comes true. Two constants carry
 * them, and on 2026-09-22 all three then-live entries turned out to have met
 * their own conditions days earlier — `dbt` and the six DBT step tool ids by 13
 * days, `general` by 5.
 *
 * ☠️ **The most expensive of them, `WITHHELD_STEP_TOOL_IDS`, appeared in NO
 * document at all.** `git grep "WITHHELD" docs/releasing.md` returned nothing,
 * so the release step that exists to make someone look could not mention it,
 * and nobody could have found it to check. That is what this gate closes: not
 * whether a condition is met (a fact about two store listings, which no merge
 * gate can know — that is the weekly alarm's, `hold-out-conditions.yml`), but
 * whether the thing exists on paper at all.
 *
 * ⚠️ **Local by construction.** No network, no GitHub issue state, no clock.
 * `store-metadata-drift.yml`'s header is where this repo's division is already
 * written: invariants about the repo gate the merge; a read of a remote system
 * is a weekly alarm, "because a red run here means 'the two copies disagree',
 * which is a question, not a verdict."
 *
 * ☠️ **Both constants are empty today, so every assertion below walks an empty
 * set.** That is the point — the register was seeded green rather than shipped
 * with three grandfathered exceptions, which `docs/positioning.md:468` records
 * being rejected before ("a list that size silently becomes permanent"). What
 * keeps the emptiness from meaning "the parser is broken" is
 * `scripts/lib/hold-outs.test.js`, which proves the same parser against
 * fixtures that DO contain hold-outs. Neither file is worth much without the
 * other, and that split is deliberate: this one may not borrow the fixture's
 * facts, and the fixture may not borrow this one's constants.
 */

const holdOuts = require("../scripts/lib/hold-outs") as {
  HOLD_OUT_CONSTANTS: Record<string, string>;
  readHoldOutTable: () => {
    constant: string;
    entries: string[];
    shippedVersion: string | null;
    condition: string;
    lifted: string;
    heldOut: boolean;
  }[];
};

const { HOLD_OUT_CONSTANTS, readHoldOutTable } = holdOuts;

/**
 * The live constants, by the name the register spells them with.
 *
 * ☠️ Hand-written rather than derived, and pinned against `HOLD_OUT_CONSTANTS`
 * below: a third hold-out constant added to the codebase and not to this map
 * would otherwise escape the gate in silence, which is the exact defect the
 * gate exists for.
 */
const LIVE: Record<string, readonly string[]> = {
  HELD_OUT_REMINDER_TARGETS,
  WITHHELD_STEP_TOOL_IDS,
};

describe("the hold-out register ↔ the constants", () => {
  const rows = readHoldOutTable();

  it("knows the same constants the register does, and no others", () => {
    expect(Object.keys(LIVE).sort()).toEqual(Object.keys(HOLD_OUT_CONSTANTS).sort());
    for (const row of rows) {
      expect(Object.keys(LIVE)).toContain(row.constant);
    }
  });

  it("declares each constant's file, so the register says where to look", () => {
    for (const [name, file] of Object.entries(HOLD_OUT_CONSTANTS)) {
      expect(name).toMatch(/^[A-Z_]+$/);
      expect(file).toMatch(/^src\/.*\.ts$/);
    }
  });

  it.each(Object.keys(LIVE))(
    "%s: every entry still held out has a row in the register marked not-lifted",
    (constant) => {
      const documented = new Set(
        rows
          .filter((row) => row.constant === constant && row.heldOut)
          .flatMap((row) => row.entries),
      );
      const undocumented = [...LIVE[constant]].filter((entry) => !documented.has(entry));

      // The failure message is the whole value of this gate, so it names the
      // section rather than just printing a diff.
      expect({ constant, undocumented }).toEqual({ constant, undocumented: [] });
    },
  );

  it.each(Object.keys(LIVE))(
    "%s: every row marked not-lifted names an entry that is really still held out",
    (constant) => {
      // ⚠️ The other direction, and it is not symmetric bookkeeping. A row left
      // at `—` after its entry was lifted makes the weekly alarm shout about a
      // hold-out that no longer exists — and an alarm that cries wolf is how a
      // guard gets muted, which `store-metadata-drift.yml`'s header warns about
      // in its own case.
      const live = new Set<string>(LIVE[constant]);
      const stale = rows
        .filter((row) => row.constant === constant && row.heldOut)
        .flatMap((row) => row.entries)
        .filter((entry) => !live.has(entry));

      expect({ constant, stale }).toEqual({ constant, stale: [] });
    },
  );

  it("gives every not-lifted row a version the weekly alarm can compare", () => {
    for (const row of rows.filter((r) => r.heldOut)) {
      expect({ entries: row.entries, shippedVersion: row.shippedVersion }).toEqual({
        entries: row.entries,
        shippedVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      });
      expect(row.condition.length).toBeGreaterThan(0);
    }
  });

  it("holds nothing out today, which is why the assertions above walk an empty set", () => {
    // Stated rather than implied, so the vacuity is a recorded fact and not an
    // accident someone has to notice. `scripts/lib/hold-outs.test.js` is what
    // proves the parser still works while this is true.
    expect(HELD_OUT_REMINDER_TARGETS).toEqual([]);
    expect(WITHHELD_STEP_TOOL_IDS).toEqual([]);
    expect(rows.filter((row) => row.heldOut)).toEqual([]);
    expect(rows.length).toBeGreaterThan(0);
  });
});

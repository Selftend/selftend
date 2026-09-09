import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { STEPPABLE_TOOL_IDS } from "@/src/features/routines/derive";
import { routineStepInputSchema } from "@/src/features/routines/schemas";
import {
  WITHHELD_STEP_TOOL_IDS,
  WRITABLE_STEP_TOOL_IDS,
  isWritableStepToolId,
} from "@/src/features/routines/step-tool-rollout";
import {
  OFFERABLE_STEP_TOOL_GROUPS,
  STEP_TOOL_GROUPS,
} from "@/src/features/routines/routine-editor-screen";
import { STARTER_CANDIDATE_TOOLS } from "@/src/features/routines/starter";

/**
 * **A routine step must never be written with a tool id the shipped native
 * client cannot read** (#2203).
 *
 * ☠️☠️ **This is a CROSS-VERSION invariant, and every existing routines test is
 * structurally blind to it.** `tool-routes.test.ts` asserts the route table
 * covers `STEPPABLE_TOOL_IDS`, `derive.test.ts` asserts the predicate handles
 * them, the editor test asserts the picker partitions them - all comparing one
 * ref against itself, all green while the row a web build writes today is
 * unreadable to the phone that reads it tomorrow. The release workflow deploys
 * the database and the web client at merge; Android and iOS wait on Google
 * review and a manual TestFlight promotion. During that window the writer and
 * the reader are different builds, and only the writer can be changed.
 *
 * So the rule pinned here is about writes, never reads: the read vocabulary
 * stays wide (a row from a later build must still render), the write
 * vocabulary is the allowlist, and the database carries the same allowlist
 * because it is the layer that deploys first and covers every writer.
 */
describe("step tool rollout", () => {
  it("splits the steppable set into exactly writable plus withheld", () => {
    // Nothing may be in both, nothing in neither, and nothing withheld that is
    // not steppable in the first place - otherwise a typo here silently
    // withholds nothing at all.
    expect([...WRITABLE_STEP_TOOL_IDS, ...WITHHELD_STEP_TOOL_IDS].sort()).toEqual(
      [...STEPPABLE_TOOL_IDS].sort(),
    );
    expect(WRITABLE_STEP_TOOL_IDS.filter((tool) => WITHHELD_STEP_TOOL_IDS.includes(tool))).toEqual(
      [],
    );
  });

  it("withholds the six DBT ids the shipped client has no route, predicate or label for", () => {
    // Named rather than derived: this list is the delta between the shipped
    // release's vocabulary and this one, and a derived assertion would follow
    // the mistake instead of catching it.
    expect([...WITHHELD_STEP_TOOL_IDS].sort()).toEqual([
      "emotionRecord",
      "judgement",
      "muscleRelaxation",
      "oppositeAction",
      "script",
      "wiseMind",
    ]);
  });

  it("refuses a withheld id as a step input while still accepting every writable one", () => {
    for (const toolId of WITHHELD_STEP_TOOL_IDS) {
      expect(isWritableStepToolId(toolId)).toBe(false);
      expect(routineStepInputSchema.safeParse({ toolId, position: 0 }).success).toBe(false);
    }
    for (const toolId of WRITABLE_STEP_TOOL_IDS) {
      expect(isWritableStepToolId(toolId)).toBe(true);
      expect(routineStepInputSchema.safeParse({ toolId, position: 0 }).success).toBe(true);
    }
    // An id that is not steppable at all is still refused, as before.
    expect(isWritableStepToolId("worry")).toBe(false);
  });

  it("offers no withheld tool in the editor's add-step picker", () => {
    const offered = OFFERABLE_STEP_TOOL_GROUPS.flatMap((group) => group.tools);
    expect(offered.filter((toolId) => WITHHELD_STEP_TOOL_IDS.includes(toolId))).toEqual([]);
    expect([...offered].sort()).toEqual([...WRITABLE_STEP_TOOL_IDS].sort());
    // A group emptied by rollout is dropped whole - no header over no chips.
    expect(OFFERABLE_STEP_TOOL_GROUPS.map((group) => group.key)).not.toContain("dbt");
    expect(OFFERABLE_STEP_TOOL_GROUPS.every((group) => group.tools.length > 0)).toBe(true);
  });

  it("composes no withheld tool into the starter routine", () => {
    // The starter's one-tap "Keep" is a write like any other, and the offer
    // fires for people whose records are exactly the ones a starter composes
    // from - so an unfiltered candidate list is a second door to the same row.
    expect(
      STARTER_CANDIDATE_TOOLS.filter((toolId) => WITHHELD_STEP_TOOL_IDS.includes(toolId)),
    ).toEqual([]);
  });
});

/**
 * The database half of the same invariant. The client guard is the early,
 * legible failure; the CHECK constraint is the one that covers every writer
 * and deploys before any client does.
 *
 * ☠️ Resolved as "the newest migration that declares the constraint", not as a
 * pinned filename: widening the allowlist means a NEW migration (an applied
 * one may never be edited), and pinning the original would leave every later
 * declaration unguarded.
 */
describe("routine_steps tool_id allowlist", () => {
  const MIGRATIONS_DIR = join(__dirname, "..", "..", "..", "supabase", "migrations");
  const CONSTRAINT = "routine_steps_tool_id_allowlisted";

  const declaration = (() => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .filter((f) =>
        readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(`add constraint ${CONSTRAINT}`),
      );
    const newest = files.at(-1);
    return newest
      ? { file: newest, sql: readFileSync(join(MIGRATIONS_DIR, newest), "utf8") }
      : null;
  })();

  it("is declared by a migration", () => {
    expect(declaration).not.toBeNull();
  });

  it("allows exactly the ids the client may write", () => {
    // ☠️ The two halves of a widening - dropping an id from
    // WITHHELD_STEP_TOOL_IDS and adding it to the constraint - must land in
    // the same change. Half of it alone either writes a row the database
    // rejects, or reopens the window this guard closes.
    const body = /add constraint routine_steps_tool_id_allowlisted[\s\S]*?\)\s*\)/.exec(
      declaration!.sql,
    );
    expect(body).not.toBeNull();

    const allowed = [...body![0].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(allowed.sort()).toEqual([...WRITABLE_STEP_TOOL_IDS].sort());
  });

  it("agrees with the client's steppable set AND the editor's picker, in one place (#2242)", () => {
    // ☠️ Three hand-written lists must name the same ids: this constraint, the
    // client's `STEPPABLE_TOOL_IDS`, and the editor's `STEP_TOOL_GROUPS` - and
    // nothing derives one from another. The relations were pinned pairwise
    // across two files (constraint == writable here; groups == steppable in
    // routine-editor-screen.test.tsx), which holds, but the next person adding
    // a tool reads one file. So all three are related HERE, as sets, with the
    // withheld ids subtracted on the client side because the constraint is the
    // write vocabulary and the other two are the read vocabulary. A tool added
    // to the client and not the migration is a constraint violation in
    // production - the database deploys first and unconditionally - and this
    // is what turns that into a red build instead.
    const body = /add constraint routine_steps_tool_id_allowlisted[\s\S]*?\)\s*\)/.exec(
      declaration!.sql,
    );
    const constrained = [...body![0].matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]).sort();
    const withheld = new Set<string>(WITHHELD_STEP_TOOL_IDS);
    const steppable = STEPPABLE_TOOL_IDS.filter((tool) => !withheld.has(tool)).sort();
    const offered = STEP_TOOL_GROUPS.flatMap((group) => group.tools)
      .filter((tool) => !withheld.has(tool))
      .sort();

    expect(constrained.length).toBeGreaterThan(0);
    expect(constrained).toEqual(steppable);
    expect(constrained).toEqual(offered);
    // And the two client lists agree on the withheld ids too - the read
    // vocabulary is one set, not a constraint-shaped subset of it.
    expect([...STEP_TOOL_GROUPS.flatMap((group) => group.tools)].sort()).toEqual(
      [...STEPPABLE_TOOL_IDS].sort(),
    );
  });

  it("binds new writes without re-validating rows already in the table", () => {
    // NOT VALID still enforces on INSERT and UPDATE - the whole point - while
    // leaving pre-existing rows alone, so a staging database that already
    // carries a DBT-tooled step cannot wedge the deploy over data that becomes
    // legal again the moment the allowlist widens.
    expect(declaration!.sql).toMatch(/not valid\s*;/);
  });
});

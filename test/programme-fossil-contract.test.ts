import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  ACT_PROGRAM_KEYS,
  CBT_PROGRAM_KEYS,
  DBT_PROGRAM_KEYS,
  abandonProgramPatch,
  advancePhasePatch,
  dismissGraduationPatch,
  dismissProgramPromptPatch,
  replayProgramPatch,
  showProgramPromptPatch,
  startProgramPatch,
  type ProgramPreferenceKeys,
} from "@/src/features/modules/program-patches";

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const APP = join(ROOT, "app");

/**
 * ☠️ **Nothing may null `*_program_phase_started_at`.** (ADR-0012, #2530, #2551)
 *
 * That column outliving a null `*_program_started_at` is the ONLY record that a
 * programme run ever existed and how far it got. #2530 refused to keep the two
 * dates a run would otherwise carry — when it began and when it was left — on
 * data-minimisation grounds, and that refusal is only coherent because this one
 * fact survives. Null it and the app is back to #2386: someone who reached
 * phase 4 and stopped becomes indistinguishable from someone who never opened
 * the module, and no report can tell them apart afterwards.
 *
 * ⚠️ **It exists today by omission, not by design** — `abandonProgram` simply
 * never cleared it. An omission is exactly what a tidy-up removes: the abandon
 * payload (`abandonProgramPatch` since #2810) nulls `started_at` right beside
 * it, and "finish the job" is the obvious-looking edit. This guard is what
 * makes the omission a contract, and the ADR says in as many words that
 * without it the ruling is a comment.
 *
 * ⚠️ A behavioural test over the three hooks would pin only the writers that
 * exist today. This is a source-level scan of every file the app ships, so a
 * NEW writer — a settings reset, a fourth module, a migration helper — trips it
 * on the day it is written rather than the day somebody reads a report and
 * notices the runs are gone.
 *
 * ☠️ The invariant is *nothing nulls an EXISTING value*, not *the token `null`
 * never appears beside this column name*. `defaultUserPreferences` is the shape
 * of a brand-new account, where every programme column is legitimately null
 * because no run has happened yet — it is allowed below, and it is the only
 * thing that is.
 */

/** Files permitted to associate these columns with `null`, each with its reason. */
const ALLOWED: { file: string; why: string }[] = [
  {
    file: join("src", "features", "modules", "types.ts"),
    why: "defaultUserPreferences - the initial state of a brand-new account, not a writer clearing an existing record",
  },
];

/**
 * A write that nulls the column, in the shapes an object payload can take:
 * `cbtProgramPhaseStartedAt: null`, with any whitespace, and the snake_case
 * spelling in case a raw payload is ever assembled by hand.
 */
const NULLING = [
  /\b(cbt|act|dbt)ProgramPhaseStartedAt\s*:\s*null\b/,
  /\b(cbt|act|dbt)_program_phase_started_at\s*(?::|=)\s*null\b/i,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (entry === "node_modules" || entry.startsWith(".")) return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

function isAllowed(relPath: string): boolean {
  return ALLOWED.some((entry) => relPath === entry.file);
}

describe("the programme fossil is a contract, not an accident", () => {
  const files = [...sourceFiles(SRC), ...sourceFiles(APP)];

  it("scans a non-trivial number of shipped source files", () => {
    // A guard that silently matched nothing would pass forever. Pin that the
    // sweep is actually reaching the app.
    expect(files.length).toBeGreaterThan(200);
  });

  it("finds no code anywhere that nulls `*_program_phase_started_at`", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const relPath = relative(ROOT, file);
      if (isAllowed(relPath)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (NULLING.some((pattern) => pattern.test(line))) {
          offenders.push(`${relPath}:${index + 1}  ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  /**
   * ☠️ The allowlist is the part that rots. A file listed here that no longer
   * needs to be would silently widen the contract's one exception, so pin that
   * every entry still earns its place.
   */
  it("keeps every allowlist entry justified and still nulling", () => {
    for (const entry of ALLOWED) {
      const source = readFileSync(join(ROOT, entry.file), "utf8");
      expect(NULLING.some((pattern) => pattern.test(source))).toBe(true);
      expect(entry.why.length).toBeGreaterThan(20);
    }
    // One exception, and it is the new-account default. If this number grows,
    // the growth was a decision and ADR-0012 should say so.
    expect(ALLOWED).toHaveLength(1);
  });

  /**
   * The positive half: abandoning nulls `started_at` and leaves the fossil
   * standing. The scan above proves nothing ELSE clears the column; since
   * #2810 the three hooks build every payload through the shared
   * `program-patches.ts` builders, so the one writer is pinned here as data.
   *
   * ⚠️ `toEqual` on the whole patch, not `toHaveProperty` per column: the
   * builders assemble payloads from computed keys the regex sweep above cannot
   * see, so an added `phaseStartedAt: null` inside a builder would slip a
   * property-by-property check that forgot to list it. An exact shape cannot
   * be widened silently.
   */
  const PROGRAM_KEYS: [string, ProgramPreferenceKeys][] = [
    ["cbt", CBT_PROGRAM_KEYS],
    ["act", ACT_PROGRAM_KEYS],
    ["dbt", DBT_PROGRAM_KEYS],
  ];
  const NOW = "2026-09-29T00:00:00.000Z";

  it.each(PROGRAM_KEYS)(
    "%s: abandon nulls the start, hides the prompt, and writes nothing else",
    (_module, keys) => {
      expect(abandonProgramPatch(keys, NOW)).toEqual({
        [keys.startedAt]: null,
        [keys.promptDismissedAt]: NOW,
        // Absent on purpose, and the absences ARE the contract: `phaseIndex`
        // and `phaseStartedAt` are the fossil, `completedAt` is the finish
        // that leaving must not erase (ADR-0012).
      });
    },
  );

  it.each(PROGRAM_KEYS)("%s: no patch builder ever nulls the fossil", (_module, keys) => {
    const patches = [
      startProgramPatch(keys, NOW),
      replayProgramPatch(keys, NOW),
      dismissProgramPromptPatch(keys, NOW),
      showProgramPromptPatch(keys),
      abandonProgramPatch(keys, NOW),
      dismissGraduationPatch(keys, NOW),
      advancePhasePatch(keys, 0, 5, NOW),
      advancePhasePatch(keys, 4, 5, NOW),
    ];

    for (const patch of patches) {
      if (keys.phaseStartedAt in patch) {
        expect(patch[keys.phaseStartedAt]).not.toBeNull();
      }
    }
  });
});

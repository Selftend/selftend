import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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
 * never cleared it. An omission is exactly what a tidy-up removes: the three
 * abandon bodies null `started_at` right beside it, and "finish the job" is the
 * obvious-looking edit. This guard is what makes the omission a contract, and
 * the ADR says in as many words that without it the ruling is a comment.
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
   * The positive half: the three abandon bodies null `started_at` and leave the
   * fossil standing. The scan above proves nothing clears it; this proves the
   * abandon path is still the thing that creates it.
   */
  it("still has all three abandon paths nulling the start and nothing else", () => {
    for (const module of ["cbt", "act", "dbt"] as const) {
      const source = readFileSync(
        join(SRC, "features", module, `use-${module}-program.ts`),
        "utf8",
      );
      const abandon = source.slice(source.indexOf("const abandonProgram"));
      // ⚠️ Comments stripped first. Each abandon body NAMES the columns it
      // deliberately leaves alone, so matching raw source here would read the
      // explanation as the thing it warns against.
      const body = abandon
        .slice(0, abandon.indexOf("};"))
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");

      // A write is the identifier followed by a colon; a mention is not.
      const writes = (column: string) => new RegExp(`${module}Program${column}\\s*:`);

      expect(body).toMatch(new RegExp(`${module}ProgramStartedAt\\s*:\\s*null`));
      expect(body).not.toMatch(writes("PhaseStartedAt"));
      expect(body).not.toMatch(writes("PhaseIndex"));
      // ADR-0012 again: leaving must not erase that you once finished either.
      expect(body).not.toMatch(writes("CompletedAt"));
    }
  });
});

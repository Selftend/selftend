import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments, stripCommentsAndStrings } from "@/test/source-scan";

/**
 * **Every mutation that writes a `record_days` source table has to invalidate
 * it** (#1906, inherited from #1904).
 *
 * ☠️ **This is the one query in the app no feature's own invalidation can
 * reach.** ADR-0001 keeps a stats query under the same key root as the list it
 * summarises, so a feature's save and delete invalidation covers both. That
 * cannot apply to `record_days`: it spans ten tables, so it has no owning
 * feature and sits under its own root, `recordDaysKeys.all`. With the client's
 * 60s default `staleTime`, a write that does not invalidate leaves a
 * just-logged day **unmarked** on the one screen whose whole job is to state
 * that the record exists.
 *
 * ☠️☠️ **THIS GUARD IS PER-MUTATION, AND THE FIRST DRAFT WAS PER-MODULE.** That
 * draft asked only whether a *file* mentioned the invalidator anywhere, and it
 * let a real bug through: `useUpsertHabitLogNote` writes `habit_logs` with a
 * plain INSERT the view's trigger merges - so a note on a day with no tick
 * CREATES the log and the marked day - and `habits/queries.ts` already counted
 * as covered because `useToggleHabitLog` invalidates. Module granularity also
 * means deleting one call site of two stays green. Both are why the walk below
 * is per exported hook.
 *
 * ☠️ **Derived from the migration and from source, never pinned.** A list of
 * file paths would go stale the day an eleventh tool lands, and it would go
 * stale silently - the exact failure this exists to stop.
 *
 * The rule is deliberately coarse: **any mutation writing a source table
 * invalidates**, whether or not that particular edit could move a civil day.
 * Deciding per mutation is the judgement that rots - a sleep window files on
 * the night it BEGAN (#800), an activity counts only once completed, and
 * archiving is the thought record's delete. One redundant refetch costs less
 * than one wrong absence, and the redundancy is close to free: this root has no
 * observer outside "Looking back", so a call from anywhere else only marks it
 * stale rather than fetching anything.
 *
 * ⚠️ **Provenance: salvaged from PR #1925**, a parallel implementation of #1906
 * that duplicated the shipped one and could not merge. Its behavioural sibling
 * (`src/features/progress/record-days-invalidation.test.tsx`) proves the
 * invalidation actually FIRES, which a text scan cannot see; this proves no
 * writing hook was missed, which a hand-written table of call sites cannot see.
 * Keep both - neither subsumes the other. Adopting the coarse rule here is what
 * added `useSaveActivity`, `useSetGratitudeEntryStarred` and
 * `useUpdateMeditationSessionReflection`, which the precise rule had excluded
 * on a correct-today judgement that nothing was holding in place.
 */
const ROOT = join(__dirname, "..");
const MIGRATION = "supabase/migrations/20260907000000_record_days.sql";

/**
 * Every `public.*` table the RPC reads, `_data` suffix dropped.
 *
 * ⚠️ Every `public.<name>`, not only `from public.<name> as <alias>`: the
 * narrower shape misses a source reached by a `join`, or by a `from` with no
 * alias, and nothing here could see the gap.
 *
 * ☠️ **SQL COMMENTS ARE STRIPPED FIRST, AND THAT IS LOAD-BEARING.** This
 * migration's prose deliberately NAMES every excluded table - `exposure_sessions`,
 * `worry_entries`, `anger_logs` and the rest - to record why they are out. None
 * carries a `public.` prefix today, so a raw match is right only by luck; one
 * comment writing `public.exposure_sessions` would make this guard demand
 * invalidation for a table nothing writes. `record-days-sources.test.ts` dodges
 * the hazard by reading `from` clauses only; this reads everything, so it has to
 * drop the prose instead.
 */
function sourceTables(): string[] {
  const sql = readFileSync(join(ROOT, MIGRATION), "utf8")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  const names = [...sql.matchAll(/\bpublic\.(\w+)/g)]
    .map((match) => match[1].replace(/_data$/, ""))
    // The function's own name and the day-key helper it calls are not tables.
    .filter((name) => !["record_days", "occurrence_day_key"].includes(name));
  return [...new Set(names)].sort();
}

const REPOSITORIES = sourceFiles(ROOT, { dirs: ["src", "app"] }).filter((file) =>
  file.endsWith("/repository.ts"),
);
const MODULES = sourceFiles(ROOT, { dirs: ["src", "app"] });

const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

/** Top-level `export function name(` blocks, as [name, body] pairs. */
function exportedFunctions(source: string): [string, string][] {
  const parts = source.split(/^export (?:async )?function /m).slice(1);
  return parts.map((part) => [part.slice(0, part.indexOf("(")).trim(), part]);
}

/**
 * The repository functions that actually WRITE `table`.
 *
 * Per table rather than per repository: one repository can own several tables -
 * `meditation/repository.ts` writes `meditation_sessions`, but also
 * `meditation_program_state`, which `record_days` never reads. A repository-wide
 * rule would demand invalidation from mutations that cannot touch the marks.
 */
function writeFunctionsFor(table: string): { repository: string; names: string[] } | null {
  for (const repository of REPOSITORIES) {
    const source = stripComments(read(repository));
    if (!new RegExp(`["']${table}["']`).test(source)) continue;

    const names = exportedFunctions(source)
      .filter(
        ([, body]) =>
          new RegExp(`\\.from\\(["']${table}["']\\)`).test(body) &&
          /\.(insert|update|upsert|delete)\s*\(/.test(body),
      )
      .map(([name]) => name);
    if (names.length > 0) return { repository, names };
  }
  return null;
}

/** Every exported hook that runs a mutation over one of `names`. */
function writingHooks(names: string[]): { module: string; hook: string }[] {
  const found: { module: string; hook: string }[] = [];
  for (const module of MODULES) {
    if (module.endsWith("/repository.ts")) continue;
    const source = read(module);
    if (!names.some((name) => source.includes(name))) continue;

    for (const [hook, body] of exportedFunctions(stripComments(source))) {
      const code = stripCommentsAndStrings(body);
      const mutates = /\buse(Delete)?Mutation\s*\(/.test(code);
      if (mutates && names.some((name) => new RegExp(`\\b${name}\\b`).test(code))) {
        found.push({ module, hook });
      }
    }
  }
  return found;
}

/**
 * Both spellings, because the two reach the same root by different routes:
 * `invalidateRecordDays(queryClient)` in a hook's own `onSuccess`, and
 * `recordDaysKeys.all` passed to `useDeleteMutation`, which takes a KEY rather
 * than a client and so cannot call the helper.
 */
const INVALIDATES = /\binvalidateRecordDays\s*\(|\brecordDaysKeys\.all\b/;

describe("every mutation that writes a record_days source invalidates it", () => {
  /**
   * Positive control on the derivation: a renamed migration or a changed shape
   * would return an empty list and make the assertion below vacuously green.
   *
   * ⚠️ Deliberately a FLOOR, not the exact ten. `record-days-sources.test.ts`
   * (#1904) already pins the membership of that set, and a second copy of the
   * list is a second thing to update - one that goes stale-green if only the
   * other is edited. What this file needs is that the walk found the sources,
   * not what they are; an 11th lands here as one more table to check rather
   * than as a list to re-type.
   */
  it("derives the record-days sources from the migration itself", () => {
    expect(sourceTables().length).toBeGreaterThanOrEqual(10);
    expect(sourceTables()).toContain("habit_logs");
    expect(sourceTables()).toContain("mindfulness_sessions");
    expect(REPOSITORIES.length).toBeGreaterThan(10);
  });

  /**
   * The other half of that control: every name the walk produced is a real
   * table some repository writes. A bogus name - prose swept in, a helper
   * mistaken for a table - fails here rather than silently widening the set.
   */
  it("finds writing functions for every source table", () => {
    const missing = sourceTables().filter((table) => !writeFunctionsFor(table));

    expect(missing).toEqual([]);
  });

  /**
   * The assertion itself, per hook.
   *
   * ☠️ `mindfulness_sessions` has TWO writers - breathing and grounding both
   * save into it - so a per-table count of one would be wrong, and several
   * features split save and delete across one module. The set is derived, and
   * the floor below only guards against the walk silently finding nothing.
   */
  it("every hook mutating a source table invalidates the record-days root", () => {
    const offenders: string[] = [];
    let checked = 0;

    for (const table of sourceTables()) {
      const write = writeFunctionsFor(table);
      if (!write) continue;

      for (const { module, hook } of writingHooks(write.names)) {
        checked += 1;
        const body = exportedFunctions(stripComments(read(module))).find(
          ([name]) => name === hook,
        )?.[1];
        // ⚠️ Comments and strings blanked: a note explaining why a hook does not
        // need the helper must not read as the helper being called.
        if (!INVALIDATES.test(stripCommentsAndStrings(body ?? ""))) {
          offenders.push(`${table}: ${module} -> ${hook}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(15);
  });
});

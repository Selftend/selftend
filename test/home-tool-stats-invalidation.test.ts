import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments, stripCommentsAndStrings } from "@/test/source-scan";

/**
 * **Every mutation that writes a `home_tool_stats` source table has to invalidate
 * it** (#2212).
 *
 * ☠️ **This is the second query in the app no feature's own invalidation can reach**
 * — `record_days` (#1906) was the first, and this file is its sibling. ADR-0001 keeps
 * a stats query under the same key root as the list it summarises, so a feature's
 * save and delete invalidation covers both. That cannot apply here: `home_tool_stats`
 * spans seven tables across eight tools, so it has no owning feature and sits under
 * its own root, `homeToolStatsKeys.all`. With the client's 60s default `staleTime`, a
 * write that does not invalidate leaves a just-logged entry uncounted on the first
 * screen the person sees — and Home is mounted behind every tool, so a
 * refetch-on-mount would not cover it either.
 *
 * ☠️☠️ **PER EXPORTED HOOK, not per module** — the lesson `record-days-invalidation`
 * paid for: a file-level scan lets a second writing hook in an already-covered module
 * through (`useUpsertHabitLogNote` was exactly that bug), and deleting one call site
 * of two stays green.
 *
 * ☠️ **Derived from the migration and from source, never pinned.** A list of file
 * paths would go stale the day a ninth tool lands, and silently — the exact failure
 * this exists to stop.
 *
 * The rule is deliberately coarse: **any mutation writing a source table
 * invalidates**, whether or not that particular edit could move a figure. Deciding
 * per mutation is the judgement that rots, and the redundancy is cheap: the aggregate
 * is one small row set with at most eight observers, so a call from a mutation that
 * could not have moved a number costs one refetch of one query.
 */
const ROOT = join(__dirname, "..");

/**
 * The migration whose `home_tool_stats` declaration wins — the newest by version
 * order, resolved the way `record-days-invalidation.test.ts` resolves its own. ☠️
 * Pinning the original file would leave a redeclaration's new legs unguarded.
 */
const DECLARATION = "create or replace function public.home_tool_stats";
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const MIGRATION = (() => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(DECLARATION));
  return files[files.length - 1];
})();

/** The body of `name`'s newest declaration, prose stripped, or null if it has none. */
function declarationBody(name: string): string | null {
  const declaration = `create or replace function public.${name}`;
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(declaration));
  if (files.length === 0) return null;
  const file = readFileSync(join(MIGRATIONS_DIR, files[files.length - 1]), "utf8");
  const start = file.indexOf(declaration);
  const end = file.indexOf("\n$$;", start);
  if (end === -1) return null;
  return file
    .slice(start, end)
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * Every `public.*` table the RPC reads, `_data` suffix dropped — **transitively** —
 * and every function it went through to get there.
 *
 * ☠️☠️ **The transitive step is the whole point.** `home_tool_stats` deliberately
 * CALLS the tools' own aggregates rather than restating them, so `sleep_logs` is
 * reached only through `sleep_stats(p_time_zone)` and appears nowhere in this
 * function's own text. A guard reading only the top-level `from` clauses would let
 * every sleep write path off, and the sleep card would be the one that goes stale.
 *
 * ☠️☠️ **A call is not always a `from`.** Only ONE of the four aggregates this
 * function calls sits in a `from` clause; the other three are plpgsql assignments
 * — `journal_words := public.journal_word_total()`,
 * `breathing_minutes := public.breathing_total_minutes(grounding)`,
 * `meditation_median := public.meditation_median_minutes()`. A walk that followed
 * only `from public.<name>(` saw none of them. It missed no table today only
 * because all three read tables the function also reads directly — a coincidence
 * of the current eight, not a property of the rule. So calls are followed
 * WHEREVER they appear, and tables are taken from `from` clauses that are not
 * calls.
 *
 * ☠️ SQL COMMENTS ARE STRIPPED FIRST: the prose in these migrations names tables it
 * is explaining rather than reading.
 */
function sourceGraph(): { tables: string[]; followed: string[] } {
  const seen = new Set<string>(["home_tool_stats"]);
  const tables = new Set<string>();

  const walk = (sql: string) => {
    for (const match of sql.matchAll(/\bfrom\s+public\.(\w+)\s*(\()?/g)) {
      const [, name, isCall] = match;
      if (!isCall) tables.add(name.replace(/_data$/, ""));
    }
    // Every invocation, `from` clause or assignment - resolved to that function's
    // own newest declaration, whose tables fold in.
    for (const match of sql.matchAll(/\bpublic\.(\w+)\s*\(/g)) {
      const name = match[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const body = declarationBody(name);
      if (body) walk(body);
    }
  };

  const body = declarationBody("home_tool_stats");
  expect(body).not.toBeNull();
  walk(body!);
  // The seed is the function itself, not something the walk found.
  seen.delete("home_tool_stats");
  return { tables: [...tables].sort(), followed: [...seen].sort() };
}

const sourceTables = (): string[] => sourceGraph().tables;

/**
 * A repository is `<feature>/repository.ts` OR one file of a `<feature>/repository/`
 * directory — ACT and DBT split theirs per table.
 */
const isRepository = (file: string) =>
  file.endsWith("/repository.ts") || /\/repository\/[^/]+\.ts$/.test(file);

const REPOSITORIES = sourceFiles(ROOT, { dirs: ["src", "app"] }).filter(isRepository);
const MODULES = sourceFiles(ROOT, { dirs: ["src", "app"] });

const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

/** Top-level `export function name(` blocks, as [name, body] pairs. */
function exportedFunctions(source: string): [string, string][] {
  const parts = source.split(/^export (?:async )?function /m).slice(1);
  return parts.map((part) => [part.slice(0, part.indexOf("(")).trim(), part]);
}

/** The repository functions that actually WRITE `table`. */
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
    if (isRepository(module)) continue;
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
 * `invalidateHomeToolStats(queryClient)` in a hook's own `onSuccess`/`onSettled`, and
 * `homeToolStatsKeys.all` passed to `useDeleteMutation`, which takes KEYS rather than
 * a client and so cannot call the helper.
 */
const INVALIDATES = /\binvalidateHomeToolStats\s*\(|\bhomeToolStatsKeys\.all\b/;

describe("every mutation that writes a home_tool_stats source invalidates it", () => {
  /**
   * Positive control on the derivation: a renamed migration or a changed shape would
   * return an empty list and make the assertion below vacuously green.
   *
   * ⚠️ A FLOOR plus a name only the transitive walk can reach. `sleep_logs` appears
   * nowhere in `home_tool_stats` itself and enters the set only through
   * `sleep_stats` — if it drops out, the walk has stopped following calls and every
   * sleep write path silently stops being checked.
   *
   * ☠️ The other three tables named here are read DIRECTLY as well, so they cannot
   * speak for the walk — `journal_entries` is in this set whether or not
   * `journal_word_total()` is ever followed, which is what an earlier version of
   * this comment claimed it proved. The walk's other half is asserted below,
   * against the functions it went through.
   */
  it("derives the sources from the migration itself, following the functions it calls", () => {
    const tables = sourceTables();

    expect(MIGRATION).toBe("20260913000000_home_tool_stats.sql");
    expect(tables.length).toBeGreaterThanOrEqual(8);
    expect(tables).toContain("sleep_logs");
    expect(tables).toContain("journal_entries");
    expect(tables).toContain("mindfulness_sessions");
    expect(tables).toContain("habit_logs");
    expect(REPOSITORIES.length).toBeGreaterThan(10);
  });

  /**
   * The control the one above cannot be: **every aggregate the RPC calls is
   * followed, however it is called.** Three of the four are plpgsql assignments
   * (`x := public.f()`), which no `from`-anchored walk can see; today they read
   * tables the RPC also reads directly, so their absence costs nothing and shows
   * as nothing. A ninth tool reached only that way would arrive with no
   * invalidation guard at all and the suite would stay green.
   */
  it("follows an aggregate invoked as an assignment, not only one in a FROM clause", () => {
    const { followed } = sourceGraph();

    expect(followed).toContain("sleep_stats"); // from public.sleep_stats(...)
    expect(followed).toContain("journal_word_total"); // journal_words := ...
    expect(followed).toContain("breathing_total_minutes"); // breathing_minutes := ...
    expect(followed).toContain("meditation_median_minutes"); // meditation_median := ...
    // Each of those resolved to a real declaration - a name with no migration
    // behind it would be followed into nothing and prove the walk works over an
    // empty body.
    for (const name of ["sleep_stats", "journal_word_total", "meditation_median_minutes"]) {
      expect(declarationBody(name)).not.toBeNull();
    }
  });

  /**
   * The other half of that control: every name the walk produced is a real table some
   * repository writes. A bogus name — prose swept in, a function mistaken for a table
   * — fails here rather than silently widening the set.
   */
  it("finds writing functions for every source table", () => {
    const missing = sourceTables().filter((table) => !writeFunctionsFor(table));

    expect(missing).toEqual([]);
  });

  it("every hook mutating a source table invalidates the Home stats root", () => {
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
        // ⚠️ Comments and strings blanked: a note explaining why a hook does not need
        // the helper must not read as the helper being called.
        if (!INVALIDATES.test(stripCommentsAndStrings(body ?? ""))) {
          offenders.push(`${table}: ${module} -> ${hook}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(15);
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { LOCAL_SUPABASE_URL, createServiceClient, signInAs } from "./helpers";

// The half of #429 that needs a database.
//
// `test/export-user-data-monotonic.test.ts` proves the winning
// `export_user_data` declaration never LOSES a column an earlier declaration
// exported. It is structurally blind to the other failure: a column (or a
// whole table) that NO declaration ever exported, because there is nothing to
// compare against. That blindness is not hypothetical - its first live run
// found eleven such columns (#435), and this check's first run found two such
// tables (`breathing_exercises`, `feedback_submissions`, repaired in
// 20260804000000).
//
// So this suite diffs the winning declaration against the LIVE schema:
//
//   1. every column of every table the export reads is either exported or
//      named in supabase/README.md "What the export deliberately withholds";
//   2. every live public table carrying a `user_id` column is either read by
//      the export or named there;
//   3. every withheld entry still matches something real, so the allowlist
//      cannot quietly rot into a list of exemptions nothing needs.
//
// The live schema comes from PostgREST's OpenAPI root - the REST surface is
// the only connection integration tests have - which lists every exposed
// public table and view with its columns. The declaration comes from the
// migrations directory, because the deployed function IS the winning
// declaration by version order (the monotonic suite polices that ordering).

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");
const README = join(__dirname, "..", "..", "supabase", "README.md");

const DECLARATION = "create or replace function public.export_user_data";

// Same shape as the monotonic suite's parser (kept in sync by the sentinel
// assertions below): every `select <bare columns> from public.<table>` in the
// winning declaration. Bare identifiers only - an expression would silently
// fall out of the match, which the plausible-size guard pins.
const READ = /select\s+((?:[a-z_][a-z0-9_]*\s*,\s*)*[a-z_][a-z0-9_]*)\s+from\s+public\.(\w+)\b/gi;

function winningDeclarationFile(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(DECLARATION));
  return files[files.length - 1];
}

/** table -> set of columns the winning declaration reads. */
function declarationReads(): Map<string, Set<string>> {
  const source = readFileSync(join(MIGRATIONS_DIR, winningDeclarationFile()), "utf8");
  const body = source.slice(source.indexOf(DECLARATION));
  const reads = new Map<string, Set<string>>();
  for (const match of body.matchAll(READ)) {
    const table = match[2];
    if (!reads.has(table)) reads.set(table, new Set());
    for (const column of match[1].split(",")) reads.get(table)!.add(column.trim());
  }
  return reads;
}

interface WithheldRules {
  // [tablePattern, columnPattern, sourceText]
  columns: [RegExp, RegExp, string][];
  // [tablePattern, sourceText]
  tables: [RegExp, string][];
}

function patternToRegex(pattern: string): RegExp {
  return new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9_]*")}$`,
  );
}

/**
 * The withheld-list is READ FROM THE README, not from a constant here, so the
 * documentation humans read and the gate machines enforce cannot drift apart.
 * A new withheld column must be added there, with a reason, or this suite
 * fails; an entry that stops matching anything real fails the staleness check.
 */
function withheldRules(): WithheldRules {
  const readme = readFileSync(README, "utf8");
  const sectionStart = readme.indexOf("### What the export deliberately withholds");
  expect(sectionStart).toBeGreaterThan(-1);
  const section = readme.slice(sectionStart, readme.indexOf("\n## ", sectionStart));
  const rules: WithheldRules = { columns: [], tables: [] };
  // \s+ before the closing pipe, not a single space: prettier pads table
  // cells to align the columns, and CI runs on the prettified file.
  for (const match of section.matchAll(/^\| `([a-z0-9_.*]+)`\s+\|/gim)) {
    const entry = match[1];
    if (entry.includes(".")) {
      const [table, column] = entry.split(".");
      rules.columns.push([patternToRegex(table), patternToRegex(column), entry]);
    } else {
      rules.tables.push([patternToRegex(entry), entry]);
    }
  }
  return rules;
}

/** table -> live columns, from PostgREST's OpenAPI root. */
async function liveSchema(): Promise<Map<string, Set<string>>> {
  const client = createServiceClient();
  // supabase-js carries the service key; the raw fetch needs it spelled out.
  const key = (client as unknown as { supabaseKey: string }).supabaseKey;
  const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  expect(response.ok).toBe(true);
  const swagger = (await response.json()) as {
    definitions: Record<string, { properties?: Record<string, unknown> }>;
  };
  const live = new Map<string, Set<string>>();
  for (const [table, def] of Object.entries(swagger.definitions)) {
    live.set(table, new Set(Object.keys(def.properties ?? {})));
  }
  return live;
}

describe("export_user_data covers the live schema", () => {
  let live: Map<string, Set<string>>;
  const reads = declarationReads();
  const rules = withheldRules();

  beforeAll(async () => {
    live = await liveSchema();
  });

  const columnWithheld = (table: string, column: string) =>
    rules.columns.some(([t, c]) => t.test(table) && c.test(column));

  /**
   * A table rule alone is not enough to withhold an encryption base table:
   * the README's `*_data` entry says "exported through its decrypting view",
   * and this VERIFIES that claim per table rather than taking the name as
   * proof (review finding on #449). A `foo_data` is justified only when the
   * `foo` view exists live, the export reads it, and every base-only column
   * is `*_enc` ciphertext - so a future user-owned table that merely NAMES
   * itself `*_data`, or a plaintext field added only to a base table and
   * never surfaced in its view, both fail loudly instead of being exempt.
   */
  const dataTwinJustified = (table: string): boolean => {
    if (!table.endsWith("_data")) return true;
    const twin = table.slice(0, -"_data".length);
    const twinColumns = live.get(twin);
    if (!twinColumns || !reads.has(twin)) return false;
    const baseOnly = [...(live.get(table) ?? [])].filter((c) => !twinColumns.has(c));
    return baseOnly.every((c) => c.endsWith("_enc"));
  };
  const tableWithheld = (table: string) =>
    rules.tables.some(([t]) => t.test(table)) && dataTwinJustified(table);

  it("parses a plausible amount of everything (guards the parsers, not the export)", () => {
    // Any of these collapsing to ~zero would make the diffs below vacuously
    // green - the same silent-parser failure mode the monotonic suite pins.
    expect([...reads.values()].reduce((n, s) => n + s.size, 0)).toBeGreaterThan(400);
    expect(reads.size).toBeGreaterThan(40);
    expect(live.size).toBeGreaterThan(40);
    expect(rules.columns.length).toBeGreaterThanOrEqual(5);
    expect(rules.tables.length).toBeGreaterThanOrEqual(1);
    // Sentinels: one recent column, and this check's own first catch.
    expect(reads.get("user_preferences")).toContain("theme");
    expect(reads.get("breathing_exercises")).toContain("name");
  });

  it("exports (or documents withholding) every column of every table it reads", () => {
    const missing: string[] = [];
    for (const [table, declared] of reads) {
      const liveColumns = live.get(table);
      // A table the declaration reads but the live schema lacks is caught by
      // the migration applying at all; skip rather than crash on undefined.
      if (!liveColumns) continue;
      for (const column of liveColumns) {
        if (!declared.has(column) && !columnWithheld(table, column)) {
          missing.push(`${table}.${column}`);
        }
      }
    }
    // A new column reached a table the export covers without joining the
    // export. Add it to the declaration in the SAME migration (README
    // "Modifying export_user_data"), or - only if it is scoping, a secret,
    // bookkeeping, or plumbing - name it under "What the export deliberately
    // withholds" with its reason.
    expect(missing.sort()).toEqual([]);
  });

  it("reads (or documents withholding) every live table that carries user_id", () => {
    const uncovered: string[] = [];
    for (const [table, columns] of live) {
      if (!columns.has("user_id")) continue;
      if (!reads.has(table) && !tableWithheld(table)) uncovered.push(table);
    }
    // A user-owned table the export never touches - the gap class this suite
    // exists for (breathing_exercises sat in it for months). A `*_data` name
    // appears here when its decrypting twin is missing, unread, or leaking
    // plaintext columns the view never surfaces - see dataTwinJustified.
    expect(uncovered.sort()).toEqual([]);
  });

  it("verifies every withheld encryption base table against its decrypting twin", () => {
    // Direct assertion (not only via the uncovered-tables diff) so a broken
    // twin is named even if some other rule would have caught the table.
    const dataTables = [...live.keys()].filter(
      (table) => table.endsWith("_data") && live.get(table)!.has("user_id"),
    );
    expect(dataTables.length).toBeGreaterThan(20); // parser guard
    const unjustified = dataTables.filter((table) => !dataTwinJustified(table));
    expect(unjustified.sort()).toEqual([]);
  });

  it("keeps every withheld entry matching something real (the allowlist cannot rot)", () => {
    const stale: string[] = [];
    for (const [tablePattern, columnPattern, source] of rules.columns) {
      const justifies = [...reads].some(([table, declared]) => {
        const liveColumns = live.get(table);
        if (!liveColumns || !tablePattern.test(table)) return false;
        return [...liveColumns].some((c) => !declared.has(c) && columnPattern.test(c));
      });
      if (!justifies) stale.push(source);
    }
    for (const [tablePattern, source] of rules.tables) {
      const justifies = [...live.keys()].some(
        (table) => tablePattern.test(table) && !reads.has(table) && live.get(table)!.has("user_id"),
      );
      if (!justifies) stale.push(source);
    }
    // An entry here withholds nothing that exists - delete it from the README
    // table so the list stays an exact record of what is withheld and why.
    expect(stale).toEqual([]);
  });

  it("actually returns the newly decided preferences for a caller (end to end)", async () => {
    // The declaration parse could in principle drift from the deployed
    // function; one authenticated call pins them together. demo's
    // user_preferences row exists via seed.sql.
    const demo = await signInAs("demo");
    try {
      const { data, error } = await demo.rpc("export_user_data");
      expect(error).toBeNull();
      const exported = data as {
        preferences?: Record<string, unknown>;
        breathingExercises?: unknown[];
        feedbackSubmissions?: unknown[];
      };
      expect(exported.preferences).toBeDefined();
      // Bucket 3: user-chosen settings and program state are in the export.
      expect(Object.keys(exported.preferences!)).toEqual(
        expect.arrayContaining(["theme", "ambient_sound_id", "cbt_program_phase_index"]),
      );
      // The two first-catch tables answer, even when empty.
      expect(Array.isArray(exported.breathingExercises)).toBe(true);
      expect(Array.isArray(exported.feedbackSubmissions)).toBe(true);
    } finally {
      await demo.auth.signOut();
    }
  });
});

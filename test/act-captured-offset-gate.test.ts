import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");
const FEATURES = join(__dirname, "..", "src", "features");
const ACT_FEATURE = join(FEATURES, "act");

/**
 * #1533's gate: ACT graduates onto captured occurrence offsets **module-wide or not at
 * all** (#1513).
 *
 * ACT is the one module left with no captured civil day. The deferral does not rest on
 * ACT having no history — since #1517 every ACT tool ships a full cross-day archive — it
 * rests on a **single-frame invariant**: every ACT day-namer resolves the day from the
 * viewer's *current* device timezone, so ACT's surfaces can be wrong together after
 * travel but can never contradict *each other*, and self-contradiction is the harm the
 * captured day exists to prevent.
 *
 * ☠️ The breach that ends the invariant is **partial graduation** — one ACT table growing
 * `*_offset_minutes` while the other day-stamped ACT tables do not. From that commit on,
 * one ACT surface names days in the captured frame and its siblings name them
 * viewer-locally: two frames, one module. That change is legal TypeScript, it imports
 * only sanctioned helpers (`formatAtOffset` is what the *correct* end state uses), it
 * contains no `occurrence_day_key` call to grep for, and it is wrong only after travel.
 * No other guard in this repo can see it.
 *
 * ⚠️ The three breach paths #1533 originally listed are each already locked, which is why
 * none of them is guarded here. The `program_widget_task_status` copy-paste cannot
 * produce a silently wrong day: with no ACT offset column a copied CBT leg either
 * references a column that does not exist (SQLSTATE 42703 — loud, immediate, timezone
 * independent) or passes null, where the leg's `coalesce` falls through to the viewer's
 * window, byte-for-byte what the ACT legs already do. `src/lib/history-groups` is locked
 * by the type system: `groupHistorySections<T extends DayKeyed>` needs `dayKey` and
 * `formatHistoryWhen` needs `loggedAt`/`loggedOffsetMinutes`, and no ACT type declares
 * any of them. Shipping a fence for either would read as protection while the open path
 * stayed open, which is worse than no guard.
 *
 * ☠️☠️ Adding `src/features/act/` to `CAPTURED_FRAME_FILES` in `eslint.config.js` is
 * **backwards**, however much the name suggests otherwise. That gate enforces *use the
 * captured frame* and bans the viewer-local helpers; #1513 requires the opposite of ACT.
 * ACT needs that gate's mirror, which is this file.
 *
 * ☠️ Two traps recorded on #1533 for whoever reads this next:
 *
 * - **`formatRelativeDayKey` reaches ACT via gratitude.** `gratitude-entry-card.tsx`
 *   renders it, and gratitude is flat-family and keyset-paged — structurally the closest
 *   match to what ACT's archives are, so it is exactly the screen someone hunting a
 *   flat+paged precedent would copy. The flat family is 3-of-4 on `formatCompactAtOffset`
 *   and the fourth member models the one label form that reopens the offset: it measures
 *   a **captured** `dayKey` against the viewer's today, which is the second frame.
 * - **There are two helpers named `history-groups`** — `src/lib/` and
 *   `src/features/habits/` (the latter calling `formatRelativeDayKey`). Any future
 *   name-based fence naming only the first misses the second, which is the general reason
 *   this gate is anchored on the schema rather than on module names that move.
 *
 * **The exemption is deletion.** When ACT graduates, it graduates in one change across
 * every day-stamped ACT table, and this file is deleted with it. There is no legitimate
 * partial state, so the gate never grows a per-file allowlist — unlike the
 * `formatRelativeActivity` ban, which carries three exemption blocks precisely because
 * partial states *are* legitimate there.
 *
 * ⚠️ Anchored on the `act_` table-name pattern across *every* migration, never on a
 * pinned filename: this is a rule about a table set that grows.
 */

/** A column declaration, attributed to the table whose statement declares it. */
type OffsetColumn = { table: string; column: string; file: string };

/**
 * ☠️ Comments are blanked before anything is parsed, and that is load-bearing rather than
 * tidy. This repo's migrations carry dense prose headers, and a `;` inside one would
 * otherwise end the statement early for the `[^;]*` scan below — so an `alter table`
 * carrying an explanatory comment above its own `add column` would slip through a green
 * gate. That is the exact house style a graduating ACT migration would be written in.
 */
function withoutSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/** The same, for TypeScript — so a docblock *describing* this invariant is not an offender. */
function withoutTsComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * `[public.]name`, tolerating quoted identifiers.
 *
 * ⚠️ `"?public"?\.` is optional AND greedy on purpose: without it the engine happily
 * matches `public` itself as the table name for `public."act_x"`, which then fails the
 * `act_` test and reports nothing.
 */
const TABLE_NAME = '(?:"?public"?\\.)?"?([a-z][a-z0-9_]*)"?';

const CREATE_TABLE = `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${TABLE_NAME}`;

/** ⚠️ `(?:if exists|only)` in either order — Postgres spells it `IF EXISTS` then `ONLY`. */
const ALTER_TABLE = `alter\\s+table\\s+(?:(?:if\\s+exists|only)\\s+)*${TABLE_NAME}`;

/** ⚠️ Case-insensitive: ACT's own migrations are written in uppercase SQL. */
const OFFSET_COLUMN = /\b([a-z][a-z0-9_]*_offset_minutes)\b/gi;

/** Text between `sql[open]` (which must be "(") and its matching ")". */
function balanced(sql: string, open: number): string {
  let depth = 0;
  for (let i = open; i < sql.length; i += 1) {
    if (sql[i] === "(") depth += 1;
    else if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) return sql.slice(open + 1, i);
    }
  }
  return sql.slice(open + 1);
}

/**
 * Offset columns declared by `create table` and `alter table` statements only.
 *
 * ☠️ Deliberately NOT a scan of whole statements split on ";". The body of
 * `program_widget_task_status` names ACT tables and `created_offset_minutes` (CBT's) in
 * one function, so any coarser scan reports a permanent false positive there — and a
 * gate that has to be muted on its loudest hit is a gate nobody trusts. Neither shape
 * matched here can contain a function body, so attribution is exact.
 */
function offsetColumnsIn(rawSql: string, file: string): OffsetColumn[] {
  const sql = withoutSqlComments(rawSql);
  const found: OffsetColumn[] = [];
  const push = (table: string, body: string) => {
    for (const column of body.matchAll(OFFSET_COLUMN)) {
      found.push({ table: table.toLowerCase(), column: column[1].toLowerCase(), file });
    }
  };

  for (const match of sql.matchAll(new RegExp(`${CREATE_TABLE}\\s*\\(`, "gi"))) {
    push(match[1], balanced(sql, match.index + match[0].length - 1));
  }

  // An `alter table` runs to its ";" - with comments blanked it has no body that could
  // contain one.
  for (const match of sql.matchAll(new RegExp(`${ALTER_TABLE}([^;]*);`, "gi"))) {
    push(match[1], match[2]);
  }

  return found;
}

function migrationSources(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS, file), "utf8") }));
}

const OFFSET_COLUMNS = migrationSources().flatMap(({ file, sql }) => offsetColumnsIn(sql, file));

const isActTable = (table: string) => table.startsWith("act_");

function actSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return actSourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("ACT captured-offset gate", () => {
  /**
   * ☠️ The control that keeps the gate honest. The assertion below is an *absence*, so it
   * passes just as happily if the parser stopped matching SQL at all - a house-style
   * change to how a column is declared would silently retire the gate rather than fail
   * it. This proves the parser still finds the real thing, on the tables that have
   * actually graduated.
   */
  it("finds the offset columns the graduated modules declare", () => {
    const byTable: Record<string, string[]> = {};
    for (const { table, column } of OFFSET_COLUMNS) {
      byTable[table] = [...new Set([...(byTable[table] ?? []), column])].sort();
    }

    // CBT activities carry TWO captured days - `completed` for when it was done,
    // `scheduled` for the day the plan was meant for (#424).
    //
    // `toMatchObject`, not `toEqual`: this is a control on the parser, not a census of
    // who has graduated. A tenth module graduating is none of this gate's business, and
    // an exhaustive map would make that unrelated change fail here.
    expect(byTable).toMatchObject({
      mood_logs_data: ["logged_offset_minutes"],
      gratitude_entries_data: ["logged_offset_minutes"],
      sleep_logs_data: ["logged_offset_minutes"],
      journal_entries_data: ["occurred_offset_minutes"],
      meditation_sessions: ["completed_offset_minutes"],
      mindfulness_sessions_data: ["completed_offset_minutes"],
      activity_logs_data: ["completed_offset_minutes", "scheduled_offset_minutes"],
      thought_records_data: ["created_offset_minutes"],
    });
  });

  /**
   * ☠️ The control above is necessary but NOT sufficient, and this is the gap that nearly
   * shipped. It exercises the parser only on the eight declarations already in the repo,
   * every one of them lowercase, unquoted and comment-free - so four realistic ways of
   * writing the SAME declaration went undetected while it stayed green. A graduation is
   * written once, by hand, in whatever style its author uses; the gate has to survive all
   * of them, and each case below was a live false negative before it was fixed.
   */
  describe("catches a declaration however it is spelled", () => {
    it.each([
      [
        "an inline comment containing a semicolon",
        "alter table public.act_defusion_logs\n  -- the captured civil day; mirrors CBT\n  add column created_offset_minutes smallint;",
      ],
      [
        "postgres's canonical `if exists` before `only`",
        "alter table if exists only public.act_choice_points add column created_offset_minutes smallint;",
      ],
      [
        "a quoted identifier",
        'alter table public."act_urge_surf_logs" add column created_offset_minutes smallint;',
      ],
      [
        "uppercase, the style ACT's own migrations are written in",
        "ALTER TABLE PUBLIC.ACT_CONNECTION_LOGS ADD COLUMN CREATED_OFFSET_MINUTES SMALLINT;",
      ],
      [
        "a column declared in the create table itself",
        "CREATE TABLE IF NOT EXISTS public.act_new_logs (\n  id uuid primary key,\n  created_offset_minutes smallint\n    check (created_offset_minutes between -840 and 840)\n);",
      ],
    ])("%s", (_shape, sql) => {
      const found = offsetColumnsIn(sql, "probe.sql");

      expect(found).not.toEqual([]);
      // Attribution matters as much as detection: a column found but filed under the
      // wrong table is dropped by the `act_` filter, which is a silent miss.
      expect(found.every(({ table }) => isActTable(table))).toBe(true);
      expect(found.every(({ column }) => column.endsWith("_offset_minutes"))).toBe(true);
    });
  });

  /** And that the `act_` half of the pattern reaches real tables rather than nothing. */
  it("sees ACT's tables", () => {
    const created = migrationSources()
      .flatMap(({ sql }) => [...withoutSqlComments(sql).matchAll(new RegExp(CREATE_TABLE, "gi"))])
      .map((match) => match[1].toLowerCase())
      .filter(isActTable);

    expect(created).toEqual(expect.arrayContaining(["act_defusion_logs", "act_choice_points"]));
    expect(new Set(created).size).toBeGreaterThanOrEqual(9);
  });

  it("declares no captured offset on any ACT table", () => {
    // Deduped: a column is named twice by its own `check` constraint.
    const graduated = [
      ...new Set(
        OFFSET_COLUMNS.filter(({ table }) => isActTable(table)).map(
          ({ file, table, column }) => `${file}: ${table}.${column}`,
        ),
      ),
    ];

    expect(graduated).toEqual([]);
  });

  /**
   * The client half. Broader than #1533's `types.ts` on purpose: an offset that reaches
   * ACT types without a migration is still a second frame, and a mapper is as good a
   * place to introduce one as an interface.
   *
   * ⚠️ Comments are stripped first, so a docblock *describing* this invariant - which is
   * this repo's house style, and which the file you are reading does itself - is not an
   * offender. Only code counts.
   */
  it("declares no captured offset field anywhere in ACT's source", () => {
    const offenders = actSourceFiles(ACT_FEATURE)
      .filter((file) => /OffsetMinutes/.test(withoutTsComments(readFileSync(file, "utf8"))))
      .map((file) => file.slice(ACT_FEATURE.length + 1));

    expect(offenders).toEqual([]);
  });

  /** The same control, for the client half: CBT graduated, so the pattern must see it. */
  it("finds the offset field a graduated module declares", () => {
    const cbt = readFileSync(join(FEATURES, "cbt", "types.ts"), "utf8");

    expect(withoutTsComments(cbt)).toMatch(/OffsetMinutes/);
  });
});

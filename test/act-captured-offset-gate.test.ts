import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");
const ACT_FEATURE = join(__dirname, "..", "src", "features", "act");

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

const OFFSET_COLUMN = /\b([a-z][a-z0-9_]*_offset_minutes)\b/g;

/**
 * Offset columns declared by `create table` and `alter table` statements only.
 *
 * ☠️ Deliberately NOT a scan of whole statements split on ";". The body of
 * `program_widget_task_status` names ACT tables and `created_offset_minutes` (CBT's) in
 * one function, so any coarser scan reports a permanent false positive there — and a
 * gate that has to be muted on its loudest hit is a gate nobody trusts. Neither shape
 * matched here can contain a function body, so attribution is exact.
 */
function offsetColumnsIn(sql: string, file: string): OffsetColumn[] {
  const found: OffsetColumn[] = [];
  const push = (table: string, body: string) => {
    for (const column of body.matchAll(OFFSET_COLUMN)) {
      found.push({ table: table.toLowerCase(), column: column[1], file });
    }
  };

  const created = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z][a-z0-9_]*)\s*\(/gi;
  for (const match of sql.matchAll(created)) {
    push(match[1], balanced(sql, match.index + match[0].length - 1));
  }

  // An `alter table` runs to its ";" - it has no body that could contain one.
  const altered =
    /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:public\.)?([a-z][a-z0-9_]*)([^;]*);/gi;
  for (const match of sql.matchAll(altered)) push(match[1], match[2]);

  return found;
}

const OFFSET_COLUMNS = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .flatMap((name) => offsetColumnsIn(readFileSync(join(MIGRATIONS, name), "utf8"), name));

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

  /** And that the `act_` half of the pattern reaches real tables rather than nothing. */
  it("sees ACT's tables", () => {
    const created = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith(".sql"))
      .flatMap((name) => [
        ...readFileSync(join(MIGRATIONS, name), "utf8").matchAll(
          /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(act_[a-z0-9_]*)/gi,
        ),
      ])
      .map((match) => match[1].toLowerCase());

    expect(created).toEqual(expect.arrayContaining(["act_defusion_logs", "act_choice_points"]));
    expect(new Set(created).size).toBeGreaterThanOrEqual(9);
  });

  it("declares no captured offset on any ACT table", () => {
    // Deduped: a column is named twice by its own `check` constraint.
    const graduated = [
      ...new Set(
        OFFSET_COLUMNS.filter(({ table }) => table.startsWith("act_")).map(
          ({ file, table, column }) => `${file}: ${table}.${column}`,
        ),
      ),
    ];

    expect(graduated).toEqual([]);
  });

  /**
   * The client half. Broader than the schema half on purpose: an offset that reaches ACT
   * types without a migration is still a second frame, and a mapper is as good a place to
   * introduce one as an interface.
   */
  it("declares no captured offset field anywhere in ACT's source", () => {
    const offenders = actSourceFiles(ACT_FEATURE)
      .filter((file) => /OffsetMinutes/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(ACT_FEATURE.length + 1));

    expect(offenders).toEqual([]);
  });

  /** The same control, for the client half: CBT graduated, so the pattern must see it. */
  it("finds the offset field a graduated module declares", () => {
    const cbt = readFileSync(join(ACT_FEATURE, "..", "cbt", "types.ts"), "utf8");

    expect(cbt).toMatch(/OffsetMinutes/);
  });
});

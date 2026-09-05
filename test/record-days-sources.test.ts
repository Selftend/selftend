import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");
const DECLARATION = "create or replace function public.record_days";

/**
 * The migration whose `record_days` declaration wins - the newest by version
 * order, exactly as `export_user_data` is resolved. ☠️ Pinning the ORIGINAL file
 * here would let a redeclaration add a source nothing could see, which is the
 * quiet failure this suite exists to stop; #1980's six legs were the first.
 */
export function winningRecordDaysMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8").includes(DECLARATION));
  return join(MIGRATIONS_DIR, files[files.length - 1]);
}

const MIGRATION = winningRecordDaysMigration();

/**
 * The declaration body only - from `create or replace function public.record_days`
 * to its closing `$$;`. ☠️ The winning migration can carry other statements
 * (#1980's carries seven tables' DDL and an `export_user_data` redeclaration
 * that reads every table through its VIEW), so a whole-file scan would both
 * widen the source list and trip the base-tables-only rule below.
 */
function recordDaysBody(): string {
  const file = readFileSync(MIGRATION, "utf8");
  const start = file.indexOf(DECLARATION);
  const end = file.indexOf("\n$$;", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return file.slice(start, end);
}

/**
 * `record_days` reads exactly the sixteen sources that NAME THEIR OWN DAY (#1904),
 * ten of them since the first declaration and six since the DBT module (#1980):
 * every DBT table carries its offset from day one, and the coping plan is out
 * because it has no day.
 *
 * The rule, not the count, is what this pins: a mark on the "Looking back"
 * timeline sits on the day the record itself names, so a table that captures no
 * UTC offset has no day of its own to be marked on — its day exists only
 * relative to whoever is looking, and the mark would move under the reader's
 * feet. That is why the nine ACT tables are out (#1513 settled that ACT stays
 * single-frame), and why `exposure_sessions`, `worry_entries`, `anger_logs`,
 * `core_beliefs`, `goals`, `milestones`, `procrastination_tasks`, `task_steps`
 * and `values_profile` are out too — excluded by the SAME rule, not by ACT's
 * invariant.
 *
 * ☠️ The failure this guards is quiet and well-meaning: someone adds a table
 * "for completeness". Nothing else can see it. The RPC would still compile, RLS
 * would still hold, the parity test's fixtures would not cover the new leg, and
 * the screen would start filing marks in a frame that shifts with travel.
 *
 * Reads `from public.<table>` clauses only, so the migration's prose — which
 * names every excluded table on purpose — cannot trip it. Deleting a source is
 * caught here as well as by the integration parity test; ADDING one is caught
 * only here.
 */
const EXPECTED_SOURCES = [
  "activity_logs_data",
  "dbt_emotion_records_data",
  "dbt_judgements_data",
  "dbt_opposite_action_plans_data",
  "dbt_scripts_data",
  "dbt_sessions_data",
  "dbt_wise_mind_checkins_data",
  "gratitude_entries_data",
  "habit_logs_data",
  "journal_entries_data",
  "meditation_sessions",
  "mindfulness_sessions_data",
  "mood_logs_data",
  "self_care_logs_data",
  "sleep_logs_data",
  "thought_records_data",
];

describe("record_days sources", () => {
  it("resolves the newest declaration, not the first", () => {
    expect(MIGRATION).toMatch(/20260910000000_dbt_module\.sql$/);
  });

  it("reads exactly the sixteen tables that name their own day", () => {
    const sql = recordDaysBody();
    const sources = [...sql.matchAll(/\bfrom\s+public\.(\w+)\b/g)].map((match) => match[1]);

    expect([...new Set(sources)].sort()).toEqual(EXPECTED_SOURCES);
  });

  it("reads the base tables, never the decrypting views", () => {
    // Fifteen of the sixteen are `*_data` tables behind a decrypting view -
    // `meditation_sessions` is the only plain base table. The RPC needs only
    // plaintext timestamps, offsets and dates, and it scans ALL TIME, so going
    // through a view would run `app.decrypt_text` (VOLATILE — the planner can
    // neither merge nor drop it, #706) over the person's entire history to
    // answer a question about calendar days.
    //
    // The list above already forbids these names, so this cannot go red on its
    // own today. It is kept because it states the RULE rather than the list: an
    // edit that moved a leg onto its view AND updated `EXPECTED_SOURCES` to
    // match would leave that test green and fail here.
    const sql = recordDaysBody();
    const encryptedFamilies = [
      "mood_logs",
      "gratitude_entries",
      "journal_entries",
      "sleep_logs",
      "mindfulness_sessions",
      "activity_logs",
      "thought_records",
      "habit_logs",
      "self_care_logs",
      "dbt_sessions",
      "dbt_wise_mind_checkins",
      "dbt_judgements",
      "dbt_emotion_records",
      "dbt_opposite_action_plans",
      "dbt_scripts",
    ];

    for (const family of encryptedFamilies) {
      // `\b` alone already separates the view from its `_data` twin: `_` is a
      // word character, so `public.mood_logs\b` cannot match inside
      // `public.mood_logs_data`. A `(?!_data)` lookahead here would read as the
      // thing doing the work while doing nothing.
      expect(sql).not.toMatch(new RegExp(`\\bfrom\\s+public\\.${family}\\b`));
    }
  });
});

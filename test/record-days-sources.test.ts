import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = join(__dirname, "..", "supabase", "migrations", "20260907000000_record_days.sql");

/**
 * `record_days` reads exactly the ten sources that NAME THEIR OWN DAY (#1904).
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
  it("reads exactly the ten tables that name their own day", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const sources = [...sql.matchAll(/\bfrom\s+public\.(\w+)\b/g)].map((match) => match[1]);

    expect([...new Set(sources)].sort()).toEqual(EXPECTED_SOURCES);
  });

  it("reads the base tables, never the decrypting views", () => {
    // Seven of the ten are `*_data` tables behind a decrypting view. The RPC
    // needs only plaintext timestamps, offsets and dates, and it scans ALL TIME,
    // so going through a view would run `app.decrypt_text` (VOLATILE — the
    // planner can neither merge nor drop it, #706) over the person's entire
    // history to answer a question about calendar days.
    const sql = readFileSync(MIGRATION, "utf8");
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
    ];

    for (const family of encryptedFamilies) {
      expect(sql).not.toMatch(new RegExp(`\\bfrom\\s+public\\.${family}\\b(?!_data)`));
    }
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  deleteAllActLogsForUser,
  deleteAllActivityLogsForUser,
  deleteAllCoreBeliefsForUser,
  deleteAllExposureForUser,
  deleteAllGoalsForUser,
  deleteAllSelfCareLogsForUser,
  deleteAllThoughtRecordsForUser,
  deleteAllWorryEntriesForUser,
  signInAs,
} from "./helpers";

/**
 * The DB contract behind Home's one-row tool stats (#990).
 *
 * Every read in `src/lib/latest-activity.ts` names its table, timestamp column, offset
 * column and filters as **untyped strings** - the client is created without a `Database`
 * generic, so a wrong view name or a column that is not in the decrypting view compiles
 * and unit-tests clean, then returns nothing at runtime. The unit tests pin each
 * repository wrapper to its descriptor; this file pins those same descriptors to the
 * real schema, which is the half TypeScript cannot check.
 *
 * It also checks the condition ADR-0001 makes load-bearing: every column named here must
 * be a **plaintext pass-through** on the base table, never an `app.decrypt_text(...)`
 * output of the view. Order or filter on a decrypted value and the LIMIT can no longer
 * push below the decrypt, so the whole point of the change is lost - silently, because
 * the query still returns the right answer.
 */

/** Mirrors the descriptors in each feature's `getLatest*At`, one per recency row. */
const RECENCY_READS = [
  { row: "self-care", table: "self_care_logs", column: "created_at" },
  {
    row: "cbt-open-record",
    table: "thought_records",
    column: "created_at",
    offsetColumn: "created_offset_minutes",
    isNull: "archived_at",
  },
  { row: "cbt-worry", table: "worry_entries", column: "created_at" },
  { row: "cbt-beliefs", table: "core_beliefs", column: "created_at" },
  {
    row: "cbt-activities",
    table: "activity_logs",
    column: "completed_at",
    offsetColumn: "completed_offset_minutes",
  },
  { row: "cbt-exposure", table: "exposure_sessions", column: "completed_at" },
  {
    row: "act-drop-anchor",
    table: "act_connection_logs",
    column: "created_at",
    match: { technique: "dropAnchor" },
  },
  { row: "act-observing-self", table: "act_observing_self_sessions", column: "created_at" },
  { row: "act-choice-point", table: "act_choice_points", column: "created_at" },
  { row: "act-defusion", table: "act_defusion_logs", column: "created_at" },
  { row: "act-acceptance-prompt", table: "act_expansion_logs", column: "created_at" },
] as const;

/** Mirrors `countActiveGoals` and `countCommittedActions`. */
const COUNT_READS = [
  { row: "cbt-goals", table: "goals", match: { status: "active" } },
  { row: "act-committed-actions", table: "act_committed_actions", match: { status: "active" } },
] as const;

describe("home recency reads (integration)", () => {
  let alice: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
  });

  afterEach(async () => {
    await Promise.all([
      deleteAllThoughtRecordsForUser(SEED_USERS.alice.id),
      deleteAllActivityLogsForUser(SEED_USERS.alice.id),
      deleteAllCoreBeliefsForUser(SEED_USERS.alice.id),
      deleteAllWorryEntriesForUser(SEED_USERS.alice.id),
      deleteAllSelfCareLogsForUser(SEED_USERS.alice.id),
      deleteAllGoalsForUser(SEED_USERS.alice.id),
      deleteAllExposureForUser(SEED_USERS.alice.id),
      deleteAllActLogsForUser(SEED_USERS.alice.id),
    ]);
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it.each(RECENCY_READS)(
    "$row: $table / $column answers a one-row narrow read",
    async ({ table, column, ...rest }) => {
      const offsetColumn = "offsetColumn" in rest ? rest.offsetColumn : undefined;
      const match: Record<string, string> = "match" in rest ? { ...rest.match } : {};
      const isNull = "isNull" in rest ? rest.isNull : undefined;

      let query = alice
        .from(table)
        .select(offsetColumn ? `${column}, ${offsetColumn}` : column)
        .eq("user_id", SEED_USERS.alice.id);
      for (const [filterColumn, value] of Object.entries(match)) {
        query = query.eq(filterColumn, value);
      }
      if (isNull) query = query.is(isNull, null);

      const { data, error } = await query
        .not(column, "is", null)
        .order(column, { ascending: false })
        .limit(1)
        .maybeSingle();

      // A wrong table, a column absent from the decrypting view, or an invalid filter all
      // land here as a PostgREST error rather than as a plausible empty result.
      expect(error).toBeNull();
      expect(data).toBeNull();
    },
  );

  it.each(COUNT_READS)("$row: $table answers an exact head count", async ({ table, match }) => {
    const { count, error } = await alice
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("status", match.status);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it("returns the newest thought record by creation, with its captured offset", async () => {
    // The list this replaced was ordered by `updated_at`, so editing an old record made it
    // look like the last one written. Two rows where creation and edit order disagree.
    const insert = await alice.from("thought_records").insert([
      {
        user_id: SEED_USERS.alice.id,
        situation: "older, edited yesterday",
        created_at: "2026-01-02T10:00:00.000Z",
        updated_at: "2026-08-01T10:00:00.000Z",
        created_offset_minutes: 120,
      },
      {
        user_id: SEED_USERS.alice.id,
        situation: "newest, never edited",
        created_at: "2026-07-27T10:00:00.000Z",
        updated_at: "2026-07-27T10:00:00.000Z",
        created_offset_minutes: -420,
      },
    ]);
    expect(insert.error).toBeNull();

    const { data, error } = await alice
      .from("thought_records")
      .select("created_at, created_offset_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .is("archived_at", null)
      .not("created_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({
      created_at: "2026-07-27T10:00:00+00:00",
      created_offset_minutes: -420,
    });
  });

  it("excludes archived records, matching the count beside the clause", async () => {
    const insert = await alice.from("thought_records").insert([
      {
        user_id: SEED_USERS.alice.id,
        situation: "kept",
        created_at: "2026-01-02T10:00:00.000Z",
      },
      {
        user_id: SEED_USERS.alice.id,
        situation: "archived, and newer",
        created_at: "2026-07-27T10:00:00.000Z",
        archived_at: "2026-07-28T10:00:00.000Z",
      },
    ]);
    expect(insert.error).toBeNull();

    const { data } = await alice
      .from("thought_records")
      .select("created_at")
      .eq("user_id", SEED_USERS.alice.id)
      .is("archived_at", null)
      .not("created_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(data).toEqual({ created_at: "2026-01-02T10:00:00+00:00" });
  });

  it("skips a scheduled-but-never-completed activity", async () => {
    // `completed_at` is nullable, and descending order puts NULLs FIRST in Postgres - so
    // without the `not(... is null)` filter this row would report an activity that never
    // happened. The tightest test of that filter is a scheduled row newer than the done one.
    const insert = await alice.from("activity_logs").insert([
      {
        user_id: SEED_USERS.alice.id,
        activity_name: "planned, not done",
        category: "mastery",
        scheduled_at: "2026-08-01T10:00:00.000Z",
        completed_at: null,
      },
      {
        user_id: SEED_USERS.alice.id,
        activity_name: "done",
        category: "mastery",
        completed_at: "2026-07-27T10:00:00.000Z",
        completed_offset_minutes: 60,
      },
    ]);
    expect(insert.error).toBeNull();

    const { data, error } = await alice
      .from("activity_logs")
      .select("completed_at, completed_offset_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({
      completed_at: "2026-07-27T10:00:00+00:00",
      completed_offset_minutes: 60,
    });
  });

  it("finds a drop anchor hidden behind newer logs of other techniques", async () => {
    // The client-side filter this replaced read a 30-row page, so a user with newer
    // connection logs of other techniques read as having never dropped anchor (#990).
    // `technique` is plaintext on the base table, so the filter runs in SQL.
    const rows = Array.from({ length: 40 }, (_, index) => ({
      user_id: SEED_USERS.alice.id,
      technique: "bodyScan",
      activity_context: `noise ${index}`,
      created_at: new Date(Date.UTC(2026, 7, 1, 0, index)).toISOString(),
    }));
    const insert = await alice.from("act_connection_logs").insert([
      {
        user_id: SEED_USERS.alice.id,
        technique: "dropAnchor",
        activity_context: "the one that matters",
        created_at: "2026-01-02T10:00:00.000Z",
      },
      ...rows,
    ]);
    expect(insert.error).toBeNull();

    const { data, error } = await alice
      .from("act_connection_logs")
      .select("created_at")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("technique", "dropAnchor")
      .not("created_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toEqual({ created_at: "2026-01-02T10:00:00+00:00" });
  });

  it("counts only active goals", async () => {
    const baseGoal = {
      user_id: SEED_USERS.alice.id,
      life_domain: "health",
      goal_type: "outcome",
    };
    const insert = await alice.from("goals").insert([
      { ...baseGoal, title: "one", status: "active" },
      { ...baseGoal, title: "two", status: "active" },
      { ...baseGoal, title: "done", status: "completed" },
    ]);
    expect(insert.error).toBeNull();

    const { count, error } = await alice
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("status", "active");

    expect(error).toBeNull();
    expect(count).toBe(2);
  });

  it("scopes every read to the signed-in user under RLS", async () => {
    const bob = await signInAs("bob");
    try {
      const insert = await bob.from("worry_entries").insert({
        user_id: SEED_USERS.bob.id,
        worry_statement: "bob's worry",
        worry_category: "real_problem",
        coping_statement: "bob copes",
      });
      expect(insert.error).toBeNull();

      const { data, error } = await alice
        .from("worry_entries")
        .select("created_at")
        .eq("user_id", SEED_USERS.alice.id)
        .not("created_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    } finally {
      await deleteAllWorryEntriesForUser(SEED_USERS.bob.id);
      await bob.auth.signOut();
    }
  });
});

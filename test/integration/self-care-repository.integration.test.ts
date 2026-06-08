import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllSelfCareLogsForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/self-care/repository.ts.
// Verifies the DB contract: schema columns, the UNIQUE(user_id, log_date) dedup
// constraint (added in 20260516000000_cbt_phase4.sql), upsert behavior, RLS.
// Note: sleep_hours, sleep_quality, gratitude columns were dropped in
// 20260553_checkin_and_selfcare_dedup.sql - those columns are NOT tested.

describe("self-care self_care_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllSelfCareLogsForUser(SEED_USERS.alice.id);
    await deleteAllSelfCareLogsForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseLog = {
    log_date: "2026-05-20",
    exercise_done: true,
    exercise_minutes: 30,
    exercise_type: "Running",
    meals_structured: 3,
    emotional_eating: false,
    social_connection_made: true,
    social_notes: "Had lunch with a friend",
    meaningful_activity: "Journaling",
  };

  it("inserts a self-care log and reads it back", async () => {
    const insert = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      log_date: "2026-05-20",
      exercise_done: true,
      exercise_minutes: 30,
      exercise_type: "Running",
      emotional_eating: false,
      social_connection_made: true,
      social_notes: "Had lunch with a friend",
      meaningful_activity: "Journaling",
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("a second insert for the same user+log_date merges via the view's INSTEAD OF trigger", async () => {
    // self_care_logs is now a transparent encrypted view. A view cannot be the target of
    // INSERT ... ON CONFLICT (PostgREST upsert), so the base table's UNIQUE (user_id, log_date)
    // merge is resolved inside the view's INSTEAD OF INSERT trigger: a plain insert for an
    // existing date updates that row instead of raising a unique violation.
    const first = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, exercise_type: "Walk" })
      .select("id")
      .single();
    expect(first.error).toBeNull();

    const second = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, exercise_type: "Yoga" })
      .select("exercise_type")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.exercise_type).toBe("Yoga");

    // Still only one row for this date (merged, not duplicated).
    const list = await alice
      .from("self_care_logs")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("log_date", baseLog.log_date);
    expect(list.data?.length).toBe(1);
  });

  it("two different users can each log the same date independently", async () => {
    const aliceInsert = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog })
      .select("id")
      .single();
    expect(aliceInsert.error).toBeNull();

    const bobInsert = await bob
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.bob.id, ...baseLog })
      .select("id")
      .single();
    expect(bobInsert.error).toBeNull();
  });

  it("lists logs ordered by log_date desc", async () => {
    const dates = ["2026-05-10", "2026-05-12", "2026-05-11"];
    for (const log_date of dates) {
      const r = await alice
        .from("self_care_logs")
        .insert({ user_id: SEED_USERS.alice.id, ...baseLog, log_date })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("self_care_logs")
      .select("log_date")
      .eq("user_id", SEED_USERS.alice.id)
      .order("log_date", { ascending: false });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.log_date)).toEqual(["2026-05-12", "2026-05-11", "2026-05-10"]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("self_care_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("self_care_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, social_notes: "private" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob.from("self_care_logs").update({ social_notes: "hacked" }).eq("id", created.data!.id);

    const check = await alice
      .from("self_care_logs")
      .select("social_notes")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.social_notes).toBe("private");
  });
});

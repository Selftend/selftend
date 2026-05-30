import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllMindfulnessSessionsForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/mindfulness/repository.ts.
// Verifies the DB contract: schema columns (including feeling_after added in
// 20260558_mindfulness_feeling_after.sql), RLS, ordering by completed_at desc,
// and the check constraint on mood_after (1-10) and duration_minutes (>= 0).

describe("mindfulness mindfulness_sessions (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllMindfulnessSessionsForUser(SEED_USERS.alice.id);
    await deleteAllMindfulnessSessionsForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseSession = {
    exercise_name: "Body Scan",
    duration_minutes: 10,
    reflection: "Felt calm afterwards.",
  };

  it("inserts a mindfulness session and reads it back", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
        feeling_after: "calm",
        mood_after: null,
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      exercise_name: "Body Scan",
      duration_minutes: 10,
      reflection: "Felt calm afterwards.",
      feeling_after: "calm",
      mood_after: null,
    });
    expect(insert.data?.completed_at).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("inserts a session with feeling_after null", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
        feeling_after: null,
        mood_after: null,
      })
      .select("feeling_after")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.feeling_after).toBeNull();
  });

  it("rejects duration_minutes < 0 via check constraint", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
        duration_minutes: -1,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("rejects mood_after outside 1-10 via check constraint", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
        mood_after: 11,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("allows mood_after null (optional)", async () => {
    const insert = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
        mood_after: null,
      })
      .select("mood_after")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.mood_after).toBeNull();
  });

  it("lists sessions ordered by completed_at desc", async () => {
    const completedAts = [
      "2026-05-10T08:00:00.000Z",
      "2026-05-12T08:00:00.000Z",
      "2026-05-11T08:00:00.000Z",
    ];
    for (const completed_at of completedAts) {
      const r = await alice
        .from("mindfulness_sessions")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseSession,
          completed_at,
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("mindfulness_sessions")
      .select("completed_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("completed_at", { ascending: false });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.completed_at.slice(0, 10))).toEqual([
      "2026-05-12",
      "2026-05-11",
      "2026-05-10",
    ]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("mindfulness_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseSession,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("mindfulness_sessions").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });
});

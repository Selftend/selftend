import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Mirrors queries in src/features/meditation/repository.ts. Tests the DB
// contract for meditation_sessions: stage_at_session and TMI columns, RLS,
// ordering, foreign-keyed program_state.

async function deleteAllMeditationForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("meditation_sessions").delete().eq("user_id", userId);
  await admin.from("meditation_program_state").delete().eq("user_id", userId);
  await admin.from("stage_practice_notes").delete().eq("user_id", userId);
}

describe("meditation_sessions (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    await deleteAllMeditationForUser(SEED_USERS.alice.id);
    await deleteAllMeditationForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
    await bob.auth.signOut();
  });

  it("inserts a basic session with default stage", async () => {
    const insert = await alice
      .from("meditation_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 10,
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      duration_minutes: 10,
      stage_at_session: 1,
      obstacle_tags: [],
      reflection: "",
    });
  });

  it("rejects stage_at_session outside 1-10", async () => {
    const insert = await alice
      .from("meditation_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 5,
        stage_at_session: 11,
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("rejects mood_after outside 1-10", async () => {
    const insert = await alice
      .from("meditation_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 5,
        mood_after: 11,
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("rejects unknown dullness_level enum value", async () => {
    const insert = await alice
      .from("meditation_sessions")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 5,
        dullness_level: "extreme",
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("lists sessions ordered by completed_at desc", async () => {
    const rows = [
      { duration_minutes: 5, completed_at: "2026-05-13T08:00:00.000Z" },
      { duration_minutes: 10, completed_at: "2026-05-15T08:00:00.000Z" },
      { duration_minutes: 7, completed_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("meditation_sessions")
        .insert({ user_id: SEED_USERS.alice.id, ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("meditation_sessions")
      .select("duration_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .order("completed_at", { ascending: false });
    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.duration_minutes)).toEqual([10, 7, 5]);
  });

  it("another user cannot read a session under RLS", async () => {
    const created = await alice
      .from("meditation_sessions")
      .insert({ user_id: SEED_USERS.alice.id, duration_minutes: 10 })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("meditation_sessions").select("id").eq("id", created.data!.id);
    expect(bobRead.data).toEqual([]);
  });

  it("upserts program_state on user_id and reads it back", async () => {
    const upsert = await alice
      .from("meditation_program_state")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          current_stage: 2,
          assessed_stage: 2,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    expect(upsert.error).toBeNull();
    expect(upsert.data?.current_stage).toBe(2);

    // Second upsert updates, not inserts a new row
    await alice
      .from("meditation_program_state")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          current_stage: 3,
          assessed_stage: 2,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    const list = await alice
      .from("meditation_program_state")
      .select("current_stage")
      .eq("user_id", SEED_USERS.alice.id);
    expect(list.data).toHaveLength(1);
    expect(list.data?.[0].current_stage).toBe(3);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllAngerLogsForUser, signInAs } from "./helpers";

describe("anger anger_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllAngerLogsForUser(SEED_USERS.alice.id);
    await deleteAllAngerLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseLog = {
    trigger_text: "Traffic jam",
    interpretation: "Everyone is against me",
    arousal_level: 7,
    urge: "Honk loudly",
    behavior_chosen: "Took deep breaths",
    consequence: "Arrived late but calm",
    time_out_taken: false,
    alternative_interpretation: "Traffic affects everyone",
    outcome_rating: null,
    notes: "",
  };

  it("inserts an anger log and reads it back", async () => {
    const insert = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      trigger_text: "Traffic jam",
      arousal_level: 7,
      time_out_taken: false,
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));
  });

  it("rejects arousal_level outside 1-10 via the check constraint", async () => {
    const result = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, arousal_level: 11 })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("rejects arousal_level of 0 via the check constraint", async () => {
    const result = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, arousal_level: 0 })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("rejects outcome_rating outside 1-10 via the check constraint", async () => {
    const result = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, outcome_rating: 11 })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("lists logs ordered by created_at desc", async () => {
    const rows = [
      { trigger_text: "First", created_at: "2026-05-13T08:00:00.000Z" },
      { trigger_text: "Third", created_at: "2026-05-15T08:00:00.000Z" },
      { trigger_text: "Second", created_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("anger_logs")
        .insert({ user_id: SEED_USERS.alice.id, ...baseLog, ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("anger_logs")
      .select("trigger_text")
      .eq("user_id", SEED_USERS.alice.id)
      .order("created_at", { ascending: false });
    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.trigger_text)).toEqual(["Third", "Second", "First"]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("anger_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("anger_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseLog, notes: "private notes" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob.from("anger_logs").update({ notes: "hacked" }).eq("id", created.data!.id);

    const check = await alice
      .from("anger_logs")
      .select("notes")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.notes).toBe("private notes");
  });
});

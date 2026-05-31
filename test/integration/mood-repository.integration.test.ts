import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllMoodLogsForUser, signInAs } from "./helpers";

describe("mood mood_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllMoodLogsForUser(SEED_USERS.alice.id);
    await deleteAllMoodLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const base = {
    emotions: ["Anxious"],
    notes: "",
    linked_strategy: null,
    situation: "",
    thoughts: "",
    behaviours: "",
    bodily_sensations: "",
  };

  it("inserts a mood log and reads it back", async () => {
    const insert = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, ...base })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({ user_id: SEED_USERS.alice.id, mood_score: 3 });
    expect(insert.data?.logged_at).toEqual(expect.any(String));
  });

  it("rejects mood_score outside 1-5 via the check constraint", async () => {
    const tooHigh = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 6, ...base })
      .select("id");
    expect(tooHigh.error).not.toBeNull();
  });

  it("lists logs ordered by logged_at desc", async () => {
    for (const d of ["2026-05-13", "2026-05-15", "2026-05-14"]) {
      const r = await alice
        .from("mood_logs")
        .insert({
          user_id: SEED_USERS.alice.id,
          mood_score: 3,
          logged_at: `${d}T08:00:00.000Z`,
          ...base,
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }
    const list = await alice
      .from("mood_logs")
      .select("logged_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false });
    expect(list.data?.map((r) => r.logged_at.slice(0, 10))).toEqual([
      "2026-05-15",
      "2026-05-14",
      "2026-05-13",
    ]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const bobRead = await bob.from("mood_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 4, ...base, notes: "private" })
      .select("id")
      .single();
    await bob.from("mood_logs").update({ notes: "hacked" }).eq("id", created.data!.id);
    const check = await alice.from("mood_logs").select("notes").eq("id", created.data!.id).single();
    expect(check.data?.notes).toBe("private");
  });
});

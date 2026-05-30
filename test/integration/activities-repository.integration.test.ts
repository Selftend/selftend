import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllActivityLogsForUser, signInAs } from "./helpers";

describe("activities activity_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllActivityLogsForUser(SEED_USERS.alice.id);
    await deleteAllActivityLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseActivity = {
    activity_name: "Morning walk",
    category: "pleasure",
    pace_category: null,
    scheduled_at: null,
    mood_before: null,
    notes: "",
  };

  it("inserts an activity log and reads it back", async () => {
    const insert = await alice
      .from("activity_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseActivity })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      activity_name: "Morning walk",
      category: "pleasure",
    });
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("rejects an invalid category via the check constraint", async () => {
    const result = await alice
      .from("activity_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseActivity, category: "invalid_category" })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("rejects mood_before outside 1-5 via the check constraint", async () => {
    const result = await alice
      .from("activity_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseActivity, mood_before: 6 })
      .select("id");
    expect(result.error).not.toBeNull();
  });

  it("stores pace_category correctly", async () => {
    const insert = await alice
      .from("activity_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseActivity,
        pace_category: "physical",
        category: "mastery",
      })
      .select("pace_category, category")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.pace_category).toBe("physical");
    expect(insert.data?.category).toBe("mastery");
  });

  it("lists activities ordered by scheduled_at asc (nulls last)", async () => {
    const rows = [
      { activity_name: "Walk", scheduled_at: "2026-05-13T08:00:00.000Z" },
      { activity_name: "Run", scheduled_at: "2026-05-15T08:00:00.000Z" },
      { activity_name: "Swim", scheduled_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("activity_logs")
        .insert({ user_id: SEED_USERS.alice.id, category: "pleasure", notes: "", ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("activity_logs")
      .select("activity_name")
      .eq("user_id", SEED_USERS.alice.id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.activity_name)).toEqual(["Walk", "Swim", "Run"]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("activity_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseActivity })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("activity_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("activity_logs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseActivity, notes: "private notes" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob.from("activity_logs").update({ notes: "hacked" }).eq("id", created.data!.id);

    const check = await alice
      .from("activity_logs")
      .select("notes")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.notes).toBe("private notes");
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllWorryEntriesForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/worry/repository.ts.
// Verifies the DB contract the repo depends on (schema columns, RLS, ordering,
// check constraint on worry_category).

describe("worry worry_entries (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllWorryEntriesForUser(SEED_USERS.alice.id);
    await deleteAllWorryEntriesForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseEntry = {
    worry_statement: "What if I fail?",
    worry_category: "hypothetical" as const,
    coping_statement: "I can handle whatever comes.",
    evidence_for: ["Past failures exist"],
    evidence_against: ["I have succeeded before"],
    action_steps: ["Breathe", "Review notes"],
    resolved: false,
  };

  it("inserts a worry entry and reads it back", async () => {
    const insert = await alice
      .from("worry_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      worry_statement: "What if I fail?",
      worry_category: "hypothetical",
      coping_statement: "I can handle whatever comes.",
      resolved: false,
    });
    expect(insert.data?.evidence_for).toEqual(["Past failures exist"]);
    expect(insert.data?.action_steps).toEqual(["Breathe", "Review notes"]);
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));
  });

  it("inserts a real_problem category entry", async () => {
    const insert = await alice
      .from("worry_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseEntry,
        worry_category: "real_problem",
        worry_statement: "My report is late.",
      })
      .select("worry_category")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.worry_category).toBe("real_problem");
  });

  it("rejects an invalid worry_category via check constraint", async () => {
    const insert = await alice
      .from("worry_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseEntry,
        worry_category: "unknown_category",
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("rejects probability_estimate outside 0-100", async () => {
    const insert = await alice
      .from("worry_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseEntry,
        probability_estimate: 101,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("allows probability_estimate null (optional field)", async () => {
    const insert = await alice
      .from("worry_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseEntry,
        probability_estimate: null,
      })
      .select("probability_estimate")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.probability_estimate).toBeNull();
  });

  it("lists entries ordered by created_at desc", async () => {
    const dates = [
      "2026-05-10T08:00:00.000Z",
      "2026-05-12T08:00:00.000Z",
      "2026-05-11T08:00:00.000Z",
    ];
    for (const created_at of dates) {
      const r = await alice
        .from("worry_entries")
        .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, created_at })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("worry_entries")
      .select("created_at")
      .eq("user_id", SEED_USERS.alice.id)
      .order("created_at", { ascending: false });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.created_at.slice(0, 10))).toEqual([
      "2026-05-12",
      "2026-05-11",
      "2026-05-10",
    ]);
  });

  it("can toggle resolved flag", async () => {
    const created = await alice
      .from("worry_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, resolved: false })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const update = await alice
      .from("worry_entries")
      .update({ resolved: true })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", created.data!.id);
    expect(update.error).toBeNull();

    const check = await alice
      .from("worry_entries")
      .select("resolved")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.resolved).toBe(true);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("worry_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("worry_entries").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("worry_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry, coping_statement: "private" })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob
      .from("worry_entries")
      .update({ coping_statement: "hacked" })
      .eq("id", created.data!.id);

    const check = await alice
      .from("worry_entries")
      .select("coping_statement")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.coping_statement).toBe("private");
  });

  it("delete by id scoped to owner", async () => {
    const created = await alice
      .from("worry_entries")
      .insert({ user_id: SEED_USERS.alice.id, ...baseEntry })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const del = await alice.from("worry_entries").delete().eq("id", created.data!.id);
    expect(del.error).toBeNull();

    const list = await alice.from("worry_entries").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data).toEqual([]);
  });
});

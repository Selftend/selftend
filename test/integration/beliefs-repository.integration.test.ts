import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllCoreBeliefsForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/beliefs/repository.ts.
// Verifies the DB contract: schema columns, RLS, ordering by created_at desc,
// check constraints on original_belief_strength and alternative_belief_strength
// (both 0-100 integers).

describe("beliefs core_beliefs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllCoreBeliefsForUser(SEED_USERS.alice.id);
    await deleteAllCoreBeliefsForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const baseBelief = {
    belief_statement: "I am not good enough",
    triggering_situations: ["Job interviews", "Social events"],
    evidence_for: ["Failed interview last year"],
    evidence_against: ["Promoted at work", "Good friendships"],
    alternative_belief: "I have real strengths and can grow",
    original_belief_strength: 80,
    alternative_belief_strength: 30,
    reinforcement_plan: "Review evidence weekly",
    next_review_date: null as string | null,
  };

  it("inserts a core belief and reads it back", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseBelief })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      belief_statement: "I am not good enough",
      original_belief_strength: 80,
      alternative_belief_strength: 30,
      alternative_belief: "I have real strengths and can grow",
      reinforcement_plan: "Review evidence weekly",
    });
    expect(insert.data?.triggering_situations).toEqual(["Job interviews", "Social events"]);
    expect(insert.data?.evidence_for).toEqual(["Failed interview last year"]);
    expect(insert.data?.evidence_against).toEqual(["Promoted at work", "Good friendships"]);
    expect(insert.data?.next_review_date).toBeNull();
    expect(insert.data?.created_at).toEqual(expect.any(String));
    expect(insert.data?.updated_at).toEqual(expect.any(String));
  });

  it("accepts boundary values for belief strengths (0 and 100)", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        original_belief_strength: 100,
        alternative_belief_strength: 0,
      })
      .select("original_belief_strength, alternative_belief_strength")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.original_belief_strength).toBe(100);
    expect(insert.data?.alternative_belief_strength).toBe(0);
  });

  it("rejects original_belief_strength > 100 via check constraint", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        original_belief_strength: 101,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("rejects original_belief_strength < 0 via check constraint", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        original_belief_strength: -1,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("rejects alternative_belief_strength > 100 via check constraint", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        alternative_belief_strength: 101,
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("accepts a next_review_date value", async () => {
    const insert = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        next_review_date: "2026-06-15",
      })
      .select("next_review_date")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.next_review_date).toBe("2026-06-15");
  });

  it("update changes belief_strength values", async () => {
    const created = await alice
      .from("core_beliefs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseBelief })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const update = await alice
      .from("core_beliefs")
      .update({ original_belief_strength: 50, alternative_belief_strength: 60 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", created.data!.id);
    expect(update.error).toBeNull();

    const check = await alice
      .from("core_beliefs")
      .select("original_belief_strength, alternative_belief_strength")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.original_belief_strength).toBe(50);
    expect(check.data?.alternative_belief_strength).toBe(60);
  });

  it("lists beliefs ordered by created_at desc", async () => {
    const dates = [
      "2026-05-10T08:00:00.000Z",
      "2026-05-12T08:00:00.000Z",
      "2026-05-11T08:00:00.000Z",
    ];
    for (const created_at of dates) {
      const r = await alice
        .from("core_beliefs")
        .insert({ user_id: SEED_USERS.alice.id, ...baseBelief, created_at })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("core_beliefs")
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

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("core_beliefs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseBelief })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("core_beliefs").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("core_beliefs")
      .insert({
        user_id: SEED_USERS.alice.id,
        ...baseBelief,
        belief_statement: "private belief",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob
      .from("core_beliefs")
      .update({ belief_statement: "hacked" })
      .eq("id", created.data!.id);

    const check = await alice
      .from("core_beliefs")
      .select("belief_statement")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.belief_statement).toBe("private belief");
  });

  it("delete by id scoped to owner", async () => {
    const created = await alice
      .from("core_beliefs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseBelief })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const del = await alice.from("core_beliefs").delete().eq("id", created.data!.id);
    expect(del.error).toBeNull();

    const list = await alice.from("core_beliefs").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data).toEqual([]);
  });

  it("set_current_timestamp_updated_at trigger advances updated_at on UPDATE", async () => {
    // Insert a row and capture its initial updated_at.
    const insert = await alice
      .from("core_beliefs")
      .insert({ user_id: SEED_USERS.alice.id, ...baseBelief })
      .select("id, updated_at")
      .single();
    expect(insert.error).toBeNull();

    const originalUpdatedAt = insert.data!.updated_at as string;
    expect(typeof originalUpdatedAt).toBe("string");
    // Ensure it parses as a valid UTC timestamp (PostgREST returns ISO-8601 strings).
    expect(Number.isNaN(new Date(originalUpdatedAt).getTime())).toBe(false);

    // Wait briefly so the persisted updated_at is strictly later than the insert
    // value (Postgres now() is per-transaction; 2 ms could land in the same
    // millisecond on localhost). The assertion below stays `>`, so a broken
    // (non-bumping) trigger still fails.
    await new Promise((r) => setTimeout(r, 15));

    // UPDATE a column - the data table's BEFORE UPDATE trigger bumps updated_at.
    const update = await alice
      .from("core_beliefs")
      .update({ reinforcement_plan: "Updated plan" })
      .eq("id", insert.data!.id);
    expect(update.error).toBeNull();

    // Read updated_at back with a fresh SELECT rather than from the UPDATE's
    // RETURNING. The view's INSTEAD OF UPDATE trigger returns its NEW record,
    // which still carries the pre-update updated_at, so RETURNING reports the
    // stale value even though the data table genuinely advanced. A follow-up
    // SELECT through the view surfaces the truly-persisted (advanced) timestamp.
    const refetch = await alice
      .from("core_beliefs")
      .select("updated_at")
      .eq("id", insert.data!.id)
      .single();
    expect(refetch.error).toBeNull();

    const newUpdatedAt = refetch.data!.updated_at as string;
    expect(typeof newUpdatedAt).toBe("string");

    // The trigger must have advanced updated_at strictly beyond the insert value.
    expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
  });
});

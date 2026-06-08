import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllValuesProfileForUser,
  signInAs,
} from "./helpers";

// Mirrors the queries in src/features/values/repository.ts.
// Verifies the DB contract after 20260555_workbook_alignment.sql restructured
// values_profile to a single row per user with personal_values jsonb +
// priority_values jsonb, and UNIQUE(user_id).
// Note: values_profile has no DELETE RLS policy for authenticated users -
// cleanup is done via service role (deleteAllValuesProfileForUser bypasses RLS).
// As of 20260629 values_profile is a transparent encrypted view: a view cannot be the target of
// INSERT ... ON CONFLICT, so the repository inserts plainly and the INSTEAD OF INSERT trigger
// resolves the (user_id) merge against the base table's UNIQUE constraint (saveValuesProfile).
// A second insert for the same user therefore MERGES rather than erroring.

describe("values values_profile (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await deleteAllValuesProfileForUser(SEED_USERS.alice.id);
    await deleteAllValuesProfileForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  const personalValues = [
    { key: "family", tier: 1 },
    { key: "health", tier: 2 },
    { key: "creativity", tier: 3 },
  ];
  const priorityValues = ["family", "health"];

  it("inserts a values profile and reads it back", async () => {
    const insert = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
    });
    // jsonb round-trips as object array
    expect(insert.data?.personal_values).toEqual(personalValues);
    expect(insert.data?.priority_values).toEqual(priorityValues);
    expect(insert.data?.updated_at).toEqual(expect.any(String));
  });

  it("merges a second insert for the same user (INSTEAD OF trigger ON CONFLICT user_id)", async () => {
    const first = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("id")
      .single();
    expect(first.error).toBeNull();

    const newValues = [{ key: "work", tier: 1 }];
    const newPriority = ["work"];
    // A second plain insert merges on the base table's UNIQUE(user_id) inside the trigger,
    // returning the same row updated (not a duplicate-key error).
    const second = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: newValues,
        priority_values: newPriority,
      })
      .select("id, personal_values, priority_values")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.id).toBe(first.data!.id);
    expect(second.data?.personal_values).toEqual(newValues);
    expect(second.data?.priority_values).toEqual(newPriority);

    const list = await alice.from("values_profile").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data?.length).toBe(1);
  });

  it("saveValuesProfile's plain insert replaces personal_values and priority_values", async () => {
    const first = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("id")
      .single();
    expect(first.error).toBeNull();

    const newValues = [{ key: "adventure", tier: 1 }];
    const newPriority = ["adventure"];

    // The repository now inserts plainly (no PostgREST upsert); the view trigger merges on user_id.
    const replaced = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: newValues,
        priority_values: newPriority,
      })
      .select("personal_values, priority_values")
      .single();

    expect(replaced.error).toBeNull();
    expect(replaced.data?.personal_values).toEqual(newValues);
    expect(replaced.data?.priority_values).toEqual(newPriority);

    // Confirm there is still only one row for alice
    const list = await alice.from("values_profile").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data?.length).toBe(1);
  });

  it("stores empty arrays for personal_values and priority_values", async () => {
    const insert = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: [],
        priority_values: [],
      })
      .select("personal_values, priority_values")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.personal_values).toEqual([]);
    expect(insert.data?.priority_values).toEqual([]);
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("values_profile").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("another user's update is a no-op under RLS", async () => {
    const created = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    await bob
      .from("values_profile")
      .update({ priority_values: ["hacked"] })
      .eq("id", created.data!.id);

    const check = await alice
      .from("values_profile")
      .select("priority_values")
      .eq("id", created.data!.id)
      .single();
    expect(check.data?.priority_values).toEqual(priorityValues);
  });

  it("service role can delete rows for cleanup (no user DELETE policy)", async () => {
    const created = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: personalValues,
        priority_values: priorityValues,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const admin = createServiceClient();
    const del = await admin.from("values_profile").delete().eq("user_id", SEED_USERS.alice.id);
    expect(del.error).toBeNull();

    const list = await alice.from("values_profile").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data).toEqual([]);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllValuesProfileForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over values_profile:
// - personal_values + priority_values (both jsonb) round-trip plaintext through the same
//   `values_profile` name, while `values_profile_data` holds only ciphertext (*_enc).
// - the jsonb structure (object array + string array) survives the round-trip.
// - RLS isolates a second user.
// - UPSERT: values_profile is a per-user singleton (UNIQUE user_id). A second INSERT with the same
//   user merges (the INSTEAD OF INSERT trigger's ON CONFLICT (user_id) DO UPDATE) rather than
//   erroring — the saveValuesProfile semantics formerly carried by PostgREST upsert.
// NOTE: values_profile has NO DELETE RLS policy (only INSERT/SELECT/UPDATE). A user DELETE through
//   the view is an RLS no-op (pre-existing behavior); the DELETE-trigger path is exercised via the
//   service-role admin client (the cleanup path).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const PERSONAL = [
  { key: "honesty", tier: 1 },
  { key: "creativity", tier: 2 },
];
const PRIORITY = ["honesty", "creativity"];

describe("values_profile encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

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

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      personal_values: PERSONAL,
      priority_values: PRIORITY,
    };
  }

  it("INSERT round-trips jsonb plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("values_profile").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data?.personal_values).toEqual(PERSONAL);
    expect(insert.data?.priority_values).toEqual(PRIORITY);

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("values_profile_data")
      .select("personal_values_enc, priority_values_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.personal_values_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.personal_values_enc)).not.toContain("honesty");
    expect(cipherToText(atRest.data?.priority_values_enc)).not.toContain("creativity");
  });

  it("UPDATE re-encrypts and the jsonb round-trips", async () => {
    const created = await alice.from("values_profile").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("values_profile_data")
      .select("personal_values_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.personal_values_enc);

    const nextPersonal = [{ key: "kindness", tier: 1 }];
    const nextPriority = ["kindness"];
    const updated = await alice
      .from("values_profile")
      .update({ personal_values: nextPersonal, priority_values: nextPriority })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.personal_values).toEqual(nextPersonal);
    expect(updated.data?.priority_values).toEqual(nextPriority);

    const after = await admin
      .from("values_profile_data")
      .select("personal_values_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.personal_values_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("kindness");
  });

  it("UPSERT: a second INSERT for the same user merges instead of erroring", async () => {
    const first = await alice.from("values_profile").insert(baseRow()).select("id").single();
    expect(first.error).toBeNull();
    const firstId = first.data!.id as string;

    const nextPersonal = [{ key: "courage", tier: 1 }];
    const nextPriority = ["courage"];
    const second = await alice
      .from("values_profile")
      .insert({
        user_id: SEED_USERS.alice.id,
        personal_values: nextPersonal,
        priority_values: nextPriority,
      })
      .select("*")
      .single();
    expect(second.error).toBeNull();
    // Same underlying row (merged on user_id), with the new values.
    expect(second.data?.id).toBe(firstId);
    expect(second.data?.personal_values).toEqual(nextPersonal);
    expect(second.data?.priority_values).toEqual(nextPriority);

    // Exactly one row for the user.
    const rows = await alice.from("values_profile").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });

  it("DELETE via the view's trigger (service-role) removes the base row", async () => {
    const created = await alice.from("values_profile").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await admin.from("values_profile").delete().eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("values_profile_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read or update another user's values profile", async () => {
    const created = await alice.from("values_profile").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("values_profile").select("id, priority_values").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("values_profile")
      .update({ priority_values: ["hacked"] })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const aliceRead = await alice
      .from("values_profile")
      .select("personal_values, priority_values")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.personal_values).toEqual(PERSONAL);
    expect(aliceRead.data?.priority_values).toEqual(PRIORITY);
  });
});

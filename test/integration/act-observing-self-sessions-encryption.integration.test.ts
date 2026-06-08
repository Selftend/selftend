import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_observing_self_sessions:
// - what_was_observed / notes round-trip plaintext through the same `act_observing_self_sessions`
//   name, while `act_observing_self_sessions_data` holds only ciphertext (*_enc).
// - pass-through columns (technique_used, duration_minutes, mood_after) survive a round-trip;
//   enum CHECK on technique_used and range CHECK on mood_after still apply on the base table.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const OBSERVED = "Watched my thoughts come and go (secret-marker-OBS)";
const NOTES = "Felt spacious afterwards (secret-marker-NOT)";

describe("act_observing_self_sessions encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
    await deleteAllActLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      technique_used: "skyAndWeather",
      what_was_observed: OBSERVED,
      duration_minutes: 10,
      mood_after: 7,
      notes: NOTES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice
      .from("act_observing_self_sessions")
      .insert(baseRow())
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      technique_used: "skyAndWeather",
      what_was_observed: OBSERVED,
      duration_minutes: 10,
      mood_after: 7,
      notes: NOTES,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_observing_self_sessions_data")
      .select("what_was_observed_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.what_was_observed_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.what_was_observed_enc)).not.toContain("secret-marker-OBS");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice
      .from("act_observing_self_sessions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_observing_self_sessions_data")
      .select("what_was_observed_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.what_was_observed_enc);

    const NEW_OBSERVED = "Noticed the observer behind the thoughts (secret-marker-OBS2)";
    const updated = await alice
      .from("act_observing_self_sessions")
      .update({ what_was_observed: NEW_OBSERVED, mood_after: 9, technique_used: "bodyAwareness" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.what_was_observed).toBe(NEW_OBSERVED);
    expect(updated.data?.mood_after).toBe(9);
    expect(updated.data?.technique_used).toBe("bodyAwareness");

    const after = await admin
      .from("act_observing_self_sessions_data")
      .select("what_was_observed_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.what_was_observed_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-OBS2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("act_observing_self_sessions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_observing_self_sessions")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_observing_self_sessions_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with an invalid technique_used enum is rejected", async () => {
    const row = { ...baseRow(), technique_used: "notARealTechnique" };
    const result = await alice
      .from("act_observing_self_sessions")
      .insert(row)
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("INSERT with an out-of-range mood_after is rejected", async () => {
    const row = { ...baseRow(), mood_after: 11 };
    const result = await alice
      .from("act_observing_self_sessions")
      .insert(row)
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's session", async () => {
    const created = await alice
      .from("act_observing_self_sessions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("act_observing_self_sessions")
      .select("id, what_was_observed")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_observing_self_sessions")
      .update({ what_was_observed: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_observing_self_sessions").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_observing_self_sessions")
      .select("what_was_observed, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.what_was_observed).toBe(OBSERVED);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

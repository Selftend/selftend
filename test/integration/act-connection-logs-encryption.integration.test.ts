import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_connection_logs:
// - activity_context / notices_from_senses / notes round-trip plaintext through the same
//   `act_connection_logs` name, while `act_connection_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (technique, duration_minutes, mood_after) survive a round-trip;
//   enum CHECK constraint on technique still applies on the base table.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const ACTIVITY = "Walking in the park (secret-marker-ACT)";
const SENSES = "Birdsong, cool air, damp grass (secret-marker-SEN)";
const NOTES = "Felt grounded afterwards (secret-marker-NOT)";

describe("act_connection_logs encrypted view (integration)", () => {
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
      technique: "mindfulActivity",
      activity_context: ACTIVITY,
      notices_from_senses: SENSES,
      duration_minutes: 15,
      mood_after: 8,
      notes: NOTES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_connection_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      technique: "mindfulActivity",
      activity_context: ACTIVITY,
      notices_from_senses: SENSES,
      duration_minutes: 15,
      mood_after: 8,
      notes: NOTES,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_connection_logs_data")
      .select("activity_context_enc, notices_from_senses_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.activity_context_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.activity_context_enc)).not.toContain("secret-marker-ACT");
    expect(cipherToText(atRest.data?.notices_from_senses_enc)).not.toContain("secret-marker-SEN");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("act_connection_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_connection_logs_data")
      .select("activity_context_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.activity_context_enc);

    const NEW_ACTIVITY = "Sitting by the window (secret-marker-ACT2)";
    const updated = await alice
      .from("act_connection_logs")
      .update({ activity_context: NEW_ACTIVITY, mood_after: 6, technique: "dropAnchor" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.activity_context).toBe(NEW_ACTIVITY);
    expect(updated.data?.mood_after).toBe(6);
    expect(updated.data?.technique).toBe("dropAnchor");

    const after = await admin
      .from("act_connection_logs_data")
      .select("activity_context_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.activity_context_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-ACT2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_connection_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_connection_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_connection_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with an invalid technique enum is rejected", async () => {
    const row = { ...baseRow(), technique: "notARealTechnique" };
    const result = await alice.from("act_connection_logs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's connection log", async () => {
    const created = await alice.from("act_connection_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("act_connection_logs")
      .select("id, activity_context")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_connection_logs")
      .update({ activity_context: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_connection_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_connection_logs")
      .select("activity_context, notices_from_senses, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.activity_context).toBe(ACTIVITY);
    expect(aliceRead.data?.notices_from_senses).toBe(SENSES);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_urge_surf_logs:
// - urge_description / trigger / surfing_notes round-trip plaintext through the same
//   `act_urge_surf_logs` name, while `act_urge_surf_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (peak_intensity, urge_acted_on, completed_at) survive a round-trip.
// - "trigger" is a reserved word - exercised here through the trigger functions.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const URGE = "Want to check my phone (secret-marker-URG)";
const TRIGGER = "Boredom at my desk (secret-marker-TRG)";
const NOTES = "Rode the wave for ten minutes (secret-marker-NOT)";
const COMPLETED_AT = "2026-05-20T10:15:00.000Z";

describe("act_urge_surf_logs encrypted view (integration)", () => {
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
      urge_description: URGE,
      trigger: TRIGGER,
      peak_intensity: 65,
      surfing_notes: NOTES,
      urge_acted_on: false,
      completed_at: COMPLETED_AT,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_urge_surf_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      urge_description: URGE,
      trigger: TRIGGER,
      peak_intensity: 65,
      surfing_notes: NOTES,
      urge_acted_on: false,
    });
    // completed_at survives the round-trip (compared as an instant; PostgREST renders +00:00).
    expect(new Date(insert.data?.completed_at as string).toISOString()).toBe(COMPLETED_AT);

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_urge_surf_logs_data")
      .select("urge_description_enc, trigger_enc, surfing_notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.urge_description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.urge_description_enc)).not.toContain("secret-marker-URG");
    expect(cipherToText(atRest.data?.trigger_enc)).not.toContain("secret-marker-TRG");
    expect(cipherToText(atRest.data?.surfing_notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("act_urge_surf_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_urge_surf_logs_data")
      .select("trigger_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.trigger_enc);

    const NEW_TRIGGER = "A different cue (secret-marker-TRG2)";
    const updated = await alice
      .from("act_urge_surf_logs")
      .update({ trigger: NEW_TRIGGER, peak_intensity: 20, urge_acted_on: true })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.trigger).toBe(NEW_TRIGGER);
    expect(updated.data?.peak_intensity).toBe(20);
    expect(updated.data?.urge_acted_on).toBe(true);

    const after = await admin
      .from("act_urge_surf_logs_data")
      .select("trigger_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.trigger_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-TRG2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_urge_surf_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_urge_surf_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_urge_surf_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with an out-of-range peak_intensity is rejected", async () => {
    const row = { ...baseRow(), peak_intensity: 101 };
    const result = await alice.from("act_urge_surf_logs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's urge surf log", async () => {
    const created = await alice.from("act_urge_surf_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("act_urge_surf_logs")
      .select("id, urge_description")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_urge_surf_logs")
      .update({ urge_description: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_urge_surf_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_urge_surf_logs")
      .select("urge_description, trigger, surfing_notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.urge_description).toBe(URGE);
    expect(aliceRead.data?.trigger).toBe(TRIGGER);
    expect(aliceRead.data?.surfing_notes).toBe(NOTES);
  });
});

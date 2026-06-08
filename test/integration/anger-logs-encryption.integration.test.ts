import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllAngerLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over anger_logs:
// - all seven text columns (trigger_text/interpretation/urge/behavior_chosen/consequence/
//   alternative_interpretation/notes) round-trip plaintext through the same `anger_logs` name,
//   while `anger_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (arousal_level, time_out_taken, outcome_rating) survive a round-trip.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const TRIGGER = "Cut off in traffic (secret-marker-TRG)";
const INTERPRETATION = "They disrespected me (secret-marker-INT)";
const URGE = "Honk and shout (secret-marker-URG)";
const BEHAVIOR = "Took a breath instead (secret-marker-BEH)";
const CONSEQUENCE = "Calmer commute (secret-marker-CON)";
const ALT_INTERPRETATION = "They were probably distracted (secret-marker-ALT)";
const NOTES = "Time-out helped a lot (secret-marker-NOT)";

describe("anger_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

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

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      trigger_text: TRIGGER,
      interpretation: INTERPRETATION,
      arousal_level: 8,
      urge: URGE,
      behavior_chosen: BEHAVIOR,
      consequence: CONSEQUENCE,
      time_out_taken: true,
      alternative_interpretation: ALT_INTERPRETATION,
      outcome_rating: 7,
      notes: NOTES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("anger_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      trigger_text: TRIGGER,
      interpretation: INTERPRETATION,
      urge: URGE,
      behavior_chosen: BEHAVIOR,
      consequence: CONSEQUENCE,
      alternative_interpretation: ALT_INTERPRETATION,
      notes: NOTES,
      arousal_level: 8,
      time_out_taken: true,
      outcome_rating: 7,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("anger_logs_data")
      .select(
        "trigger_text_enc, interpretation_enc, urge_enc, behavior_chosen_enc, consequence_enc, alternative_interpretation_enc, notes_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.trigger_text_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.trigger_text_enc)).not.toContain("secret-marker-TRG");
    expect(cipherToText(atRest.data?.interpretation_enc)).not.toContain("secret-marker-INT");
    expect(cipherToText(atRest.data?.urge_enc)).not.toContain("secret-marker-URG");
    expect(cipherToText(atRest.data?.behavior_chosen_enc)).not.toContain("secret-marker-BEH");
    expect(cipherToText(atRest.data?.consequence_enc)).not.toContain("secret-marker-CON");
    expect(cipherToText(atRest.data?.alternative_interpretation_enc)).not.toContain(
      "secret-marker-ALT",
    );
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("anger_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("anger_logs_data")
      .select("trigger_text_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.trigger_text_enc);

    const NEW_TRIGGER = "A different slight (secret-marker-TRG2)";
    const updated = await alice
      .from("anger_logs")
      .update({ trigger_text: NEW_TRIGGER, arousal_level: 4, outcome_rating: 9 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.trigger_text).toBe(NEW_TRIGGER);
    expect(updated.data?.arousal_level).toBe(4);
    expect(updated.data?.outcome_rating).toBe(9);

    const after = await admin
      .from("anger_logs_data")
      .select("trigger_text_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.trigger_text_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-TRG2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("anger_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("anger_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const viewRead = await alice.from("anger_logs").select("id").eq("id", id).maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    const baseRead = await admin.from("anger_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with trigger_text longer than 4000 characters is rejected", async () => {
    const row = { ...baseRow(), trigger_text: "x".repeat(4001) };
    const result = await alice.from("anger_logs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's anger log", async () => {
    const created = await alice.from("anger_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("anger_logs").select("id, trigger_text").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("anger_logs").update({ trigger_text: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("anger_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("anger_logs")
      .select("trigger_text, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.trigger_text).toBe(TRIGGER);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

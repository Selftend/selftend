import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllMoodLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over mood_logs:
// - the client sees plaintext notes/situation/thoughts/behaviours/bodily_sensations through the
//   same `mood_logs` name, while the base table `mood_logs_data` holds only ciphertext (*_enc).
// - INSERT / UPDATE / DELETE flow through the INSTEAD OF triggers.
// - pass-through columns (mood_score, emotions[], linked_strategy) survive a round-trip.
// - RLS still isolates users through the view.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NOTES = "Felt jittery before the meeting 🌱 (secret-marker-NOTES1)";
const SITUATION = "Standup in 10 minutes (secret-marker-SIT1)";
const THOUGHTS = "Everyone will judge my update (secret-marker-THO1)";
const BEHAVIOURS = "Paced the kitchen (secret-marker-BEH1)";
const BODILY = "Tight chest, shallow breath (secret-marker-BOD1)";

describe("mood_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

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

  it("INSERT through the view returns decrypted plaintext but stores ciphertext at rest", async () => {
    const insert = await alice
      .from("mood_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        mood_score: 3,
        emotions: ["anxious", "hopeful"],
        notes: NOTES,
        situation: SITUATION,
        thoughts: THOUGHTS,
        behaviours: BEHAVIOURS,
        bodily_sensations: BODILY,
        linked_strategy: "breathing",
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      mood_score: 3,
      emotions: ["anxious", "hopeful"],
      notes: NOTES,
      situation: SITUATION,
      thoughts: THOUGHTS,
      behaviours: BEHAVIOURS,
      bodily_sensations: BODILY,
      linked_strategy: "breathing",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("mood_logs_data")
      .select("notes_enc, situation_enc, thoughts_enc, behaviours_enc, bodily_sensations_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    const notesCipher = cipherToText(atRest.data?.notes_enc);
    expect(notesCipher.length).toBeGreaterThan(0);
    expect(notesCipher).not.toContain("secret-marker-NOTES1");
    expect(cipherToText(atRest.data?.situation_enc)).not.toContain("secret-marker-SIT1");
    expect(cipherToText(atRest.data?.thoughts_enc)).not.toContain("secret-marker-THO1");
    expect(cipherToText(atRest.data?.behaviours_enc)).not.toContain("secret-marker-BEH1");
    expect(cipherToText(atRest.data?.bodily_sensations_enc)).not.toContain("secret-marker-BOD1");
  });

  it("UPDATE through the view re-encrypts and preserves pass-through columns", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        mood_score: 2,
        emotions: ["sad"],
        notes: NOTES,
        situation: SITUATION,
        thoughts: THOUGHTS,
        behaviours: BEHAVIOURS,
        bodily_sensations: BODILY,
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("mood_logs_data").select("notes_enc").eq("id", id).single();
    const beforeCipher = cipherToText(before.data?.notes_enc);

    const NEW_NOTES = "Calmer after a walk (secret-marker-NOTES2)";
    const updated = await alice
      .from("mood_logs")
      .update({ mood_score: 4, emotions: ["calm", "relieved"], notes: NEW_NOTES })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.notes).toBe(NEW_NOTES);
    expect(updated.data?.mood_score).toBe(4);
    expect(updated.data?.emotions).toEqual(["calm", "relieved"]);

    const readBack = await alice
      .from("mood_logs")
      .select("notes, mood_score, emotions")
      .eq("id", id)
      .single();
    expect(readBack.error).toBeNull();
    expect(readBack.data?.notes).toBe(NEW_NOTES);
    expect(readBack.data?.mood_score).toBe(4);
    expect(readBack.data?.emotions).toEqual(["calm", "relieved"]);

    const after = await admin.from("mood_logs_data").select("notes_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.notes_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NOTES2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, notes: NOTES })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("mood_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const viewRead = await alice.from("mood_logs").select("id").eq("id", id).maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    const baseRead = await admin.from("mood_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with notes longer than 4000 characters is rejected", async () => {
    const overLong = "x".repeat(4001);
    const result = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, notes: overLong })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's mood log", async () => {
    const created = await alice
      .from("mood_logs")
      .insert({ user_id: SEED_USERS.alice.id, mood_score: 3, notes: NOTES })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("mood_logs").select("id, notes").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("mood_logs").update({ notes: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("mood_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice.from("mood_logs").select("notes").eq("id", id).single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

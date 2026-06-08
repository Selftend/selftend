import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_expansion_logs:
// - emotion / body_sensation / notes round-trip plaintext through the same `act_expansion_logs`
//   name, while `act_expansion_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (intensity_before/after, struggle_switch_on, discomfort_type,
//   technique_used) survive a round-trip; enum CHECK constraints still apply on the base table.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const EMOTION = "Anxiety before the meeting (secret-marker-EMO)";
const BODY = "Tight chest, shallow breath (secret-marker-BOD)";
const NOTES = "Making room for it helped (secret-marker-NOT)";

describe("act_expansion_logs encrypted view (integration)", () => {
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
      emotion: EMOTION,
      body_sensation: BODY,
      intensity_before: 70,
      struggle_switch_on: true,
      discomfort_type: "clean",
      technique_used: "fourStepExpansion",
      intensity_after: 35,
      notes: NOTES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_expansion_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      emotion: EMOTION,
      body_sensation: BODY,
      intensity_before: 70,
      struggle_switch_on: true,
      discomfort_type: "clean",
      technique_used: "fourStepExpansion",
      intensity_after: 35,
      notes: NOTES,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_expansion_logs_data")
      .select("emotion_enc, body_sensation_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.emotion_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.emotion_enc)).not.toContain("secret-marker-EMO");
    expect(cipherToText(atRest.data?.body_sensation_enc)).not.toContain("secret-marker-BOD");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("act_expansion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_expansion_logs_data")
      .select("emotion_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.emotion_enc);

    const NEW_EMOTION = "Calmer now (secret-marker-EMO2)";
    const updated = await alice
      .from("act_expansion_logs")
      .update({ emotion: NEW_EMOTION, intensity_after: 10, discomfort_type: "dirty" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.emotion).toBe(NEW_EMOTION);
    expect(updated.data?.intensity_after).toBe(10);
    expect(updated.data?.discomfort_type).toBe("dirty");

    const after = await admin
      .from("act_expansion_logs_data")
      .select("emotion_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.emotion_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-EMO2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_expansion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_expansion_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_expansion_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with an invalid technique_used enum is rejected", async () => {
    const row = { ...baseRow(), technique_used: "notARealTechnique" };
    const result = await alice.from("act_expansion_logs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's expansion log", async () => {
    const created = await alice.from("act_expansion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_expansion_logs").select("id, emotion").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("act_expansion_logs").update({ emotion: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_expansion_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_expansion_logs")
      .select("emotion, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.emotion).toBe(EMOTION);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

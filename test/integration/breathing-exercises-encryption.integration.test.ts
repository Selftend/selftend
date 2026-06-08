import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllBreathingExercisesForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over breathing_exercises:
// - name round-trips plaintext through the same `breathing_exercises` name, while
//   `breathing_exercises_data` holds only ciphertext (name_enc).
// - pass-through columns (the numeric timings, cycles, color) survive a round-trip.
// - the name not-blank / length-80 guards still reject through the view's triggers.
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NAME = "Box breathing (secret-marker-BREATH)";

describe("breathing_exercises encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllBreathingExercisesForUser(SEED_USERS.alice.id);
    await deleteAllBreathingExercisesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      name: NAME,
      inhale_seconds: 4,
      hold_in_seconds: 4,
      exhale_seconds: 4,
      hold_out_seconds: 4,
      cycles: 8,
      color: "aqua",
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("breathing_exercises").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      name: NAME,
      cycles: 8,
      color: "aqua",
    });
    expect(Number(insert.data?.inhale_seconds)).toBe(4);
    expect(Number(insert.data?.exhale_seconds)).toBe(4);

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("breathing_exercises_data")
      .select("name_enc, cycles, color, inhale_seconds")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.name_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.name_enc)).not.toContain("secret-marker-BREATH");
    // Pass-through columns stay plaintext on the base table.
    expect(atRest.data?.cycles).toBe(8);
    expect(atRest.data?.color).toBe("aqua");
    expect(Number(atRest.data?.inhale_seconds)).toBe(4);
  });

  it("UPDATE re-encrypts the name and pass-through columns survive", async () => {
    const created = await alice.from("breathing_exercises").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("breathing_exercises_data")
      .select("name_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.name_enc);

    const updated = await alice
      .from("breathing_exercises")
      .update({ name: "Calm breath (secret-marker-NEW)", cycles: 12, color: "lavender" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.name).toBe("Calm breath (secret-marker-NEW)");
    expect(updated.data?.cycles).toBe(12);
    expect(updated.data?.color).toBe("lavender");

    const after = await admin
      .from("breathing_exercises_data")
      .select("name_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.name_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("rejects a blank name and a name over the 80-character cap", async () => {
    const blank = await alice
      .from("breathing_exercises")
      .insert({ ...baseRow(), name: "   " })
      .select("*")
      .single();
    expect(blank.error).not.toBeNull();
    expect(blank.error?.message).toMatch(/must not be blank/);

    const tooLong = await alice
      .from("breathing_exercises")
      .insert({ ...baseRow(), name: "x".repeat(81) })
      .select("*")
      .single();
    expect(tooLong.error).not.toBeNull();
    expect(tooLong.error?.message).toMatch(/exceeds 80 characters/);
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("breathing_exercises").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("breathing_exercises")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("breathing_exercises_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's exercise", async () => {
    const created = await alice.from("breathing_exercises").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("breathing_exercises").select("id, name").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("breathing_exercises")
      .update({ name: "hacked name" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("breathing_exercises").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("breathing_exercises")
      .select("name, cycles, color")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.name).toBe(NAME);
    expect(aliceRead.data?.cycles).toBe(8);
    expect(aliceRead.data?.color).toBe("aqua");
  });
});

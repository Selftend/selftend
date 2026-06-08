import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllHabitsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over habit_logs:
// - note round-trips plaintext through the same `habit_logs` name, while `habit_logs_data` holds
//   only ciphertext (note_enc).
// - pass-through columns (habit_id, logged_on) survive a round-trip.
// - the note 500-char cap is enforced in the trigger.
// FK child of habits: a parent habit is inserted first (cleanup cascades via deleteAllHabits).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NOTE = "Did it before breakfast (secret-marker-HLOG)";
const TODAY = "2026-06-08";

describe("habit_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let habitId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  beforeEach(async () => {
    const parent = await alice
      .from("habits")
      .insert({
        user_id: SEED_USERS.alice.id,
        name: "Hydrate",
        kind: "build",
        cadence: "daily",
        color: "#3b82f6",
      })
      .select("id")
      .single();
    if (parent.error) throw new Error(`habit insert failed: ${parent.error.message}`);
    habitId = parent.data!.id as string;
  });
  afterEach(async () => {
    await deleteAllHabitsForUser(SEED_USERS.alice.id);
    await deleteAllHabitsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      habit_id: habitId,
      logged_on: TODAY,
      note: NOTE,
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("habit_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      habit_id: habitId,
      logged_on: TODAY,
      note: NOTE,
    });

    const id = insert.data!.id as string;

    const atRest = await admin.from("habit_logs_data").select("note_enc").eq("id", id).single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.note_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.note_enc)).not.toContain("secret-marker-HLOG");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("habit_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("habit_logs_data").select("note_enc").eq("id", id).single();
    const beforeCipher = cipherToText(before.data?.note_enc);

    const updated = await alice
      .from("habit_logs")
      .update({ note: "Skipped, will retry (secret-marker-NEW)", logged_on: "2026-06-09" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.note).toBe("Skipped, will retry (secret-marker-NEW)");
    expect(updated.data?.logged_on).toBe("2026-06-09");
    expect(updated.data?.habit_id).toBe(habitId);

    const after = await admin.from("habit_logs_data").select("note_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.note_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("habit_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("habit_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("habit_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with note longer than 500 characters is rejected", async () => {
    const result = await alice
      .from("habit_logs")
      .insert({ ...baseRow(), note: "x".repeat(501) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's habit log", async () => {
    const created = await alice.from("habit_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("habit_logs").select("id, note").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("habit_logs").update({ note: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("habit_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice.from("habit_logs").select("note, habit_id").eq("id", id).single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.note).toBe(NOTE);
    expect(aliceRead.data?.habit_id).toBe(habitId);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllSleepLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over sleep_logs:
// - notes round-trips plaintext through the same `sleep_logs` name, while `sleep_logs_data`
//   holds only ciphertext (notes_enc).
// - pass-through columns (duration_minutes, quality) survive a round-trip.
// NOTE: notes has no length cap, so there is no cap-rejection assertion.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NOTES = "Woke up twice, restless (secret-marker-SLEEP)";

describe("sleep_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
    await deleteAllSleepLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      duration_minutes: 420,
      quality: 3,
      notes: NOTES,
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("sleep_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      duration_minutes: 420,
      quality: 3,
      notes: NOTES,
    });

    const id = insert.data!.id as string;

    const atRest = await admin.from("sleep_logs_data").select("notes_enc").eq("id", id).single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.notes_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-SLEEP");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("sleep_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("sleep_logs_data").select("notes_enc").eq("id", id).single();
    const beforeCipher = cipherToText(before.data?.notes_enc);

    const updated = await alice
      .from("sleep_logs")
      .update({ duration_minutes: 480, quality: 5, notes: "Slept well (secret-marker-NEW)" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.notes).toBe("Slept well (secret-marker-NEW)");
    expect(updated.data?.duration_minutes).toBe(480);
    expect(updated.data?.quality).toBe(5);

    const after = await admin.from("sleep_logs_data").select("notes_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.notes_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("sleep_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("sleep_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("sleep_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's sleep log", async () => {
    const created = await alice.from("sleep_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("sleep_logs").select("id, notes").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("sleep_logs").update({ notes: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("sleep_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("sleep_logs")
      .select("notes, duration_minutes, quality")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.notes).toBe(NOTES);
    expect(aliceRead.data?.duration_minutes).toBe(420);
    expect(aliceRead.data?.quality).toBe(3);
  });
});

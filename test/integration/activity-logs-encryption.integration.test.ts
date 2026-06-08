import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActivityLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over activity_logs:
// - activity_name + notes round-trip plaintext through the same `activity_logs` name, while
//   `activity_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (category, mood_before, mood_after, pace_category) survive a round-trip.
// - the activity_name 300-char and notes 2000-char caps are enforced in the trigger.
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const ACTIVITY = "Called an old friend (secret-marker-ACT)";
const NOTES = "Felt connected afterward (secret-marker-ANOTES)";

describe("activity_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllActivityLogsForUser(SEED_USERS.alice.id);
    await deleteAllActivityLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      activity_name: ACTIVITY,
      category: "pleasure",
      mood_before: 2,
      mood_after: 4,
      notes: NOTES,
      pace_category: "connection",
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("activity_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      activity_name: ACTIVITY,
      category: "pleasure",
      mood_before: 2,
      mood_after: 4,
      notes: NOTES,
      pace_category: "connection",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("activity_logs_data")
      .select("activity_name_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.activity_name_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.activity_name_enc)).not.toContain("secret-marker-ACT");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-ANOTES");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("activity_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("activity_logs_data")
      .select("activity_name_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.activity_name_enc);

    const updated = await alice
      .from("activity_logs")
      .update({
        activity_name: "Went for a run (secret-marker-NEW)",
        category: "mastery",
        mood_after: 5,
        pace_category: "physical",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.activity_name).toBe("Went for a run (secret-marker-NEW)");
    expect(updated.data?.category).toBe("mastery");
    expect(updated.data?.mood_after).toBe(5);
    expect(updated.data?.pace_category).toBe("physical");

    const after = await admin
      .from("activity_logs_data")
      .select("activity_name_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.activity_name_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("activity_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("activity_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("activity_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with activity_name longer than 300 characters is rejected", async () => {
    const result = await alice
      .from("activity_logs")
      .insert({ ...baseRow(), activity_name: "x".repeat(301) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("INSERT with notes longer than 2000 characters is rejected", async () => {
    const result = await alice
      .from("activity_logs")
      .insert({ ...baseRow(), notes: "x".repeat(2001) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's activity log", async () => {
    const created = await alice.from("activity_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("activity_logs").select("id, activity_name").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("activity_logs").update({ activity_name: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("activity_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("activity_logs")
      .select("activity_name, notes, category")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.activity_name).toBe(ACTIVITY);
    expect(aliceRead.data?.notes).toBe(NOTES);
    expect(aliceRead.data?.category).toBe("pleasure");
  });
});

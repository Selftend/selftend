import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllSelfCareLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over self_care_logs:
// - exercise_type, social_notes, meaningful_activity round-trip plaintext through the same
//   `self_care_logs` name, while `self_care_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (log_date, exercise_done, meals_structured, social_connection_made)
//   survive a round-trip.
// - the social_notes 2000-char cap is enforced in the trigger.
// - RLS isolates a second user.
// NOTE: self_care_logs has NO DELETE RLS policy (only INSERT/SELECT/UPDATE) — the client never
// deletes these rows. So a user DELETE through the view is an RLS no-op (pre-existing behavior).
// The DELETE-trigger path is exercised via the service-role admin client (the cleanup path).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const EXERCISE = "Yoga flow (secret-marker-EX)";
const SOCIAL = "Coffee with sister (secret-marker-SOC)";
const MEANINGFUL = "Wrote in my journal (secret-marker-MEAN)";

describe("self_care_logs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllSelfCareLogsForUser(SEED_USERS.alice.id);
    await deleteAllSelfCareLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      log_date: "2026-06-08",
      exercise_done: true,
      exercise_minutes: 30,
      exercise_type: EXERCISE,
      meals_structured: 3,
      emotional_eating: false,
      social_connection_made: true,
      social_notes: SOCIAL,
      meaningful_activity: MEANINGFUL,
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("self_care_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      log_date: "2026-06-08",
      exercise_done: true,
      exercise_minutes: 30,
      exercise_type: EXERCISE,
      meals_structured: 3,
      emotional_eating: false,
      social_connection_made: true,
      social_notes: SOCIAL,
      meaningful_activity: MEANINGFUL,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("self_care_logs_data")
      .select("exercise_type_enc, social_notes_enc, meaningful_activity_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.exercise_type_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.exercise_type_enc)).not.toContain("secret-marker-EX");
    expect(cipherToText(atRest.data?.social_notes_enc)).not.toContain("secret-marker-SOC");
    expect(cipherToText(atRest.data?.meaningful_activity_enc)).not.toContain("secret-marker-MEAN");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("self_care_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("self_care_logs_data")
      .select("exercise_type_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.exercise_type_enc);

    const updated = await alice
      .from("self_care_logs")
      .update({
        exercise_type: "Running (secret-marker-NEW)",
        meals_structured: 5,
        social_connection_made: false,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.exercise_type).toBe("Running (secret-marker-NEW)");
    expect(updated.data?.meals_structured).toBe(5);
    expect(updated.data?.social_connection_made).toBe(false);

    const after = await admin
      .from("self_care_logs_data")
      .select("exercise_type_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.exercise_type_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger (service-role) removes the base row", async () => {
    // self_care_logs has no DELETE RLS policy for users; the delete path is the service-role
    // cleanup. Exercising the INSTEAD OF delete trigger through the admin client confirms it
    // removes the underlying base row.
    const created = await alice.from("self_care_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await admin.from("self_care_logs").delete().eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("self_care_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with social_notes longer than 2000 characters is rejected", async () => {
    const result = await alice
      .from("self_care_logs")
      .insert({ ...baseRow(), social_notes: "x".repeat(2001) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or update another user's self-care log", async () => {
    const created = await alice.from("self_care_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("self_care_logs").select("id, exercise_type").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("self_care_logs")
      .update({ exercise_type: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const aliceRead = await alice
      .from("self_care_logs")
      .select("exercise_type, social_notes, meals_structured")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.exercise_type).toBe(EXERCISE);
    expect(aliceRead.data?.social_notes).toBe(SOCIAL);
    expect(aliceRead.data?.meals_structured).toBe(3);
  });
});

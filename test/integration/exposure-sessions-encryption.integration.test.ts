import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllExposureForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over exposure_sessions:
// - text columns (safety_behavior_description, notes) round-trip plaintext through the same
//   `exposure_sessions` name, while `exposure_sessions_data` holds only ciphertext (*_enc).
// - pass-through columns (pre/post_suds, duration_minutes, safety_behaviors_used) survive.
// NOTE: exposure_sessions has only INSERT + SELECT user RLS policies (no UPDATE/DELETE) - user
//   UPDATE/DELETE are RLS no-ops; service-role flows through the INSTEAD OF triggers.
// NOTE: neither encrypted column has a length cap, so there is no cap-rejection assertion.
// FK chain: exposure_hierarchies -> exposure_items -> exposure_sessions (inserted in order).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const SAFETY_DESC = "Avoided eye contact (secret-marker-SAFETY)";
const NOTES = "Felt anxious but stayed (secret-marker-NOTES)";

describe("exposure_sessions encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let itemId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  beforeEach(async () => {
    const parent = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Speaking", anxiety_type: "social" })
      .select("id")
      .single();
    if (parent.error) throw new Error(`hierarchy insert failed: ${parent.error.message}`);
    const item = await alice
      .from("exposure_items")
      .insert({
        user_id: SEED_USERS.alice.id,
        hierarchy_id: parent.data!.id,
        description: "5-minute talk",
        suds_rating: 60,
      })
      .select("id")
      .single();
    if (item.error) throw new Error(`item insert failed: ${item.error.message}`);
    itemId = item.data!.id as string;
  });
  afterEach(async () => {
    await deleteAllExposureForUser(SEED_USERS.alice.id);
    await deleteAllExposureForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      exposure_item_id: itemId,
      pre_suds: 70,
      post_suds: 40,
      duration_minutes: 15,
      safety_behaviors_used: true,
      safety_behavior_description: SAFETY_DESC,
      notes: NOTES,
    };
  }

  it("INSERT round-trips text plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("exposure_sessions").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      exposure_item_id: itemId,
      pre_suds: 70,
      post_suds: 40,
      duration_minutes: 15,
      safety_behaviors_used: true,
      safety_behavior_description: SAFETY_DESC,
      notes: NOTES,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("exposure_sessions_data")
      .select("safety_behavior_description_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.safety_behavior_description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.safety_behavior_description_enc)).not.toContain(
      "secret-marker-SAFETY",
    );
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOTES");
  });

  it("UPDATE (service-role) re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("exposure_sessions").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("exposure_sessions_data")
      .select("notes_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.notes_enc);

    // No user UPDATE policy: service-role flows through the INSTEAD OF update trigger.
    const updated = await admin
      .from("exposure_sessions")
      .update({ notes: "Updated notes (secret-marker-NEW)", post_suds: 20 })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.notes).toBe("Updated notes (secret-marker-NEW)");
    expect(updated.data?.post_suds).toBe(20);

    const after = await admin
      .from("exposure_sessions_data")
      .select("notes_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.notes_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger removes the base row (service-role)", async () => {
    const created = await alice.from("exposure_sessions").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // No user DELETE policy: a user delete is an RLS no-op, the row survives.
    const userDel = await alice
      .from("exposure_sessions")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(userDel.error).toBeNull();
    const stillThere = await admin.from("exposure_sessions_data").select("id").eq("id", id);
    expect(stillThere.data).toEqual([{ id }]);

    // Service-role DELETE flows through the INSTEAD OF trigger and removes the base row.
    const adminDel = await admin.from("exposure_sessions").delete().eq("id", id);
    expect(adminDel.error).toBeNull();

    const baseRead = await admin.from("exposure_sessions_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read another user's session", async () => {
    const created = await alice.from("exposure_sessions").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("exposure_sessions")
      .select("id, notes, safety_behavior_description")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const aliceRead = await alice
      .from("exposure_sessions")
      .select("notes, safety_behavior_description, pre_suds")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.notes).toBe(NOTES);
    expect(aliceRead.data?.safety_behavior_description).toBe(SAFETY_DESC);
    expect(aliceRead.data?.pre_suds).toBe(70);
  });
});

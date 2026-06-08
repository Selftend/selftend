import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllExposureForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over exposure_items:
// - the text column (description) round-trips plaintext through the same `exposure_items` name,
//   while `exposure_items_data` holds only ciphertext (description_enc).
// - pass-through columns (hierarchy_id, suds_rating, completed_at) survive a round-trip.
// - the description length cap (2000) is enforced by the INSTEAD OF trigger.
// FK child of exposure_hierarchies: a parent hierarchy is inserted first.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const DESCRIPTION = "Give a 5-minute talk to a small group (secret-marker-DESC)";

describe("exposure_items encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let hierarchyId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  beforeEach(async () => {
    const parent = await alice
      .from("exposure_hierarchies")
      .insert({ user_id: SEED_USERS.alice.id, title: "Public speaking", anxiety_type: "social" })
      .select("id")
      .single();
    if (parent.error) throw new Error(`hierarchy insert failed: ${parent.error.message}`);
    hierarchyId = parent.data!.id as string;
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
      hierarchy_id: hierarchyId,
      description: DESCRIPTION,
      suds_rating: 65,
    };
  }

  it("INSERT round-trips text plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("exposure_items").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      hierarchy_id: hierarchyId,
      description: DESCRIPTION,
      suds_rating: 65,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("exposure_items_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-DESC");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("exposure_items").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("exposure_items_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.description_enc);

    const completedAt = new Date().toISOString();
    const updated = await alice
      .from("exposure_items")
      .update({
        description: "Updated step (secret-marker-NEW)",
        suds_rating: 30,
        completed_at: completedAt,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.description).toBe("Updated step (secret-marker-NEW)");
    expect(updated.data?.suds_rating).toBe(30);
    expect(updated.data?.completed_at).toBeTruthy();

    const after = await admin
      .from("exposure_items_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.description_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice.from("exposure_items").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("exposure_items")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("exposure_items_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with description longer than 2000 characters is rejected", async () => {
    const row = { ...baseRow(), description: "x".repeat(2001) };
    const result = await alice.from("exposure_items").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's item", async () => {
    const created = await alice.from("exposure_items").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("exposure_items").select("id, description").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("exposure_items").update({ description: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("exposure_items").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("exposure_items")
      .select("description, suds_rating")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
    expect(aliceRead.data?.suds_rating).toBe(65);
  });
});

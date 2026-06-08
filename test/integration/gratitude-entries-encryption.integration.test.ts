import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllGratitudeEntriesForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over gratitude_entries:
// - every free-text column (item_1..5, events[], good_moment, miss_if_gone, hidden_good,
//   life_item_1..3, note) round-trips plaintext through the same `gratitude_entries` name, while
//   `gratitude_entries_data` holds only ciphertext (*_enc).
// - pass-through columns (level, starred, logged_at) survive a round-trip.
// - CRITICAL: positional NULL slot semantics are load-bearing. A NULL item slot MUST round-trip
//   to NULL (not '') and a filled slot MUST round-trip to its value. The triggers never coalesce
//   empty slots, and app.encrypt_text(NULL)/app.decrypt_text(NULL) preserve NULL end to end.
// - the note 2000-char cap is enforced in the trigger.
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const ITEM_1 = "Grateful for morning coffee (secret-marker-ITEM1)";
const ITEM_2 = "A kind text from a friend (secret-marker-ITEM2)";
const GOOD_MOMENT = "Sunlight on the desk (secret-marker-GOOD)";
const NOTE = "Felt steadier today (secret-marker-NOTE)";
const EVENTS = ["walk", "call mom", "read"];

describe("gratitude_entries encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllGratitudeEntriesForUser(SEED_USERS.alice.id);
    await deleteAllGratitudeEntriesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("INSERT round-trips plaintext for every field while storing ciphertext at rest", async () => {
    const insert = await alice
      .from("gratitude_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        item_1: ITEM_1,
        item_2: ITEM_2,
        events: EVENTS,
        good_moment: GOOD_MOMENT,
        miss_if_gone: "My family (secret-marker-MISS)",
        hidden_good: "The quiet (secret-marker-HIDDEN)",
        life_item_1: "Health (secret-marker-LIFE1)",
        note: NOTE,
        level: 2,
        starred: true,
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      item_1: ITEM_1,
      item_2: ITEM_2,
      events: EVENTS,
      good_moment: GOOD_MOMENT,
      miss_if_gone: "My family (secret-marker-MISS)",
      hidden_good: "The quiet (secret-marker-HIDDEN)",
      life_item_1: "Health (secret-marker-LIFE1)",
      note: NOTE,
      level: 2,
      starred: true,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("gratitude_entries_data")
      .select(
        "item_1_enc, item_2_enc, events_enc, good_moment_enc, miss_if_gone_enc, hidden_good_enc, life_item_1_enc, note_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.item_1_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.item_1_enc)).not.toContain("secret-marker-ITEM1");
    expect(cipherToText(atRest.data?.item_2_enc)).not.toContain("secret-marker-ITEM2");
    expect(cipherToText(atRest.data?.events_enc)).not.toContain("walk");
    expect(cipherToText(atRest.data?.good_moment_enc)).not.toContain("secret-marker-GOOD");
    expect(cipherToText(atRest.data?.miss_if_gone_enc)).not.toContain("secret-marker-MISS");
    expect(cipherToText(atRest.data?.hidden_good_enc)).not.toContain("secret-marker-HIDDEN");
    expect(cipherToText(atRest.data?.life_item_1_enc)).not.toContain("secret-marker-LIFE1");
    expect(cipherToText(atRest.data?.note_enc)).not.toContain("secret-marker-NOTE");
  });

  it("CRITICAL: a NULL positional slot round-trips to NULL, a filled slot round-trips to its value", async () => {
    // item_1 filled, item_2 explicit empty string, item_3..5 left NULL, life_item_2/3 NULL.
    const insert = await alice
      .from("gratitude_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        item_1: ITEM_1,
        item_2: "",
        item_3: null,
        item_4: null,
        item_5: null,
        life_item_1: "Health (secret-marker-LIFE1)",
        life_item_2: null,
        life_item_3: null,
        events: [],
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    // Filled slot keeps its value.
    expect(insert.data?.item_1).toBe(ITEM_1);
    // Empty-string slot stays '' (NOT coalesced away).
    expect(insert.data?.item_2).toBe("");
    // NULL slots stay strictly NULL (never blank-filled to '').
    expect(insert.data?.item_3).toBeNull();
    expect(insert.data?.item_4).toBeNull();
    expect(insert.data?.item_5).toBeNull();
    expect(insert.data?.life_item_2).toBeNull();
    expect(insert.data?.life_item_3).toBeNull();

    const id = insert.data!.id as string;

    // Confirm NULL semantics persist at rest: a NULL slot has NULL ciphertext (not encrypted '').
    const atRest = await admin
      .from("gratitude_entries_data")
      .select("item_1_enc, item_2_enc, item_3_enc, item_4_enc, item_5_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(atRest.data?.item_1_enc).not.toBeNull();
    expect(atRest.data?.item_2_enc).not.toBeNull(); // '' encrypts to a non-null ciphertext
    expect(atRest.data?.item_3_enc).toBeNull();
    expect(atRest.data?.item_4_enc).toBeNull();
    expect(atRest.data?.item_5_enc).toBeNull();

    // Re-read through the view to confirm NULL vs '' distinction survives decrypt.
    const reread = await alice
      .from("gratitude_entries")
      .select("item_1, item_2, item_3, item_4, item_5")
      .eq("id", id)
      .single();
    expect(reread.error).toBeNull();
    expect(reread.data?.item_1).toBe(ITEM_1);
    expect(reread.data?.item_2).toBe("");
    expect(reread.data?.item_3).toBeNull();
    expect(reread.data?.item_4).toBeNull();
    expect(reread.data?.item_5).toBeNull();
  });

  it("UPDATE re-encrypts and preserves pass-through + NULL-slot semantics", async () => {
    const created = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, item_1: ITEM_1, item_2: ITEM_2, level: 1 })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("gratitude_entries_data")
      .select("item_1_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.item_1_enc);

    const updated = await alice
      .from("gratitude_entries")
      .update({
        item_1: "Updated gratitude (secret-marker-UPD)",
        item_2: null, // clear a slot back to NULL
        starred: true,
        level: 3,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.item_1).toBe("Updated gratitude (secret-marker-UPD)");
    expect(updated.data?.item_2).toBeNull();
    expect(updated.data?.starred).toBe(true);
    expect(updated.data?.level).toBe(3);

    const after = await admin
      .from("gratitude_entries_data")
      .select("item_1_enc, item_2_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.item_1_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-UPD");
    expect(after.data?.item_2_enc).toBeNull(); // cleared slot is NULL at rest
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, item_1: ITEM_1 })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("gratitude_entries")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("gratitude_entries_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with note longer than 2000 characters is rejected", async () => {
    const overLong = "x".repeat(2001);
    const result = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, item_1: ITEM_1, note: overLong })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("INSERT with no non-blank item is rejected (at_least_one_item guard preserved)", async () => {
    const result = await alice
      .from("gratitude_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        item_1: "",
        item_2: null,
        item_3: null,
        item_4: null,
        item_5: null,
      })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's entry", async () => {
    const created = await alice
      .from("gratitude_entries")
      .insert({ user_id: SEED_USERS.alice.id, item_1: ITEM_1 })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("gratitude_entries").select("id, item_1").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("gratitude_entries").update({ item_1: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("gratitude_entries").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice.from("gratitude_entries").select("item_1").eq("id", id).single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.item_1).toBe(ITEM_1);
  });
});

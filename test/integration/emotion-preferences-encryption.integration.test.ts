import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllEmotionPreferencesForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over emotion_preferences:
// - name (custom emotion display name) round-trips plaintext through the same
//   `emotion_preferences` name, while `emotion_preferences_data` holds only ciphertext (name_enc).
// - NULL name (default/built-in emotions) round-trips to NULL (never coalesced to '').
// - pass-through columns (emoji, position, removed, is_custom, emotion_id) survive a round-trip.
// - UPSERT: UNIQUE (user_id, emotion_id); a second INSERT for the same (user, emotion) merges
//   (the INSTEAD OF INSERT trigger's ON CONFLICT (user_id, emotion_id) DO UPDATE) rather than
//   erroring - the .upsert() semantics formerly carried by PostgREST.
// - PARTIAL-UPDATE PRESERVATION: a position-only "reorder" upsert must not wipe name/emoji;
//   a removed-only upsert must not wipe name/position. This is the trigger's coalesce(excluded,
//   base) behaviour replacing PostgREST's "SET <provided columns only>".
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const EMOTION_ID = "custom_secret_marker_emotion";
const NAME = "Bittersweet (secret-marker-EMO)";
const EMOJI = "🫠";

describe("emotion_preferences encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllEmotionPreferencesForUser(SEED_USERS.alice.id);
    await deleteAllEmotionPreferencesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function customRow() {
    return {
      user_id: SEED_USERS.alice.id,
      emotion_id: EMOTION_ID,
      name: NAME,
      emoji: EMOJI,
      position: 3,
      is_custom: true,
    };
  }

  it("INSERT round-trips a custom name as plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("emotion_preferences").insert(customRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      emotion_id: EMOTION_ID,
      name: NAME,
      emoji: EMOJI,
      position: 3,
      removed: false,
      is_custom: true,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("emotion_preferences_data")
      .select("name_enc, emoji, position, removed, is_custom")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.name_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.name_enc)).not.toContain("secret-marker-EMO");
    // Pass-through columns stay plaintext on the base table.
    expect(atRest.data?.emoji).toBe(EMOJI);
    expect(atRest.data?.position).toBe(3);
    expect(atRest.data?.is_custom).toBe(true);
  });

  it("INSERT of a default emotion keeps a NULL name (round-trips to NULL, not '')", async () => {
    const insert = await alice
      .from("emotion_preferences")
      .insert({
        user_id: SEED_USERS.alice.id,
        emotion_id: "default_secret_marker",
        position: 0,
        is_custom: false,
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.name).toBeNull();

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("emotion_preferences_data")
      .select("name_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    // NULL plaintext -> NULL ciphertext at rest.
    expect(atRest.data?.name_enc).toBeNull();
  });

  it("UPDATE re-encrypts the name and pass-through columns survive", async () => {
    const created = await alice
      .from("emotion_preferences")
      .insert(customRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("emotion_preferences_data")
      .select("name_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.name_enc);

    const updated = await alice
      .from("emotion_preferences")
      .update({ name: "Renamed (secret-marker-NEW)", emoji: "😶‍🌫️", position: 7 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.name).toBe("Renamed (secret-marker-NEW)");
    expect(updated.data?.emoji).toBe("😶‍🌫️");
    expect(updated.data?.position).toBe(7);

    const after = await admin
      .from("emotion_preferences_data")
      .select("name_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.name_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("UPSERT (partial: position only) merges and does NOT wipe name/emoji", async () => {
    const created = await alice
      .from("emotion_preferences")
      .insert(customRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // setEmotionOrder-style upsert: only {user_id, emotion_id, position}.
    const reorder = await alice
      .from("emotion_preferences")
      .insert({ user_id: SEED_USERS.alice.id, emotion_id: EMOTION_ID, position: 9 })
      .select("*")
      .single();
    expect(reorder.error).toBeNull();
    // Same row (merged on the unique key) with updated position...
    expect(reorder.data?.id).toBe(id);
    expect(reorder.data?.position).toBe(9);
    // ...and name/emoji/is_custom preserved (NOT clobbered to NULL).
    expect(reorder.data?.name).toBe(NAME);
    expect(reorder.data?.emoji).toBe(EMOJI);
    expect(reorder.data?.is_custom).toBe(true);

    const rows = await alice
      .from("emotion_preferences")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("emotion_id", EMOTION_ID);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });

  it("UPSERT (partial: removed only) merges and does NOT wipe name/position", async () => {
    const created = await alice
      .from("emotion_preferences")
      .insert(customRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // useRemoveEmotion-style upsert for a non-custom emotion: only {emotion_id, removed}.
    const removed = await alice
      .from("emotion_preferences")
      .insert({ user_id: SEED_USERS.alice.id, emotion_id: EMOTION_ID, removed: true })
      .select("*")
      .single();
    expect(removed.error).toBeNull();
    expect(removed.data?.id).toBe(id);
    expect(removed.data?.removed).toBe(true);
    // name + position preserved.
    expect(removed.data?.name).toBe(NAME);
    expect(removed.data?.position).toBe(3);
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("emotion_preferences")
      .insert(customRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("emotion_preferences")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("emotion_preferences_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's preference", async () => {
    const created = await alice
      .from("emotion_preferences")
      .insert(customRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("emotion_preferences").select("id, name").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("emotion_preferences").update({ name: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("emotion_preferences").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("emotion_preferences")
      .select("name, emoji, position")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.name).toBe(NAME);
    expect(aliceRead.data?.emoji).toBe(EMOJI);
    expect(aliceRead.data?.position).toBe(3);
  });
});

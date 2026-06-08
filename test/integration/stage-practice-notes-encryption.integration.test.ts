import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllStagePracticeNotesForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over stage_practice_notes:
// - note round-trips plaintext through the same `stage_practice_notes` name, while
//   `stage_practice_notes_data` holds only ciphertext (note_enc).
// - pass-through column (stage) survives a round-trip.
// - updated_at is refreshed on UPDATE (the table has no BEFORE-UPDATE trigger, so the INSTEAD OF
//   update sets it itself).
// - RLS isolates a second user (single ALL policy; DELETE works for the owning user).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NOTE = "Anchored on the breath for ten minutes (secret-marker-NOTE)";

describe("stage_practice_notes encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllStagePracticeNotesForUser(SEED_USERS.alice.id);
    await deleteAllStagePracticeNotesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      stage: 3,
      note: NOTE,
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("stage_practice_notes").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      stage: 3,
      note: NOTE,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("stage_practice_notes_data")
      .select("note_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.note_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.note_enc)).not.toContain("secret-marker-NOTE");
  });

  it("UPDATE re-encrypts, refreshes updated_at, and pass-through survives", async () => {
    const created = await alice
      .from("stage_practice_notes")
      .insert(baseRow())
      .select("id, updated_at")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;
    const initialUpdatedAt = created.data!.updated_at as string;

    const before = await admin
      .from("stage_practice_notes_data")
      .select("note_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.note_enc);

    // Small delay so updated_at can advance measurably.
    await new Promise((r) => setTimeout(r, 10));

    const updated = await alice
      .from("stage_practice_notes")
      .update({ note: "Counted breaths to fifty (secret-marker-NEW)", stage: 5 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.note).toBe("Counted breaths to fifty (secret-marker-NEW)");
    expect(updated.data?.stage).toBe(5);
    expect(new Date(updated.data?.updated_at as string).getTime()).toBeGreaterThanOrEqual(
      new Date(initialUpdatedAt).getTime(),
    );

    const after = await admin
      .from("stage_practice_notes_data")
      .select("note_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.note_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("stage_practice_notes")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("stage_practice_notes")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("stage_practice_notes_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's note", async () => {
    const created = await alice
      .from("stage_practice_notes")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("stage_practice_notes").select("id, note").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("stage_practice_notes").update({ note: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("stage_practice_notes").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("stage_practice_notes")
      .select("note, stage")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.note).toBe(NOTE);
    expect(aliceRead.data?.stage).toBe(3);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_choice_points:
// - hooks / away_moves / toward_moves (text[]) and notes (text) round-trip through the same
//   `act_choice_points` name, while `act_choice_points_data` holds only ciphertext (*_enc).
//   The text[] arrays survive the whole-array ::text -> ::text[] round-trip including order and
//   values with commas/spaces.
// - pass-through columns (id, user_id, created_at, updated_at) survive a round-trip.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const HOOKS = ["Urge to scroll (secret-marker-HK1)", "Boredom, restlessness (secret-marker-HK2)"];
const AWAY = ["Open the app (secret-marker-AW1)"];
const TOWARD = ["Take a walk (secret-marker-TW1)", "Call a friend (secret-marker-TW2)"];
const NOTES = "Noticed the pause before acting (secret-marker-NOT)";

describe("act_choice_points encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
    await deleteAllActLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      hooks: HOOKS,
      away_moves: AWAY,
      toward_moves: TOWARD,
      notes: NOTES,
    };
  }

  it("INSERT round-trips text[] arrays + notes while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_choice_points").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data?.hooks).toEqual(HOOKS);
    expect(insert.data?.away_moves).toEqual(AWAY);
    expect(insert.data?.toward_moves).toEqual(TOWARD);
    expect(insert.data?.notes).toBe(NOTES);

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_choice_points_data")
      .select("hooks_enc, away_moves_enc, toward_moves_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.hooks_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.hooks_enc)).not.toContain("secret-marker-HK1");
    expect(cipherToText(atRest.data?.away_moves_enc)).not.toContain("secret-marker-AW1");
    expect(cipherToText(atRest.data?.toward_moves_enc)).not.toContain("secret-marker-TW1");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("INSERT with empty arrays round-trips as empty (not null)", async () => {
    const insert = await alice
      .from("act_choice_points")
      .insert({
        user_id: SEED_USERS.alice.id,
        hooks: [],
        away_moves: [],
        toward_moves: [],
        notes: "",
      })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.hooks).toEqual([]);
    expect(insert.data?.away_moves).toEqual([]);
    expect(insert.data?.toward_moves).toEqual([]);
    expect(insert.data?.notes).toBe("");
  });

  it("UPDATE re-encrypts the arrays and round-trips the new values", async () => {
    const created = await alice.from("act_choice_points").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_choice_points_data")
      .select("toward_moves_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.toward_moves_enc);

    const NEW_TOWARD = ["Journal for 5 minutes (secret-marker-TW3)"];
    const updated = await alice
      .from("act_choice_points")
      .update({ toward_moves: NEW_TOWARD, notes: "Updated (secret-marker-NOT2)" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.toward_moves).toEqual(NEW_TOWARD);
    expect(updated.data?.hooks).toEqual(HOOKS); // untouched array preserved

    const after = await admin
      .from("act_choice_points_data")
      .select("toward_moves_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.toward_moves_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-TW3");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_choice_points").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_choice_points")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_choice_points_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read or mutate another user's choice point", async () => {
    const created = await alice.from("act_choice_points").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_choice_points").select("id, hooks").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("act_choice_points").update({ notes: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_choice_points").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_choice_points")
      .select("hooks, away_moves, toward_moves, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.hooks).toEqual(HOOKS);
    expect(aliceRead.data?.away_moves).toEqual(AWAY);
    expect(aliceRead.data?.toward_moves).toEqual(TOWARD);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

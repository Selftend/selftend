import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllHabitsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over habits:
// - all free-text columns (name, identity, cue_plan, stack_after, craving_pairing,
//   two_minute_version, reward_note) round-trip plaintext through the same `habits` name, while
//   `habits_data` holds only ciphertext (*_enc).
// - pass-through columns (kind, cadence, custom_days[], color) survive a round-trip.
// - the name 120-char cap and not-blank guard are enforced in the trigger.
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const NAME = "Morning meditation (secret-marker-NAME)";
const IDENTITY = "I am a calm person (secret-marker-IDENT)";
const CUE = "After brushing teeth (secret-marker-CUE)";
const REWARD = "A good coffee (secret-marker-REWARD)";

describe("habits encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
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
      name: NAME,
      kind: "build",
      identity: IDENTITY,
      cue_plan: CUE,
      stack_after: "Coffee (secret-marker-STACK)",
      craving_pairing: "Podcast (secret-marker-CRAV)",
      two_minute_version: "Sit and breathe once (secret-marker-2MIN)",
      reward_note: REWARD,
      cadence: "daily",
      color: "#8b5cf6",
    };
  }

  it("INSERT round-trips plaintext for every field while storing ciphertext at rest", async () => {
    const insert = await alice.from("habits").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      name: NAME,
      kind: "build",
      identity: IDENTITY,
      cue_plan: CUE,
      reward_note: REWARD,
      cadence: "daily",
      color: "#8b5cf6",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("habits_data")
      .select(
        "name_enc, identity_enc, cue_plan_enc, stack_after_enc, craving_pairing_enc, two_minute_version_enc, reward_note_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.name_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.name_enc)).not.toContain("secret-marker-NAME");
    expect(cipherToText(atRest.data?.identity_enc)).not.toContain("secret-marker-IDENT");
    expect(cipherToText(atRest.data?.cue_plan_enc)).not.toContain("secret-marker-CUE");
    expect(cipherToText(atRest.data?.stack_after_enc)).not.toContain("secret-marker-STACK");
    expect(cipherToText(atRest.data?.craving_pairing_enc)).not.toContain("secret-marker-CRAV");
    expect(cipherToText(atRest.data?.two_minute_version_enc)).not.toContain("secret-marker-2MIN");
    expect(cipherToText(atRest.data?.reward_note_enc)).not.toContain("secret-marker-REWARD");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("habits").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("habits_data").select("name_enc").eq("id", id).single();
    const beforeCipher = cipherToText(before.data?.name_enc);

    const updated = await alice
      .from("habits")
      .update({
        name: "Evening walk (secret-marker-NEW)",
        cadence: "custom",
        custom_days: [1, 3, 5],
        color: "#22c55e",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.name).toBe("Evening walk (secret-marker-NEW)");
    expect(updated.data?.cadence).toBe("custom");
    expect(updated.data?.custom_days).toEqual([1, 3, 5]);
    expect(updated.data?.color).toBe("#22c55e");

    const after = await admin.from("habits_data").select("name_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.name_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("habits").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice.from("habits").delete().eq("user_id", SEED_USERS.alice.id).eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("habits_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with name longer than 120 characters is rejected", async () => {
    const result = await alice
      .from("habits")
      .insert({ ...baseRow(), name: "x".repeat(121) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("INSERT with blank name is rejected (not-blank guard preserved)", async () => {
    const result = await alice
      .from("habits")
      .insert({ ...baseRow(), name: "   " })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's habit", async () => {
    const created = await alice.from("habits").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("habits").select("id, name").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("habits").update({ name: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("habits").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice.from("habits").select("name, kind").eq("id", id).single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.name).toBe(NAME);
    expect(aliceRead.data?.kind).toBe("build");
  });
});

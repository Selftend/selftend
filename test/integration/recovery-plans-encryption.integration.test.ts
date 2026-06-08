import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Verifies the transparent encrypted view over recovery_plans:
// - a text column (personal_slogan), a JSONB column (strategy_integration_notes) and two text[]
//   columns (maintenance_commitments, recovery_keys) all round-trip plaintext through the same
//   `recovery_plans` name, while `recovery_plans_data` holds only ciphertext (*_enc).
// - the personal_slogan length cap (500) is enforced by the INSTEAD OF trigger.
// NOTE: recovery_plans has UNIQUE(user_id) — at most one plan per user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const SLOGAN = "One day at a time (secret-marker-SLOGAN)";
const NOTES = {
  cravings: "watch for evening triggers (secret-marker-NOTES)",
  supports: ["sponsor", "meetings"],
};
const COMMITMENTS = [
  "Attend a meeting weekly (secret-marker-COM1)",
  "Journal each morning (secret-marker-COM2)",
];
const KEYS = ["Breathe (secret-marker-KEY1)", "Call for help (secret-marker-KEY2)"];

async function deleteAllRecoveryForUser(userId: string) {
  const admin = createServiceClient();
  const cp = await admin.from("challenge_plans").delete().eq("user_id", userId);
  if (cp.error) throw new Error(`challenge_plans cleanup failed: ${cp.error.message}`);
  const rp = await admin.from("recovery_plans").delete().eq("user_id", userId);
  if (rp.error) throw new Error(`recovery_plans cleanup failed: ${rp.error.message}`);
}

describe("recovery_plans encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllRecoveryForUser(SEED_USERS.alice.id);
    await deleteAllRecoveryForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      personal_slogan: SLOGAN,
      strategy_integration_notes: NOTES,
      maintenance_commitments: COMMITMENTS,
      recovery_keys: KEYS,
    };
  }

  it("INSERT round-trips text, JSONB and text[] plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("recovery_plans").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      personal_slogan: SLOGAN,
      maintenance_commitments: COMMITMENTS,
      recovery_keys: KEYS,
    });
    // JSONB round-trips to the exact same object.
    expect(insert.data?.strategy_integration_notes).toEqual(NOTES);

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("recovery_plans_data")
      .select(
        "personal_slogan_enc, strategy_integration_notes_enc, maintenance_commitments_enc, recovery_keys_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.personal_slogan_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.personal_slogan_enc)).not.toContain("secret-marker-SLOGAN");
    expect(cipherToText(atRest.data?.strategy_integration_notes_enc)).not.toContain(
      "secret-marker-NOTES",
    );
    expect(cipherToText(atRest.data?.maintenance_commitments_enc)).not.toContain(
      "secret-marker-COM1",
    );
    expect(cipherToText(atRest.data?.recovery_keys_enc)).not.toContain("secret-marker-KEY1");
  });

  it("UPDATE re-encrypts and JSONB / text[] round-trip the new values", async () => {
    const created = await alice.from("recovery_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("recovery_plans_data")
      .select("strategy_integration_notes_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.strategy_integration_notes_enc);

    const NEW_NOTES = { plan: "revised (secret-marker-NN)" };
    const NEW_KEYS = ["New key (secret-marker-NK)"];
    const updated = await alice
      .from("recovery_plans")
      .update({
        strategy_integration_notes: NEW_NOTES,
        recovery_keys: NEW_KEYS,
        personal_slogan: "Progress not perfection",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.strategy_integration_notes).toEqual(NEW_NOTES);
    expect(updated.data?.recovery_keys).toEqual(NEW_KEYS);
    expect(updated.data?.personal_slogan).toBe("Progress not perfection");

    const after = await admin
      .from("recovery_plans_data")
      .select("strategy_integration_notes_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.strategy_integration_notes_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NN");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice.from("recovery_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("recovery_plans")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("recovery_plans_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with personal_slogan longer than 500 characters is rejected", async () => {
    const row = { ...baseRow(), personal_slogan: "x".repeat(501) };
    const result = await alice.from("recovery_plans").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's plan", async () => {
    const created = await alice.from("recovery_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("recovery_plans").select("id, personal_slogan").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("recovery_plans")
      .update({ personal_slogan: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("recovery_plans").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("recovery_plans")
      .select("personal_slogan, strategy_integration_notes, recovery_keys")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.personal_slogan).toBe(SLOGAN);
    expect(aliceRead.data?.strategy_integration_notes).toEqual(NOTES);
    expect(aliceRead.data?.recovery_keys).toEqual(KEYS);
  });
});

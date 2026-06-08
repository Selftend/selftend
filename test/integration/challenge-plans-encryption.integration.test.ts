import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Verifies the transparent encrypted view over challenge_plans:
// - the text column (challenge_description) AND a text[] column (coping_steps) round-trip
//   plaintext through the same `challenge_plans` name, while `challenge_plans_data` holds only
//   ciphertext (*_enc).
// PREFLIGHT CORRECTION: coping_steps is text[] (not plain text) — whole-array encryption.
// FK child of recovery_plans via composite (recovery_plan_id, user_id): a parent recovery_plan
//   is inserted first (one per user via UNIQUE(user_id)).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const DESCRIPTION = "Handle a stressful family event (secret-marker-DESC)";
const COPING_STEPS = [
  "Step away to breathe (secret-marker-CS1)",
  "Call my sponsor (secret-marker-CS2)",
];

async function deleteAllRecoveryForUser(userId: string) {
  const admin = createServiceClient();
  const cp = await admin.from("challenge_plans").delete().eq("user_id", userId);
  if (cp.error) throw new Error(`challenge_plans cleanup failed: ${cp.error.message}`);
  const rp = await admin.from("recovery_plans").delete().eq("user_id", userId);
  if (rp.error) throw new Error(`recovery_plans cleanup failed: ${rp.error.message}`);
}

async function ensureRecoveryPlan(client: SupabaseClient, userId: string): Promise<string> {
  const inserted = await client
    .from("recovery_plans")
    .insert({ user_id: userId, personal_slogan: "One day at a time" })
    .select("id")
    .single();
  if (inserted.error) throw new Error(`recovery_plan insert failed: ${inserted.error.message}`);
  return inserted.data!.id as string;
}

describe("challenge_plans encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let recoveryPlanId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  beforeEach(async () => {
    await deleteAllRecoveryForUser(SEED_USERS.alice.id);
    recoveryPlanId = await ensureRecoveryPlan(alice, SEED_USERS.alice.id);
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
      recovery_plan_id: recoveryPlanId,
      challenge_description: DESCRIPTION,
      coping_steps: COPING_STEPS,
    };
  }

  it("INSERT round-trips text and text[] plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("challenge_plans").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      recovery_plan_id: recoveryPlanId,
      challenge_description: DESCRIPTION,
      coping_steps: COPING_STEPS,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("challenge_plans_data")
      .select("challenge_description_enc, coping_steps_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.challenge_description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.challenge_description_enc)).not.toContain(
      "secret-marker-DESC",
    );
    expect(cipherToText(atRest.data?.coping_steps_enc)).not.toContain("secret-marker-CS1");
  });

  it("UPDATE re-encrypts and the text[] round-trips the new values", async () => {
    const created = await alice.from("challenge_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("challenge_plans_data")
      .select("coping_steps_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.coping_steps_enc);

    const NEW_STEPS = ["Go for a walk (secret-marker-CS3)"];
    const updated = await alice
      .from("challenge_plans")
      .update({ challenge_description: "Updated (secret-marker-NEW)", coping_steps: NEW_STEPS })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.challenge_description).toBe("Updated (secret-marker-NEW)");
    expect(updated.data?.coping_steps).toEqual(NEW_STEPS);

    const after = await admin
      .from("challenge_plans_data")
      .select("coping_steps_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.coping_steps_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-CS3");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice.from("challenge_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("challenge_plans")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("challenge_plans_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read or mutate another user's plan", async () => {
    const created = await alice.from("challenge_plans").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("challenge_plans")
      .select("id, challenge_description")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("challenge_plans")
      .update({ challenge_description: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("challenge_plans").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("challenge_plans")
      .select("challenge_description, coping_steps")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.challenge_description).toBe(DESCRIPTION);
    expect(aliceRead.data?.coping_steps).toEqual(COPING_STEPS);
  });
});

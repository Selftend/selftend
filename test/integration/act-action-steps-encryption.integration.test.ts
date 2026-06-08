import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_action_steps:
// - description round-trips plaintext through the same `act_action_steps` name, while
//   `act_action_steps_data` holds only ciphertext (description_enc).
// - pass-through columns (action_id, is_completed, completed_at) survive a round-trip.
// - action_id FK -> act_committed_actions_data(id) is enforced (parent inserted first).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const DESCRIPTION = "Lay out my shoes the night before (secret-marker-STEP)";

describe("act_action_steps encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let aliceActionId: string;

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

  // Each test inserts its own parent committed action (cleared in afterEach).
  async function createParentAction(): Promise<string> {
    const action = await alice
      .from("act_committed_actions")
      .insert({
        user_id: SEED_USERS.alice.id,
        life_domain: "work",
        title: "Parent action",
        description: "",
        status: "active",
        obstacles: "",
      })
      .select("id")
      .single();
    expect(action.error).toBeNull();
    aliceActionId = action.data!.id as string;
    return aliceActionId;
  }

  function baseRow(actionId: string) {
    return {
      user_id: SEED_USERS.alice.id,
      action_id: actionId,
      description: DESCRIPTION,
      is_completed: false,
    };
  }

  it("INSERT round-trips the description while storing ciphertext at rest", async () => {
    const actionId = await createParentAction();
    const insert = await alice
      .from("act_action_steps")
      .insert(baseRow(actionId))
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      action_id: actionId,
      description: DESCRIPTION,
      is_completed: false,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_action_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-STEP");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const actionId = await createParentAction();
    const created = await alice
      .from("act_action_steps")
      .insert(baseRow(actionId))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_action_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.description_enc);

    const NEW_DESCRIPTION = "Pack my gym bag (secret-marker-STEP2)";
    const completedAt = "2026-06-08T10:00:00.000Z";
    const updated = await alice
      .from("act_action_steps")
      .update({ description: NEW_DESCRIPTION, is_completed: true, completed_at: completedAt })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.description).toBe(NEW_DESCRIPTION);
    expect(updated.data?.is_completed).toBe(true);
    expect(new Date(updated.data?.completed_at as string).toISOString()).toBe(completedAt);

    const after = await admin
      .from("act_action_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.description_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-STEP2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const actionId = await createParentAction();
    const created = await alice
      .from("act_action_steps")
      .insert(baseRow(actionId))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_action_steps")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_action_steps_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with a non-existent action_id is rejected by the FK", async () => {
    const row = {
      user_id: SEED_USERS.alice.id,
      action_id: "00000000-0000-0000-0000-0000000000ff",
      description: "orphan step",
      is_completed: false,
    };
    const result = await alice.from("act_action_steps").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's action step", async () => {
    const actionId = await createParentAction();
    const created = await alice
      .from("act_action_steps")
      .insert(baseRow(actionId))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_action_steps").select("id, description").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_action_steps")
      .update({ description: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_action_steps").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_action_steps")
      .select("description")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
  });
});

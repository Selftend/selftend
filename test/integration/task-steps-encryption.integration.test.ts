import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllProcrastinationTasksForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over task_steps:
// - the text column (description) round-trips plaintext through the same `task_steps` name,
//   while `task_steps_data` holds only ciphertext (description_enc).
// - pass-through columns (estimated_minutes, completed_at) survive a round-trip.
// NOTE: description has no length cap, so there is no cap-rejection assertion.
// FK child of procrastination_tasks: a parent task is inserted first.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const DESCRIPTION = "Gather all the receipts (secret-marker-STEP)";

describe("task_steps encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let taskId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  beforeEach(async () => {
    const parent = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Tax return",
        avoidance_reason: "overwhelm",
        fear_thought: "errors",
        challenged_thought: "ask help",
        reward: "dinner",
        status: "active",
      })
      .select("id")
      .single();
    if (parent.error) throw new Error(`task insert failed: ${parent.error.message}`);
    taskId = parent.data!.id as string;
  });
  afterEach(async () => {
    await deleteAllProcrastinationTasksForUser(SEED_USERS.alice.id);
    await deleteAllProcrastinationTasksForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      task_id: taskId,
      description: DESCRIPTION,
      estimated_minutes: 30,
    };
  }

  it("INSERT round-trips text plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("task_steps").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      task_id: taskId,
      description: DESCRIPTION,
      estimated_minutes: 30,
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("task_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-STEP");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("task_steps").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("task_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.description_enc);

    const completedAt = new Date().toISOString();
    const updated = await alice
      .from("task_steps")
      .update({
        description: "Updated step (secret-marker-NEW)",
        estimated_minutes: 45,
        completed_at: completedAt,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.description).toBe("Updated step (secret-marker-NEW)");
    expect(updated.data?.estimated_minutes).toBe(45);
    expect(updated.data?.completed_at).toBeTruthy();

    const after = await admin
      .from("task_steps_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.description_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice.from("task_steps").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("task_steps")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("task_steps_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read or mutate another user's step", async () => {
    const created = await alice.from("task_steps").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("task_steps").select("id, description").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("task_steps").update({ description: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("task_steps").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("task_steps")
      .select("description, estimated_minutes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
    expect(aliceRead.data?.estimated_minutes).toBe(30);
  });
});

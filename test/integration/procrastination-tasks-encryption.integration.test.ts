import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllProcrastinationTasksForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over procrastination_tasks:
// - the five text columns round-trip plaintext through the same `procrastination_tasks` name,
//   while `procrastination_tasks_data` holds only ciphertext (*_enc).
// - pass-through columns (deadline, status) survive a round-trip.
// - the task_description length cap (2000) is enforced by the INSTEAD OF trigger.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const TASK_DESC = "Finish the tax return (secret-marker-TASK)";
const AVOIDANCE = "It feels overwhelming (secret-marker-AVOID)";
const FEAR = "I will get it wrong (secret-marker-FEAR)";
const CHALLENGED = "I can ask an accountant (secret-marker-CHAL)";
const REWARD = "A nice dinner (secret-marker-REWARD)";

describe("procrastination_tasks encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
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
      task_description: TASK_DESC,
      avoidance_reason: AVOIDANCE,
      fear_thought: FEAR,
      challenged_thought: CHALLENGED,
      reward: REWARD,
      deadline: "2026-12-31",
      status: "active",
    };
  }

  it("INSERT round-trips all text plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("procrastination_tasks").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      task_description: TASK_DESC,
      avoidance_reason: AVOIDANCE,
      fear_thought: FEAR,
      challenged_thought: CHALLENGED,
      reward: REWARD,
      deadline: "2026-12-31",
      status: "active",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("procrastination_tasks_data")
      .select(
        "task_description_enc, avoidance_reason_enc, fear_thought_enc, challenged_thought_enc, reward_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.task_description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.task_description_enc)).not.toContain("secret-marker-TASK");
    expect(cipherToText(atRest.data?.avoidance_reason_enc)).not.toContain("secret-marker-AVOID");
    expect(cipherToText(atRest.data?.fear_thought_enc)).not.toContain("secret-marker-FEAR");
    expect(cipherToText(atRest.data?.challenged_thought_enc)).not.toContain("secret-marker-CHAL");
    expect(cipherToText(atRest.data?.reward_enc)).not.toContain("secret-marker-REWARD");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice
      .from("procrastination_tasks")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("procrastination_tasks_data")
      .select("task_description_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.task_description_enc);

    const updated = await alice
      .from("procrastination_tasks")
      .update({ task_description: "Renamed task (secret-marker-NEW)", status: "completed" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.task_description).toBe("Renamed task (secret-marker-NEW)");
    expect(updated.data?.status).toBe("completed");

    const after = await admin
      .from("procrastination_tasks_data")
      .select("task_description_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.task_description_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice
      .from("procrastination_tasks")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("procrastination_tasks")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("procrastination_tasks_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with task_description longer than 2000 characters is rejected", async () => {
    const row = { ...baseRow(), task_description: "x".repeat(2001) };
    const result = await alice.from("procrastination_tasks").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's task", async () => {
    const created = await alice
      .from("procrastination_tasks")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob
      .from("procrastination_tasks")
      .select("id, task_description")
      .eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("procrastination_tasks")
      .update({ task_description: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("procrastination_tasks").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("procrastination_tasks")
      .select("task_description, reward")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.task_description).toBe(TASK_DESC);
    expect(aliceRead.data?.reward).toBe(REWARD);
  });
});

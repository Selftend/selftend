import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllGoalsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over milestones:
// - description round-trips plaintext through the same `milestones` name, while
//   `milestones_data` holds only ciphertext (description_enc).
// - pass-through columns (goal_id, target_date, completed_at) survive a round-trip.
// - RLS isolates a second user.
// milestones is an FK child of goals (goal_id -> goals_data.id), so each test inserts a parent
// goal first. deleteAllGoalsForUser clears milestones then goals.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const DESCRIPTION = "Finish the first 5km block (secret-marker-DESC)";

describe("milestones encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllGoalsForUser(SEED_USERS.alice.id);
    await deleteAllGoalsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  async function createGoal(client: SupabaseClient, userId: string): Promise<string> {
    const goal = await client
      .from("goals")
      .insert({
        user_id: userId,
        title: "Parent goal",
        description: "Parent goal description",
        life_domain: "health",
        goal_type: "outcome",
        status: "active",
      })
      .select("id")
      .single();
    expect(goal.error).toBeNull();
    return goal.data!.id as string;
  }

  function baseRow(goalId: string, userId: string) {
    return {
      goal_id: goalId,
      user_id: userId,
      description: DESCRIPTION,
      target_date: "2026-09-30",
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const goalId = await createGoal(alice, SEED_USERS.alice.id);
    const insert = await alice
      .from("milestones")
      .insert(baseRow(goalId, SEED_USERS.alice.id))
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      goal_id: goalId,
      user_id: SEED_USERS.alice.id,
      description: DESCRIPTION,
      target_date: "2026-09-30",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("milestones_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.description_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-DESC");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const goalId = await createGoal(alice, SEED_USERS.alice.id);
    const created = await alice
      .from("milestones")
      .insert(baseRow(goalId, SEED_USERS.alice.id))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("milestones_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.description_enc);

    const completedAt = "2026-10-01T00:00:00.000Z";
    const updated = await alice
      .from("milestones")
      .update({
        description: "Finished the 10km block (secret-marker-NEW)",
        completed_at: completedAt,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.description).toBe("Finished the 10km block (secret-marker-NEW)");
    expect(new Date(updated.data?.completed_at as string).toISOString()).toBe(completedAt);

    const after = await admin
      .from("milestones_data")
      .select("description_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.description_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const goalId = await createGoal(alice, SEED_USERS.alice.id);
    const created = await alice
      .from("milestones")
      .insert(baseRow(goalId, SEED_USERS.alice.id))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("milestones")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("milestones_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read, update, or delete another user's milestone", async () => {
    const goalId = await createGoal(alice, SEED_USERS.alice.id);
    const created = await alice
      .from("milestones")
      .insert(baseRow(goalId, SEED_USERS.alice.id))
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("milestones").select("id, description").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("milestones").update({ description: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("milestones").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("milestones")
      .select("description, goal_id")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
    expect(aliceRead.data?.goal_id).toBe(goalId);
  });
});

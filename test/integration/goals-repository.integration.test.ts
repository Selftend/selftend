import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllGoalsForUser, signInAs } from "./helpers";

// Tests the DB contract for goals + milestones (20260514_cbt_phase1.sql).
// goals: id, user_id, title, description, life_domain, goal_type, target_date, status
// milestones: id, goal_id (FK → goals.id ON DELETE CASCADE), user_id, description, target_date, completed_at

describe("goals + milestones (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteAllGoalsForUser(SEED_USERS.alice.id),
      deleteAllGoalsForUser(SEED_USERS.bob.id),
    ]);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("inserts a goal and reads it back", async () => {
    const insert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Run a 5K",
        description: "Train to complete a 5K race",
        life_domain: "health",
        goal_type: "performance",
        target_date: "2026-12-31",
        status: "active",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: "Run a 5K",
      life_domain: "health",
      goal_type: "performance",
      status: "active",
    });
    expect(insert.data?.id).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("inserts a milestone referencing the goal and reads it back", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Run a 5K",
        description: "",
        life_domain: "health",
        goal_type: "performance",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const milInsert = await alice
      .from("milestones")
      .insert({
        goal_id: goalId,
        user_id: SEED_USERS.alice.id,
        description: "Run 1 km without stopping",
        target_date: "2026-09-01",
      })
      .select("*")
      .single();

    expect(milInsert.error).toBeNull();
    expect(milInsert.data).toMatchObject({
      goal_id: goalId,
      user_id: SEED_USERS.alice.id,
      description: "Run 1 km without stopping",
      completed_at: null,
    });
  });

  it("lists milestones for a goal ordered by created_at asc", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Goal with steps",
        description: "",
        life_domain: "health",
        goal_type: "outcome",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const descriptions = ["First step", "Second step", "Third step"];
    for (const description of descriptions) {
      const r = await alice
        .from("milestones")
        .insert({ goal_id: goalId, user_id: SEED_USERS.alice.id, description })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("milestones")
      .select("description")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("goal_id", goalId)
      .order("created_at", { ascending: true });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.description)).toEqual(descriptions);
  });

  it("can mark a milestone as completed (completed_at set)", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Goal to complete",
        description: "",
        life_domain: "work",
        goal_type: "process",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const milInsert = await alice
      .from("milestones")
      .insert({
        goal_id: goalId,
        user_id: SEED_USERS.alice.id,
        description: "Complete milestone",
      })
      .select("id")
      .single();
    expect(milInsert.error).toBeNull();
    const milId = milInsert.data!.id as string;

    const now = new Date().toISOString();
    const update = await alice
      .from("milestones")
      .update({ completed_at: now })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", milId)
      .select("completed_at")
      .single();

    expect(update.error).toBeNull();
    expect(update.data?.completed_at).toEqual(expect.any(String));
  });

  it("rejects an invalid goal status via the check constraint", async () => {
    const insert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Bad status",
        description: "",
        life_domain: "health",
        goal_type: "outcome",
        status: "invalid_status",
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("RLS: bob cannot read alice's goals", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Alice private goal",
        description: "",
        life_domain: "health",
        goal_type: "outcome",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const bobRead = await bob.from("goals").select("id").eq("id", goalId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("RLS: bob cannot read alice's milestones", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Alice private goal",
        description: "",
        life_domain: "health",
        goal_type: "outcome",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const milInsert = await alice
      .from("milestones")
      .insert({
        goal_id: goalId,
        user_id: SEED_USERS.alice.id,
        description: "Private milestone",
      })
      .select("id")
      .single();
    expect(milInsert.error).toBeNull();
    const milId = milInsert.data!.id as string;

    const bobRead = await bob.from("milestones").select("id").eq("id", milId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("deleting a goal cascades to its milestones", async () => {
    const goalInsert = await alice
      .from("goals")
      .insert({
        user_id: SEED_USERS.alice.id,
        title: "Goal to delete",
        description: "",
        life_domain: "health",
        goal_type: "outcome",
      })
      .select("id")
      .single();
    expect(goalInsert.error).toBeNull();
    const goalId = goalInsert.data!.id as string;

    const milInsert = await alice
      .from("milestones")
      .insert({
        goal_id: goalId,
        user_id: SEED_USERS.alice.id,
        description: "Will be cascaded",
      })
      .select("id")
      .single();
    expect(milInsert.error).toBeNull();
    const milId = milInsert.data!.id as string;

    // Delete the goal via service client (bypasses RLS for the cascade check)
    const admin = createServiceClient();
    await admin.from("goals").delete().eq("id", goalId);

    // After cascade, the milestone should be gone (checked via service client since RLS blocks alice too)
    const milCheck = await admin.from("milestones").select("id").eq("id", milId);
    expect(milCheck.data).toEqual([]);
  });
});

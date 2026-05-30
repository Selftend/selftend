import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllProcrastinationTasksForUser,
  signInAs,
} from "./helpers";

// Tests the DB contract for procrastination_tasks + task_steps (20260516000000_cbt_phase4.sql).
// procrastination_tasks: id, user_id, task_description, avoidance_reason, fear_thought,
//   challenged_thought, deadline, reward, status (active/completed/abandoned)
// task_steps: id, task_id (FK → procrastination_tasks.id ON DELETE CASCADE), user_id,
//   description, estimated_minutes, completed_at

describe("procrastination_tasks + task_steps (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    await Promise.all([
      deleteAllProcrastinationTasksForUser(SEED_USERS.alice.id),
      deleteAllProcrastinationTasksForUser(SEED_USERS.bob.id),
    ]);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("inserts a procrastination task and reads it back", async () => {
    const insert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Write the report",
        avoidance_reason: "Feels overwhelming",
        fear_thought: "I might fail",
        challenged_thought: "I can do a little at a time",
        deadline: "2026-06-30",
        reward: "Ice cream",
        status: "active",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      task_description: "Write the report",
      status: "active",
    });
    expect(insert.data?.id).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("inserts a task step referencing the task and reads it back", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Write the report",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const stepInsert = await alice
      .from("task_steps")
      .insert({
        task_id: taskId,
        user_id: SEED_USERS.alice.id,
        description: "Outline the report",
        estimated_minutes: 30,
      })
      .select("*")
      .single();

    expect(stepInsert.error).toBeNull();
    expect(stepInsert.data).toMatchObject({
      task_id: taskId,
      user_id: SEED_USERS.alice.id,
      description: "Outline the report",
      estimated_minutes: 30,
      completed_at: null,
    });
  });

  it("lists steps for a task ordered by created_at asc", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Multi-step task",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const descriptions = ["Step A", "Step B", "Step C"];
    for (const description of descriptions) {
      const r = await alice
        .from("task_steps")
        .insert({ task_id: taskId, user_id: SEED_USERS.alice.id, description })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("task_steps")
      .select("description")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.description)).toEqual(descriptions);
  });

  it("can mark a step as completed (completed_at set)", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Task to complete",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const stepInsert = await alice
      .from("task_steps")
      .insert({ task_id: taskId, user_id: SEED_USERS.alice.id, description: "Do it" })
      .select("id")
      .single();
    expect(stepInsert.error).toBeNull();
    const stepId = stepInsert.data!.id as string;

    const now = new Date().toISOString();
    const update = await alice
      .from("task_steps")
      .update({ completed_at: now })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", stepId)
      .select("completed_at")
      .single();

    expect(update.error).toBeNull();
    expect(update.data?.completed_at).toEqual(expect.any(String));
  });

  it("rejects an invalid task status via the check constraint", async () => {
    const insert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Bad status task",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
        status: "invalid_status",
      })
      .select("id");

    expect(insert.error).not.toBeNull();
  });

  it("RLS: bob cannot read alice's procrastination tasks", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Alice private task",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const bobRead = await bob.from("procrastination_tasks").select("id").eq("id", taskId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("RLS: bob cannot read alice's task steps", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Alice task with steps",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const stepInsert = await alice
      .from("task_steps")
      .insert({ task_id: taskId, user_id: SEED_USERS.alice.id, description: "Secret step" })
      .select("id")
      .single();
    expect(stepInsert.error).toBeNull();
    const stepId = stepInsert.data!.id as string;

    const bobRead = await bob.from("task_steps").select("id").eq("id", stepId);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("deleting a task cascades to its steps", async () => {
    const taskInsert = await alice
      .from("procrastination_tasks")
      .insert({
        user_id: SEED_USERS.alice.id,
        task_description: "Task to cascade-delete",
        avoidance_reason: "",
        fear_thought: "",
        challenged_thought: "",
        reward: "",
      })
      .select("id")
      .single();
    expect(taskInsert.error).toBeNull();
    const taskId = taskInsert.data!.id as string;

    const stepInsert = await alice
      .from("task_steps")
      .insert({ task_id: taskId, user_id: SEED_USERS.alice.id, description: "Will cascade" })
      .select("id")
      .single();
    expect(stepInsert.error).toBeNull();
    const stepId = stepInsert.data!.id as string;

    const admin = createServiceClient();
    await admin.from("procrastination_tasks").delete().eq("id", taskId);

    const stepCheck = await admin.from("task_steps").select("id").eq("id", stepId);
    expect(stepCheck.data).toEqual([]);
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

describe("habits schema (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const habitName = "Integration two-minute reading";

  beforeAll(async () => {
    alice = await signInAs("alice");
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    const admin = createServiceClient();
    // habit_logs FK-cascades from habits, but delete explicitly for clarity
    await admin.from("habit_logs").delete().eq("user_id", SEED_USERS.alice.id);
    await admin.from("habits").delete().eq("user_id", SEED_USERS.alice.id);
    await admin
      .from("user_preferences")
      .update({ habits_onboarding_completed: false })
      .eq("user_id", SEED_USERS.alice.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
    await bob.auth.signOut();
  });

  it("stores the habits onboarding preference used by the app", async () => {
    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          habits_onboarding_completed: true,
        },
        { onConflict: "user_id" },
      )
      .select("habits_onboarding_completed")
      .single();

    expect(upsert.error).toBeNull();
    expect(upsert.data?.habits_onboarding_completed).toBe(true);
  });

  it("lets a user create a custom-cadence habit and tick it without exposing it to another user", async () => {
    const inserted = await alice
      .from("habits")
      .insert({
        user_id: SEED_USERS.alice.id,
        name: habitName,
        kind: "build",
        identity: "I am someone who reads a little.",
        cue_plan: "After dinner",
        stack_after: "Dinner",
        craving_pairing: "Tea",
        two_minute_version: "Read one page",
        reward_note: "Mark the day",
        cadence: "custom",
        custom_days: [1, 3, 5],
        color: "primary",
      })
      .select("*")
      .single();

    expect(inserted.error).toBeNull();
    expect(inserted.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      custom_days: [1, 3, 5],
    });

    const tick = await alice
      .from("habit_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        habit_id: inserted.data?.id,
        logged_on: "2026-05-17",
      })
      .select("habit_id, logged_on")
      .single();

    expect(tick.error).toBeNull();
    expect(tick.data).toMatchObject({
      habit_id: inserted.data?.id,
      logged_on: "2026-05-17",
    });

    const bobRead = await bob.from("habits").select("id").eq("id", inserted.data?.id);

    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("blocks bob from reading alice's habit_logs", async () => {
    const admin = createServiceClient();

    // Create a habit as alice via the service client (bypasses RLS for setup)
    const habit = await admin
      .from("habits")
      .insert({
        user_id: SEED_USERS.alice.id,
        name: habitName,
        kind: "build",
        identity: "I read daily.",
        cue_plan: "After breakfast",
        stack_after: "Breakfast",
        craving_pairing: "Coffee",
        two_minute_version: "Read one page",
        reward_note: "Check it off",
        cadence: "daily",
        color: "primary",
      })
      .select("id")
      .single();
    expect(habit.error).toBeNull();

    // Alice logs the habit
    const log = await alice
      .from("habit_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        habit_id: habit.data!.id,
        logged_on: "2026-05-30",
      })
      .select("id")
      .single();
    expect(log.error).toBeNull();

    // Bob cannot see alice's habit_logs
    const bobRead = await bob.from("habit_logs").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });
});

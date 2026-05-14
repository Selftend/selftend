import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  LOCAL_ANON_KEY,
  LOCAL_SUPABASE_URL,
  SEED_USERS,
  createServiceClient,
  signInAs,
} from "./helpers";

// Verifies the security-definer functions defined in supabase/migrations.
// export_user_data() returns the caller's data scoped by auth.uid().
// delete_user_account() destroys everything for the caller and is tested with
// a throwaway user so the seeded users stay intact for the rest of the suite.

describe("export_user_data() (integration)", () => {
  let bob: SupabaseClient;

  beforeAll(async () => {
    bob = await signInAs("bob");
  });

  afterAll(async () => {
    await bob.auth.signOut();
  });

  it("returns the caller's profile, preferences, and private CBT records", async () => {
    const { data, error } = await bob.rpc("export_user_data");

    expect(error).toBeNull();
    expect(data).toMatchObject({
      profile: { email: SEED_USERS.bob.email },
      preferences: {
        cbt_reminders_enabled: true,
        app_onboarding_completed: true,
        cbt_onboarding_completed: true,
        language: "en",
        selected_concerns: expect.any(Array),
        active_strategies: expect.any(Array),
      },
    });
    expect(Array.isArray(data.thoughtRecords)).toBe(true);
    expect(data.thoughtRecords.length).toBeGreaterThanOrEqual(5);
    expect(data.thoughtRecords[0]).toHaveProperty("situation");
    expect(data.thoughtRecords[0]).toHaveProperty("automatic_thought");
    expect(Array.isArray(data.webPushSubscriptions)).toBe(true);
    expect(Array.isArray(data.goals)).toBe(true);
    expect(Array.isArray(data.milestones)).toBe(true);
    expect(Array.isArray(data.valuesProfiles)).toBe(true);
    expect(Array.isArray(data.activityLogs)).toBe(true);
    expect(Array.isArray(data.moodLogs)).toBe(true);
    expect(Array.isArray(data.coreBeliefs)).toBe(true);
    expect(Array.isArray(data.exposureHierarchies)).toBe(true);
    expect(Array.isArray(data.exposureItems)).toBe(true);
    expect(Array.isArray(data.exposureSessions)).toBe(true);
    expect(Array.isArray(data.worryEntries)).toBe(true);
    expect(Array.isArray(data.mindfulnessSessions)).toBe(true);
    expect(Array.isArray(data.procrastinationTasks)).toBe(true);
    expect(Array.isArray(data.taskSteps)).toBe(true);
    expect(Array.isArray(data.angerLogs)).toBe(true);
    expect(Array.isArray(data.selfCareLogs)).toBe(true);
    expect(Array.isArray(data.recoveryPlans)).toBe(true);
    expect(Array.isArray(data.challengePlans)).toBe(true);
    expect(typeof data.exportDate).toBe("string");
  });

  it("never leaks another user's data", async () => {
    const { data, error } = await bob.rpc("export_user_data");
    expect(error).toBeNull();
    const records = data.thoughtRecords as { situation: string }[];
    // demo's seed records mention "presentation" and "rest day"; bob's don't.
    const matchesDemo = records.some(
      (r) => r.situation.includes("presentation") || r.situation.includes("rest day"),
    );
    expect(matchesDemo).toBe(false);
  });

  it("rejects unauthenticated callers", async () => {
    const anon = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await anon.rpc("export_user_data");
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/Not authenticated|permission|denied/i);
  });
});

describe("delete_user_account() (integration)", () => {
  const testUserId = "00000000-0000-0000-0000-0000000000aa";
  const testEmail = "delete-flow@test.local";
  const testPassword = "password123";

  beforeEach(async () => {
    const admin = createServiceClient();
    // Clean slate: drop any leftover from a previous failed run, then create fresh.
    await admin.auth.admin.deleteUser(testUserId).catch(() => undefined);
    const { error } = await admin.auth.admin.createUser({
      user_id: testUserId,
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    } as Parameters<typeof admin.auth.admin.createUser>[0]);
    if (error) throw error;

    await admin
      .from("profiles")
      .upsert({ user_id: testUserId, email: testEmail }, { onConflict: "user_id" });
    await admin.from("user_preferences").upsert({ user_id: testUserId }, { onConflict: "user_id" });
    await admin.from("thought_records").insert({
      user_id: testUserId,
      situation: "About to be deleted",
      automatic_thought: "doomed",
      emotions: ["Anxious"],
      distortions: ["catastrophizing"],
      balanced_thought: "balanced",
    });
    await admin.from("recovery_plans").insert({
      id: "00000000-0000-0000-0000-00000000aa01",
      user_id: testUserId,
      recovery_keys: ["Walk first"],
      personal_slogan: "Keep practicing",
      strategy_integration_notes: { thoughts: "Use the record" },
      maintenance_commitments: ["Weekly review"],
    });
    await admin.from("challenge_plans").insert({
      id: "00000000-0000-0000-0000-00000000aa02",
      recovery_plan_id: "00000000-0000-0000-0000-00000000aa01",
      user_id: testUserId,
      challenge_description: "Hard week",
      coping_steps: ["Text a trusted person"],
    });
  });

  afterEach(async () => {
    const admin = createServiceClient();
    // Belt and braces — if the test failed before delete_user_account, clean up.
    await admin.auth.admin.deleteUser(testUserId).catch(() => undefined);
  });

  it("removes the auth user and all owned rows in one call", async () => {
    const client = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const signIn = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    expect(signIn.error).toBeNull();

    const { error } = await client.rpc("delete_user_account");
    expect(error).toBeNull();

    const admin = createServiceClient();
    const [auth, profile, prefs, records, recoveryPlans, challengePlans] = await Promise.all([
      admin.auth.admin.getUserById(testUserId),
      admin.from("profiles").select("user_id").eq("user_id", testUserId),
      admin.from("user_preferences").select("user_id").eq("user_id", testUserId),
      admin.from("thought_records").select("id").eq("user_id", testUserId),
      admin.from("recovery_plans").select("id").eq("user_id", testUserId),
      admin.from("challenge_plans").select("id").eq("user_id", testUserId),
    ]);

    expect(auth.data?.user).toBeNull();
    expect(profile.data).toEqual([]);
    expect(prefs.data).toEqual([]);
    expect(records.data).toEqual([]);
    expect(recoveryPlans.data).toEqual([]);
    expect(challengePlans.data).toEqual([]);
  });
});

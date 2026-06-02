import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  LOCAL_ANON_KEY,
  LOCAL_SUPABASE_URL,
  SEED_USERS,
  createAnonClient,
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
    expect(data.thoughtRecords[0]).toHaveProperty("nats");
    expect(data.thoughtRecords[0]).toHaveProperty("emotion_intensity_before");
    expect(data.thoughtRecords[0]).toHaveProperty("evidence_for");
    expect(data.thoughtRecords[0]).toHaveProperty("evidence_against");
    expect(data.thoughtRecords[0]).toHaveProperty("emotion_intensity_after");
    expect(data.thoughtRecords[0]).toHaveProperty("outcome_notes");
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
    expect(Array.isArray(data.journalEntries)).toBe(true);
    // ACT module + plan + widget layout (added 20260568 - GDPR export completeness).
    expect("actProgramState" in data).toBe(true);
    expect(Array.isArray(data.actDefusionLogs)).toBe(true);
    expect(Array.isArray(data.actExpansionLogs)).toBe(true);
    expect(Array.isArray(data.actUrgeSurfLogs)).toBe(true);
    expect(Array.isArray(data.actConnectionLogs)).toBe(true);
    expect(Array.isArray(data.actObservingSelfSessions)).toBe(true);
    expect(Array.isArray(data.actValueEntries)).toBe(true);
    expect(Array.isArray(data.actBullsEyeSnapshots)).toBe(true);
    expect(Array.isArray(data.actCommittedActions)).toBe(true);
    expect(Array.isArray(data.actActionSteps)).toBe(true);
    expect(Array.isArray(data.actChoicePoints)).toBe(true);
    expect(Array.isArray(data.planItems)).toBe(true);
    expect(Array.isArray(data.widgetPreferences)).toBe(true);
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
      nats: [{ text: "doomed", beliefRating: null, isHotThought: true }],
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
    // Belt and braces - if the test failed before delete_user_account, clean up.
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

// ---------------------------------------------------------------------------
// invoke_send_web_reminders() + schedule_send_web_reminders_cron() (integration)
//
// Migration: supabase/migrations/20260508000000_web_push_notifications.sql
//
// Security model from that migration:
//   revoke all on function public.invoke_send_web_reminders() from public, anon, authenticated;
//   revoke all on function public.schedule_send_web_reminders_cron() from public, anon, authenticated;
//
// Meaning:
//   - anon role  → 42501 permission denied
//   - authenticated role → 42501 permission denied
//   - service_role bypasses REVOKE (Postgres superuser-equivalent), so PostgREST
//     exposes both functions when called with the service-role JWT.
//
// NOT assertable via supabase-js / PostgREST:
//   - cron.job row contents (jobname, schedule): `cron` schema is not exposed via PostgREST.
//   - vault.decrypted_secrets: `vault` schema is not exposed via PostgREST.
//   - net.http_post side-effect: triggers an outbound HTTP call; no observable return via client.
//
// Cleanup note: calling schedule_send_web_reminders_cron() as service_role does register
// (or re-register) a pg_cron job named 'selftend-send-web-reminders'. The function is
// idempotent (it unschedules first, then reschedules), so calling it twice is safe. The cron
// job is NOT removed here because we cannot reach cron.unschedule() via PostgREST. A full
// `supabase db reset` clears the cron.job table. We accept this known-leftover because
// (a) the job is idempotent, (b) it fires every 5 min calling invoke_send_web_reminders()
// which will fail fast ("Missing Vault secrets") - no lasting damage to the local stack.
// ---------------------------------------------------------------------------

describe("invoke_send_web_reminders() - access control (integration)", () => {
  it("is denied for anon callers (42501 permission denied)", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("invoke_send_web_reminders");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("is denied for authenticated callers (42501 permission denied)", async () => {
    const alice = await signInAs("alice");
    try {
      const { error } = await alice.rpc("invoke_send_web_reminders");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/permission denied/i);
    } finally {
      await alice.auth.signOut();
    }
  });

  it("service_role can call it via PostgREST rpc; raises 'Missing Vault secrets' when secrets absent", async () => {
    // service_role bypasses the REVOKE. Vault secrets are NOT seeded in the local
    // test stack, so the function raises its guard exception rather than calling net.http_post.
    // This proves the function body executes and its vault-check branch is reachable.
    //
    // NOT assertable: the actual net.http_post() call, because Vault secrets are not seeded
    // and PostgREST cannot reach vault.secrets to insert them.
    const service = createServiceClient();
    const { error } = await service.rpc("invoke_send_web_reminders");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("P0001");
    expect(error?.message).toBe("Missing Vault secrets for web push cron.");
  });
});

describe("schedule_send_web_reminders_cron() - access control + idempotency (integration)", () => {
  it("is denied for anon callers (42501 permission denied)", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("schedule_send_web_reminders_cron");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("is denied for authenticated callers (42501 permission denied)", async () => {
    const alice = await signInAs("alice");
    try {
      const { error } = await alice.rpc("schedule_send_web_reminders_cron");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/permission denied/i);
    } finally {
      await alice.auth.signOut();
    }
  });

  it("service_role can call it and it is idempotent (no error on repeated calls)", async () => {
    // service_role bypasses the REVOKE. The function calls cron.unschedule() then
    // cron.schedule() - the exception handler in the function swallows "job not found"
    // on the first unschedule, making the whole function idempotent.
    //
    // NOT assertable: cron.job row contents (jobname 'selftend-send-web-reminders',
    // schedule '*/5 * * * *') - the `cron` schema is not exposed via PostgREST.
    //
    // CLEANUP NOTE: this leaves a cron job registered in the local pg_cron table.
    // The job is idempotent and fails fast (invoke_send_web_reminders raises
    // "Missing Vault secrets for web push cron."). `supabase db reset` clears it.
    const service = createServiceClient();

    const first = await service.rpc("schedule_send_web_reminders_cron");
    expect(first.error).toBeNull();

    const second = await service.rpc("schedule_send_web_reminders_cron");
    expect(second.error).toBeNull();
  });
});

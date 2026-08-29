import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, createServiceClient, signInAs } from "./helpers";

// Verifies the security-definer functions defined in supabase/migrations.
// export_user_data() returns the caller's data scoped by auth.uid().
// delete_user_account() destroys everything for the caller and is tested with
// a throwaway user so the seeded users stay intact for the rest of the suite.

// Mirrors supabase/seed.sql's bob thought_records (situations chosen so they
// never collide with demo's "presentation"/"rest day" - see the leak test).
const BOB_SEED_THOUGHT_RECORDS = [
  "My manager scheduled a 1:1 without an agenda.",
  "A friend did not reply to my message for two days.",
  "I missed a small detail in a code review.",
  "I felt anxious before a casual social event.",
  "I skipped one workout this week.",
].map((situation) => ({
  user_id: SEED_USERS.bob.id,
  situation,
  nats: [{ text: "Worst-case prediction.", beliefRating: null, isHotThought: true }],
  emotions: ["Anxious"],
  distortions: ["fortune-telling"],
  balanced_thought: "A more balanced read of the situation.",
}));

// The seeded bob thought_records are shared, non-reset fixture data that other
// suites delete in their cleanup (e.g. thought-records-encryption's afterEach).
// export_user_data asserts bob has >=5, so re-seed defensively here to keep this
// suite independent of run order rather than relying on seed.sql still being intact.
async function ensureBobHasSeedThoughtRecords() {
  const admin = createServiceClient();
  const { count, error: countError } = await admin
    .from("thought_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", SEED_USERS.bob.id);
  if (countError) throw countError;
  if ((count ?? 0) >= BOB_SEED_THOUGHT_RECORDS.length) return;
  const { error } = await admin.from("thought_records").insert(BOB_SEED_THOUGHT_RECORDS);
  if (error) throw error;
}

/** A fixed instant for export probes, with a real (non-UTC) captured offset. */
const OCCURRED = "2026-05-15T19:00:00.000Z";

// Phrases that appear in demo's seeded thought records and in nobody else's.
// The leak test reads them from both ends - present on demo, absent from bob -
// so they are a sentinel that cannot rot unnoticed. Carried verbatim from the
// rows that used to live in supabase/seed.sql (#1281); if a seeded situation is
// reworded, change it here in the same commit.
const DEMO_SENTINEL_PHRASES = ["presentation", "rest day"];

describe("export_user_data() (integration)", () => {
  let bob: SupabaseClient;

  beforeAll(async () => {
    await ensureBobHasSeedThoughtRecords();
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
    // ACT module + routines + widget layout (GDPR export completeness).
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
    expect(Array.isArray(data.routines)).toBe(true);
    expect(Array.isArray(data.routineSteps)).toBe(true);
    // plan_items was retired in 20260715_routines; the export must not carry it.
    expect("planItems" in data).toBe(false);
    expect(Array.isArray(data.widgetPreferences)).toBe(true);
    expect(Array.isArray(data.devicePushTokens)).toBe(true);
    // Reminder preferences for every notification target (20260582 - GDPR completeness:
    // the base 'preferences' block only carried CBT reminders before this).
    for (const target of [
      "cbt",
      "meditation",
      "act",
      "mood",
      "journal",
      "gratitude",
      "grounding",
      "breathing",
      "sleep",
      "habits",
    ]) {
      expect(data.preferences).toHaveProperty(`${target}_reminders_enabled`);
      expect(data.preferences).toHaveProperty(`${target}_reminder_hour`);
      expect(data.preferences).toHaveProperty(`${target}_reminder_minute`);
      expect(data.preferences).toHaveProperty(`${target}_reminder_timezone`);
    }
    expect(typeof data.exportDate).toBe("string");
  });

  // Every migration that adds an exportable column redeclares this whole
  // function, and the last one to apply wins outright - so a declaration copied
  // from a stale parent drops another module's columns back out of the export
  // with no conflict, no error and no failing test. It happened: #423 and #424
  // each carried their own offsets and neither carried the other's, and because
  // the only assertion on activityLogs above is `Array.isArray`, dev shipped an
  // export with both activity offsets missing.
  //
  // So assert the columns, not the shape. This is the narrow guard for the
  // occurrence offsets specifically; #429 tracks the general one that derives
  // the expected column set from the live schema instead of listing it here.
  it("carries every captured occurrence offset, not just the rows", async () => {
    const admin = createServiceClient();
    const { data: activity, error: insertError } = await admin
      .from("activity_logs")
      .insert({
        user_id: SEED_USERS.bob.id,
        activity_name: "Export offset probe",
        category: "pleasure",
        scheduled_at: "2026-05-15T19:00:00.000Z",
        scheduled_offset_minutes: -420,
        completed_at: "2026-05-15T21:00:00.000Z",
        completed_offset_minutes: -420,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      const { data, error } = await bob.rpc("export_user_data");
      expect(error).toBeNull();

      const exported = (data.activityLogs as { id: string }[]).find((a) => a.id === activity!.id);
      expect(exported).toBeDefined();
      // Without these the export hands back the instants with no way to
      // reconstruct which civil day either the completion or the plan belonged
      // to - the one fact #330 exists to record.
      expect(exported).toHaveProperty("completed_offset_minutes", -420);
      expect(exported).toHaveProperty("scheduled_offset_minutes", -420);

      // The other half of the same pair, so a future redeclaration copied from
      // an activities-only parent fails here too rather than silently.
      const records = data.thoughtRecords as Record<string, unknown>[];
      expect(records.length).toBeGreaterThan(0);
      expect(records[0]).toHaveProperty("created_offset_minutes");
    } finally {
      await admin.from("activity_logs").delete().eq("id", activity!.id);
    }
  });

  // The columns #429's audit found had NEVER been exported by any declaration -
  // so unlike the offsets above, no gate could have caught them by comparing one
  // declaration against another. Each row here is a column of the user's own
  // data that the export silently omitted.
  //
  // `occurred_at` is the one that matters most: it is the date the user CHOSE
  // when back-dating a journal entry, which is the whole reason journal has an
  // occurrence concept separate from every other tool.
  it.each([
    [
      "journalEntries",
      "journal_entries",
      { title: "Export probe", body: "b", occurred_at: OCCURRED, occurred_offset_minutes: -420 },
      ["occurred_at", "occurred_offset_minutes"],
    ],
    [
      "moodLogs",
      "mood_logs",
      { mood_score: 3, logged_at: OCCURRED, logged_offset_minutes: -420 },
      ["logged_offset_minutes"],
    ],
    [
      "sleepLogs",
      "sleep_logs",
      { duration_minutes: 420, quality: 3, logged_at: OCCURRED, logged_offset_minutes: -420 },
      ["logged_offset_minutes"],
    ],
    [
      "gratitudeEntries",
      "gratitude_entries",
      { item_1: "probe", logged_at: OCCURRED, logged_offset_minutes: -420 },
      ["logged_offset_minutes"],
    ],
    [
      "mindfulnessSessions",
      "mindfulness_sessions",
      {
        exercise_name: "box-breathing",
        duration_minutes: 5,
        completed_at: OCCURRED,
        feeling_after: "calmer",
        cycles: 6,
        duration_seconds: 300,
      },
      ["feeling_after", "cycles", "duration_seconds"],
    ],
  ])("exports %s' own columns, not a subset of them", async (key, table, row, columns) => {
    const admin = createServiceClient();
    const { data: inserted, error: insertError } = await admin
      .from(table)
      .insert({ user_id: SEED_USERS.bob.id, ...row })
      .select("id")
      .single();
    if (insertError) throw insertError;

    try {
      const { data, error } = await bob.rpc("export_user_data");
      expect(error).toBeNull();

      const exported = (data[key] as { id: string }[]).find((r) => r.id === inserted!.id);
      expect(exported).toBeDefined();
      for (const column of columns) {
        expect(exported).toHaveProperty(column);
      }
    } finally {
      await admin.from(table).delete().eq("id", inserted!.id);
    }
  });

  it("exports the profile the user set, not just the address they signed up with", async () => {
    const { data, error } = await bob.rpc("export_user_data");
    expect(error).toBeNull();

    // `avatar_storage_path` stays out on purpose - internal storage plumbing,
    // where `avatar_url` is the usable form. Everything else here is a value the
    // user chose and the export used to drop.
    for (const column of ["display_name", "avatar_url", "avatar_source", "avatar_updated_at"]) {
      expect(data.profile).toHaveProperty(column);
    }
  });

  it("keeps demo's records on demo and out of bob's export", async () => {
    // Both halves belong in one test. "bob's export mentions neither phrase" is
    // a NEGATIVE assertion about bob, so on its own it stays green when demo's
    // rows are deleted or reworded - the sentinel evaporates and the check keeps
    // passing while protecting nothing. Pinning the phrases to demo first makes
    // that failure loud (#1281).
    const demo = await signInAs("demo");
    try {
      const { data, error } = await demo.rpc("export_user_data");
      expect(error).toBeNull();
      const situations = (data.thoughtRecords as { situation: string }[]).map((r) => r.situation);
      const missing = DEMO_SENTINEL_PHRASES.filter(
        (phrase) => !situations.some((situation) => situation.includes(phrase)),
      );
      // Both missing usually means the seed script never ran: demo's records
      // come from scripts/seed-demo-data.mjs, not seed.sql, so a bare
      // `supabase db reset` leaves the account empty. One missing means a
      // seeded situation was reworded and this sentinel needs re-pointing.
      expect(missing).toEqual([]);
    } finally {
      await demo.auth.signOut();
    }

    const { data, error } = await bob.rpc("export_user_data");
    expect(error).toBeNull();
    const records = data.thoughtRecords as { situation: string }[];
    const matchesDemo = records.some((r) =>
      DEMO_SENTINEL_PHRASES.some((phrase) => r.situation.includes(phrase)),
    );
    expect(matchesDemo).toBe(false);
  });

  it("rejects unauthenticated callers", async () => {
    const anon = createAnonClient();
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

    // `profiles` is now a decrypting view; the per-user merge lives in its INSTEAD OF INSERT
    // trigger (PostgREST upsert's ON CONFLICT can't target a view), so insert rather than upsert.
    // Best-effort: the local GoTrue ignores the requested user_id, so this fixed-id insert may hit
    // the auth.users FK; the delete assertion below still holds (no profile row to delete). The
    // genuine delete-through-view path is covered in profiles-encryption.integration.test.ts.
    await admin.from("profiles").insert({ user_id: testUserId, email: testEmail });
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
    await admin.from("device_push_tokens").insert({
      user_id: testUserId,
      expo_push_token: "ExponentPushToken[delete-flow]",
      platform: "android",
    });
  });

  afterEach(async () => {
    const admin = createServiceClient();
    // Belt and braces - if the test failed before delete_user_account, clean up.
    await admin.auth.admin.deleteUser(testUserId).catch(() => undefined);
  });

  it("removes the auth user and all owned rows in one call", async () => {
    const client = createAnonClient();
    const signIn = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    expect(signIn.error).toBeNull();

    const { error } = await client.rpc("delete_user_account");
    expect(error).toBeNull();

    const admin = createServiceClient();
    const [auth, profile, prefs, records, recoveryPlans, challengePlans, pushTokens] =
      await Promise.all([
        admin.auth.admin.getUserById(testUserId),
        admin.from("profiles").select("user_id").eq("user_id", testUserId),
        admin.from("user_preferences").select("user_id").eq("user_id", testUserId),
        admin.from("thought_records").select("id").eq("user_id", testUserId),
        admin.from("recovery_plans").select("id").eq("user_id", testUserId),
        admin.from("challenge_plans").select("id").eq("user_id", testUserId),
        admin.from("device_push_tokens").select("id").eq("user_id", testUserId),
      ]);

    expect(auth.data?.user).toBeNull();
    expect(profile.data).toEqual([]);
    expect(prefs.data).toEqual([]);
    expect(records.data).toEqual([]);
    expect(recoveryPlans.data).toEqual([]);
    expect(challengePlans.data).toEqual([]);
    expect(pushTokens.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// purge_user_account(uuid) (integration)
//
// Migration: supabase/migrations/20260826000000_account_purge_helper.sql
//
// The shared purge body behind delete_user_account() and the guest dormancy
// cleanup job (#1449). Security model mirrors the send-web-reminders cron RPCs
// below: execute revoked from public/anon/authenticated (42501 for client
// roles); service_role bypasses the REVOKE, which is how the purge itself is
// exercised here.
// ---------------------------------------------------------------------------

describe("purge_user_account() (integration)", () => {
  const testEmail = "purge-helper@test.local";
  const testPassword = "password123";

  // 1x1 transparent PNG (same fixture as profile-repository.integration.test.ts).
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );

  // The local GoTrue assigns its own user ids (see the delete_user_account
  // fixture note above), so leftovers from a crashed run are found by email.
  async function deleteTestUserIfPresent() {
    const admin = createServiceClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const leftover = data?.users?.find((candidate) => candidate.email === testEmail);
    if (leftover) {
      await admin.auth.admin.deleteUser(leftover.id).catch(() => undefined);
    }
  }

  beforeEach(deleteTestUserIfPresent);
  afterEach(deleteTestUserIfPresent);

  it("is denied for anon callers (42501 permission denied)", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("purge_user_account", {
      target_user: SEED_USERS.alice.id,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("is denied for authenticated callers, even against their own account (42501)", async () => {
    const alice = await signInAs("alice");
    try {
      const { error } = await alice.rpc("purge_user_account", {
        target_user: SEED_USERS.alice.id,
      });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/permission denied/i);
    } finally {
      await alice.auth.signOut();
    }
  });

  it("refuses a null target instead of purging nothing silently", async () => {
    const service = createServiceClient();
    const { error } = await service.rpc("purge_user_account", { target_user: null });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/target_user is null/);
  });

  it("purges the target's auth row, owned rows, and storage objects in one call", async () => {
    const admin = createServiceClient();
    const created = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const uid = created.data.user!.id;

    // Owned rows across the purge set: the explicit-delete tables (profiles,
    // user_preferences, thought_records) and a cascade-only table
    // (device_push_tokens). Inserts are asserted so a failed fixture cannot
    // turn the deletion assertions below vacuous.
    for (const insert of [
      admin.from("profiles").insert({ user_id: uid, email: testEmail }),
      admin.from("user_preferences").insert({ user_id: uid }),
      admin.from("thought_records").insert({
        user_id: uid,
        situation: "About to be purged",
        nats: [{ text: "doomed", beliefRating: null, isHotThought: true }],
        emotions: ["Anxious"],
        distortions: ["catastrophizing"],
        balanced_thought: "balanced",
      }),
      admin.from("device_push_tokens").insert({
        user_id: uid,
        expo_push_token: "ExponentPushToken[purge-helper]",
        platform: "android",
      }),
    ]) {
      const { error } = await insert;
      expect(error).toBeNull();
    }

    // A storage object in the user's own profile-pics folder - the half a raw
    // `delete from auth.users` would strand. Pin its presence before purging so
    // the empty-folder assertion afterwards proves a deletion happened.
    const objectPath = `${uid}/avatar.png`;
    const upload = await admin.storage.from("profile-pics").upload(objectPath, pngBytes, {
      contentType: "image/png",
    });
    expect(upload.error).toBeNull();
    const before = await admin.storage.from("profile-pics").list(uid);
    expect(before.error).toBeNull();
    expect(before.data?.map((object) => object.name)).toEqual(["avatar.png"]);

    const { error } = await admin.rpc("purge_user_account", { target_user: uid });
    expect(error).toBeNull();

    const [auth, profile, prefs, records, pushTokens, objects] = await Promise.all([
      admin.auth.admin.getUserById(uid),
      admin.from("profiles").select("user_id").eq("user_id", uid),
      admin.from("user_preferences").select("user_id").eq("user_id", uid),
      admin.from("thought_records").select("id").eq("user_id", uid),
      admin.from("device_push_tokens").select("id").eq("user_id", uid),
      admin.storage.from("profile-pics").list(uid),
    ]);

    expect(auth.data?.user).toBeNull();
    expect(profile.data).toEqual([]);
    expect(prefs.data).toEqual([]);
    expect(records.data).toEqual([]);
    expect(pushTokens.data).toEqual([]);
    expect(objects.error).toBeNull();
    expect(objects.data).toEqual([]);
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

// Every table the demo seed's teardown covers, by its logical (view) name. The
// encrypted ones store their rows in a same-named `_data` base table, which is
// where the foreign keys actually live; `act_bulls_eye_snapshots` is unencrypted
// and is its own base table. Kept as logical names so this list reads like the
// module inventory rather than like the storage layer.
//
// `routines` and `routine_steps` are here because the seed's four routines are
// composed of CBT, ACT and shared-tool practices and are wiped by the same
// parents-only contract (#1290/#1271) - the sixth chain, and the last one to join
// this guard.
const DEMO_SEED_TABLES = [
  // ACT
  "act_action_steps",
  "act_bulls_eye_snapshots",
  "act_choice_points",
  "act_committed_actions",
  "act_connection_logs",
  "act_defusion_logs",
  "act_expansion_logs",
  "act_observing_self_sessions",
  "act_program_state",
  "act_urge_surf_logs",
  "act_value_entries",
  // CBT
  "activity_logs",
  "anger_logs",
  "challenge_plans",
  "core_beliefs",
  "exposure_hierarchies",
  "exposure_items",
  "exposure_sessions",
  "goals",
  "milestones",
  "procrastination_tasks",
  "recovery_plans",
  "self_care_logs",
  "task_steps",
  "thought_records",
  "values_profile",
  "worry_entries",
  // Routines
  "routine_steps",
  "routines",
];

interface ForeignKeyDeleteRule {
  child_table: string;
  constraint_name: string;
  parent_table: string;
  delete_rule: string;
}

/** `thought_records_data` -> `thought_records`; unencrypted tables pass through. */
function logicalTableName(storageTable: string): string {
  return storageTable.replace(/_data$/, "");
}

describe("demo seed delete cascades (integration)", () => {
  // The demo seed's teardown wipes PARENTS and standalone tables only, and lets
  // the cascades reclaim the chain children (#1280). That is only safe while
  // every key among these tables actually cascades. A migration that adds a
  // child with a non-cascading delete rule, or re-creates a key without one,
  // would orphan demo rows silently and forever - and no other test would
  // notice, because the orphans are invisible until someone looks at the
  // account.
  //
  // A single catalogue query, deliberately: no fixtures and no seeded rows, so
  // this cannot be defeated by run order or by another suite's cleanup.
  let rules: ForeignKeyDeleteRule[];

  beforeAll(async () => {
    const service = createServiceClient();
    const { data, error } = await service.rpc("app_foreign_key_delete_rules");
    expect(error).toBeNull();
    rules = (data ?? []) as ForeignKeyDeleteRule[];
  });

  it("finds foreign keys on every table the demo seed wipes", () => {
    // Guards the assertion below against passing vacuously: if a table were
    // renamed, or the storage-name mapping drifted, the cascade check would
    // filter down to nothing and stay green while proving nothing. Every one of
    // these tables carries at least a `user_id` key, so every one must appear.
    const covered = new Set(rules.map((rule) => logicalTableName(rule.child_table)));
    const missing = DEMO_SEED_TABLES.filter((table) => !covered.has(table));

    expect(missing).toEqual([]);
  });

  it("every foreign key among the demo seed's tables deletes on cascade", () => {
    const offenders = rules
      .filter((rule) => DEMO_SEED_TABLES.includes(logicalTableName(rule.child_table)))
      .filter((rule) => rule.delete_rule !== "CASCADE")
      .map(
        (rule) =>
          `${rule.child_table}.${rule.constraint_name} -> ${rule.parent_table} ` +
          `is ${rule.delete_rule}, not CASCADE`,
      );

    expect(offenders).toEqual([]);
  });
});

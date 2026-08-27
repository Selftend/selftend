import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Mirrors the queries in src/features/settings/repository.ts. Captures alice's
// seeded preferences row in beforeAll and restores it after each test so the
// suite stays deterministic.

describe("user_preferences (integration)", () => {
  let alice: SupabaseClient;
  let originalPreferences: Record<string, unknown>;

  beforeAll(async () => {
    alice = await signInAs("alice");
    const { data, error } = await alice
      .from("user_preferences")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    if (error) throw error;
    originalPreferences = data as Record<string, unknown>;
  });

  afterEach(async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from("user_preferences")
      .upsert(originalPreferences, { onConflict: "user_id" });
    if (error) throw error;
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("reads the seeded preferences row", async () => {
    const { data, error } = await alice
      .from("user_preferences")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      enabled_modules: ["cbt"],
      app_onboarding_completed: true,
      language: "en",
    });
  });

  it("upserts reminder settings", async () => {
    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          reminder_consent: true,
          reminder_consent_updated_at: new Date().toISOString(),
          cbt_reminders_enabled: true,
          cbt_reminder_hour: 8,
          cbt_reminder_minute: 15,
          cbt_reminder_timezone: "Europe/Sofia",
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    expect(upsert.error).toBeNull();
    expect(upsert.data).toMatchObject({
      reminder_consent: true,
      cbt_reminders_enabled: true,
      cbt_reminder_hour: 8,
      cbt_reminder_minute: 15,
      cbt_reminder_timezone: "Europe/Sofia",
    });
  });

  it("rejects an invalid reminder hour", async () => {
    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          cbt_reminder_hour: 25,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    expect(upsert.error).not.toBeNull();
    expect(upsert.error?.message).toMatch(/cbt_reminder_hour/);
  });

  it("rejects an unsupported language", async () => {
    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          language: "fr",
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    expect(upsert.error).not.toBeNull();
    expect(upsert.error?.message).toMatch(/user_preferences_language_check/);
  });

  it("round-trips the onboarding funnel columns", async () => {
    const completedAt = "2026-07-03T10:00:00.000Z";

    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          app_onboarding_completed_via: "finish",
          app_onboarding_completed_at: completedAt,
        },
        { onConflict: "user_id" },
      )
      .select("app_onboarding_completed_via, app_onboarding_completed_at")
      .single();

    expect(upsert.error).toBeNull();
    expect(upsert.data?.app_onboarding_completed_via).toBe("finish");
    expect(new Date(upsert.data?.app_onboarding_completed_at as string).getTime()).toBe(
      new Date(completedAt).getTime(),
    );

    // Read back to confirm persistence
    const read = await alice
      .from("user_preferences")
      .select("app_onboarding_completed_via, app_onboarding_completed_at")
      .eq("user_id", SEED_USERS.alice.id)
      .single();

    expect(read.error).toBeNull();
    expect(read.data?.app_onboarding_completed_via).toBe("finish");
    expect(new Date(read.data?.app_onboarding_completed_at as string).getTime()).toBe(
      new Date(completedAt).getTime(),
    );

    // Reset the two columns to null so seeded state stays pristine
    const admin = createServiceClient();
    const reset = await admin
      .from("user_preferences")
      .update({
        app_onboarding_completed_via: null,
        app_onboarding_completed_at: null,
      })
      .eq("user_id", SEED_USERS.alice.id);

    expect(reset.error).toBeNull();
  });

  it("records policy consent timestamps", async () => {
    const now = new Date();
    const upsert = await alice
      .from("user_preferences")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          privacy_policy_accepted_at: now.toISOString(),
          terms_accepted_at: now.toISOString(),
          policy_version_accepted: "2.0.0",
        },
        { onConflict: "user_id" },
      )
      .select("policy_version_accepted, privacy_policy_accepted_at, terms_accepted_at")
      .single();

    expect(upsert.error).toBeNull();
    expect(upsert.data?.policy_version_accepted).toBe("2.0.0");
    expect(new Date(upsert.data?.privacy_policy_accepted_at as string).getTime()).toBe(
      now.getTime(),
    );
    expect(new Date(upsert.data?.terms_accepted_at as string).getTime()).toBe(now.getTime());
  });
});

describe("web_push_subscriptions (integration)", () => {
  let bob: SupabaseClient;
  const endpoint = "https://fcm.googleapis.com/fcm/send/integration-test";

  beforeAll(async () => {
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    const admin = createServiceClient();
    // Clean every row for this endpoint (across users) so the cross-user test below
    // doesn't leak rows between runs.
    await admin.from("web_push_subscriptions").delete().eq("endpoint", endpoint);
  });

  afterAll(async () => {
    await bob.auth.signOut();
  });

  it("upserts a subscription on conflict by (user_id, endpoint)", async () => {
    const first = await bob.from("web_push_subscriptions").upsert(
      {
        user_id: SEED_USERS.bob.id,
        endpoint,
        p256dh: "first-p256dh",
        auth: "first-auth",
        user_agent: "jest",
        time_zone: "Europe/Sofia",
        enabled: true,
      },
      { onConflict: "user_id,endpoint" },
    );
    expect(first.error).toBeNull();

    const second = await bob.from("web_push_subscriptions").upsert(
      {
        user_id: SEED_USERS.bob.id,
        endpoint,
        p256dh: "second-p256dh",
        auth: "second-auth",
        user_agent: "jest",
        time_zone: "Europe/Sofia",
        enabled: true,
      },
      { onConflict: "user_id,endpoint" },
    );
    expect(second.error).toBeNull();

    const fetched = await bob
      .from("web_push_subscriptions")
      .select("p256dh, auth, enabled")
      .eq("user_id", SEED_USERS.bob.id)
      .eq("endpoint", endpoint)
      .single();

    expect(fetched.error).toBeNull();
    expect(fetched.data).toMatchObject({
      p256dh: "second-p256dh",
      auth: "second-auth",
      enabled: true,
    });
  });

  it("isolates subscriptions per user for a shared endpoint (no cross-user clobber)", async () => {
    const alice = await signInAs("alice");
    try {
      const bobUpsert = await bob.from("web_push_subscriptions").upsert(
        {
          user_id: SEED_USERS.bob.id,
          endpoint,
          p256dh: "bob-p256dh",
          auth: "bob-auth",
          user_agent: "jest",
          time_zone: "Europe/Sofia",
          enabled: true,
        },
        { onConflict: "user_id,endpoint" },
      );
      expect(bobUpsert.error).toBeNull();

      // Alice subscribes with the SAME endpoint (same browser, different account).
      // Must succeed with her own row - not target Bob's row and fail the update_own policy.
      const aliceUpsert = await alice.from("web_push_subscriptions").upsert(
        {
          user_id: SEED_USERS.alice.id,
          endpoint,
          p256dh: "alice-p256dh",
          auth: "alice-auth",
          user_agent: "jest",
          time_zone: "Europe/Sofia",
          enabled: true,
        },
        { onConflict: "user_id,endpoint" },
      );
      expect(aliceUpsert.error).toBeNull();

      const admin = createServiceClient();
      const rows = await admin
        .from("web_push_subscriptions")
        .select("user_id, p256dh")
        .eq("endpoint", endpoint);
      expect(rows.error).toBeNull();
      expect(rows.data).toHaveLength(2);
      expect(rows.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ user_id: SEED_USERS.bob.id, p256dh: "bob-p256dh" }),
          expect.objectContaining({ user_id: SEED_USERS.alice.id, p256dh: "alice-p256dh" }),
        ]),
      );
    } finally {
      await alice.auth.signOut();
    }
  });

  // ---- DB guards from 20260571_web_push_endpoint_allowlist.sql ----
  // These document the exact contract the e2e push stub's canned endpoint is
  // written against (test/e2e/reminder-rearm.e2e.test.ts): an FCM-shaped
  // endpoint must insert, anything off the push-service allowlist must not,
  // and rows per user are capped. Neither guard had a test in either direction.

  it("accepts an allowlisted FCM-shaped endpoint and rejects a foreign origin", async () => {
    const allowed = await bob.from("web_push_subscriptions").insert({
      user_id: SEED_USERS.bob.id,
      endpoint,
      p256dh: "allowlist-p256dh",
      auth: "allowlist-auth",
    });
    expect(allowed.error).toBeNull();

    const rejected = await bob.from("web_push_subscriptions").insert({
      user_id: SEED_USERS.bob.id,
      endpoint: "https://attacker.example/fcm/send/integration-test",
      p256dh: "hostile-p256dh",
      auth: "hostile-auth",
    });
    expect(rejected.error).not.toBeNull();
    expect(rejected.error?.message).toMatch(/web_push_subscriptions_endpoint_allowlist/);
  });

  it("caps a user at 20 subscriptions: the 21st insert is rejected", async () => {
    const admin = createServiceClient();
    // Deterministic starting point: the cap trigger counts EXISTING rows.
    await admin.from("web_push_subscriptions").delete().eq("user_id", SEED_USERS.bob.id);
    try {
      const capEndpoint = (n: number) => `https://fcm.googleapis.com/fcm/send/integration-cap-${n}`;
      const twenty = await bob.from("web_push_subscriptions").insert(
        Array.from({ length: 20 }, (_, n) => ({
          user_id: SEED_USERS.bob.id,
          endpoint: capEndpoint(n),
          p256dh: `cap-p256dh-${n}`,
          auth: `cap-auth-${n}`,
        })),
      );
      expect(twenty.error).toBeNull();

      const overCap = await bob.from("web_push_subscriptions").insert({
        user_id: SEED_USERS.bob.id,
        endpoint: capEndpoint(20),
        p256dh: "cap-p256dh-20",
        auth: "cap-auth-20",
      });
      expect(overCap.error).not.toBeNull();
      expect(overCap.error?.message).toMatch(
        /web_push_subscriptions limit reached for user \(max 20\)/,
      );
    } finally {
      await admin.from("web_push_subscriptions").delete().eq("user_id", SEED_USERS.bob.id);
    }
  });

  it("deletes a subscription scoped to user + endpoint", async () => {
    await bob.from("web_push_subscriptions").upsert(
      {
        user_id: SEED_USERS.bob.id,
        endpoint,
        p256dh: "p",
        auth: "a",
        enabled: true,
      },
      { onConflict: "user_id,endpoint" },
    );

    const del = await bob
      .from("web_push_subscriptions")
      .delete()
      .eq("user_id", SEED_USERS.bob.id)
      .eq("endpoint", endpoint);
    expect(del.error).toBeNull();

    const fetched = await bob.from("web_push_subscriptions").select("id").eq("endpoint", endpoint);
    expect(fetched.data).toEqual([]);
  });
});

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
      cbt_onboarding_completed: false,
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
  const endpoint = "https://example.test/push/integration-test";

  beforeAll(async () => {
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    const admin = createServiceClient();
    await admin
      .from("web_push_subscriptions")
      .delete()
      .eq("user_id", SEED_USERS.bob.id)
      .eq("endpoint", endpoint);
  });

  afterAll(async () => {
    await bob.auth.signOut();
  });

  it("upserts a subscription on conflict by endpoint", async () => {
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
      { onConflict: "endpoint" },
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
      { onConflict: "endpoint" },
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

  it("deletes a subscription scoped to user + endpoint", async () => {
    await bob.from("web_push_subscriptions").upsert(
      {
        user_id: SEED_USERS.bob.id,
        endpoint,
        p256dh: "p",
        auth: "a",
        enabled: true,
      },
      { onConflict: "endpoint" },
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

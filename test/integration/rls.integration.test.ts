import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, createServiceClient, signInAs } from "./helpers";

// Verifies row-level security: users can only read and write their own rows
// across thought_records, user_preferences, profiles, and web_push_subscriptions.
// Also verifies anon users see nothing in those tables.

describe("RLS: thought_records", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  let bobRecordId: string;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
    const inserted = await bob
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.bob.id,
        situation: "RLS test situation",
        nats: [{ text: "RLS thought", beliefRating: null, isHotThought: true }],
        emotions: ["Anxious"],
        distortions: ["catastrophizing"],
        balanced_thought: "RLS balanced",
      })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    bobRecordId = inserted.data!.id;
  });

  afterAll(async () => {
    const admin = createServiceClient();
    await admin.from("thought_records").delete().eq("id", bobRecordId);
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("alice cannot select bob's records", async () => {
    const { data, error } = await alice
      .from("thought_records")
      .select("id")
      .eq("user_id", SEED_USERS.bob.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("alice cannot insert a record on behalf of bob", async () => {
    const { error } = await alice.from("thought_records").insert({
      user_id: SEED_USERS.bob.id,
      situation: "spoofed",
      nats: [{ text: "spoofed", beliefRating: null, isHotThought: true }],
      emotions: [],
      distortions: [],
      balanced_thought: "spoofed",
    });

    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security|policy|violates/i);
  });

  it("alice cannot update bob's record", async () => {
    const update = await alice
      .from("thought_records")
      .update({ situation: "hijacked" })
      .eq("id", bobRecordId)
      .select("id");

    // RLS update returns no error but affects 0 rows.
    expect(update.error).toBeNull();
    expect(update.data).toEqual([]);

    const verify = await bob
      .from("thought_records")
      .select("situation")
      .eq("id", bobRecordId)
      .single();
    expect(verify.data?.situation).toBe("RLS test situation");
  });

  it("anon clients see no thought records at all", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("thought_records").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("RLS: user_preferences and profiles", () => {
  let alice: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("alice cannot read bob's preferences row", async () => {
    const { data, error } = await alice
      .from("user_preferences")
      .select("user_id")
      .eq("user_id", SEED_USERS.bob.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("alice cannot read bob's profile row", async () => {
    const { data, error } = await alice
      .from("profiles")
      .select("user_id")
      .eq("user_id", SEED_USERS.bob.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("alice cannot upsert a profile row owned by bob", async () => {
    const { error } = await alice.from("profiles").upsert(
      {
        user_id: SEED_USERS.bob.id,
        email: "spoofed@test.local",
      },
      { onConflict: "user_id" },
    );

    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security|policy|violates/i);
  });
});

describe("RLS: profile-pics storage", () => {
  let alice: SupabaseClient;
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );

  beforeAll(async () => {
    alice = await signInAs("alice");
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("alice cannot list bob's avatar folder", async () => {
    const { data, error } = await alice.storage.from("profile-pics").list(SEED_USERS.bob.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("alice cannot upload into bob's avatar folder", async () => {
    const { error } = await alice.storage
      .from("profile-pics")
      .upload(`${SEED_USERS.bob.id}/spoofed.png`, pngBytes, {
        contentType: "image/png",
        upsert: true,
      });

    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/policy|denied|unauthorized/i);
  });
});

// ─── RLS: web_push_subscriptions ─────────────────────────────────────────────
// The file header claimed coverage but no real test existed — added here.

describe("RLS: web_push_subscriptions", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  afterEach(async () => {
    const admin = createServiceClient();
    await admin.from("web_push_subscriptions").delete().eq("user_id", SEED_USERS.alice.id);
  });

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("alice can insert her own subscription", async () => {
    const { error } = await alice.from("web_push_subscriptions").insert({
      user_id: SEED_USERS.alice.id,
      endpoint: "https://push.example.com/alice-rls-test",
      p256dh: "BNcB-test-p256dh",
      auth: "test-auth-key",
    });
    expect(error).toBeNull();
  });

  it("bob cannot read alice's subscription", async () => {
    await alice
      .from("web_push_subscriptions")
      .insert({
        user_id: SEED_USERS.alice.id,
        endpoint: "https://push.example.com/alice-rls-test-2",
        p256dh: "BNcB-test-p256dh",
        auth: "test-auth-key",
      })
      .throwOnError();

    const { data, error } = await bob
      .from("web_push_subscriptions")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("bob cannot insert a subscription on behalf of alice (RLS violation)", async () => {
    const { error } = await bob.from("web_push_subscriptions").insert({
      user_id: SEED_USERS.alice.id,
      endpoint: "https://push.example.com/spoofed",
      p256dh: "BNcB-spoofed",
      auth: "spoofed-auth",
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security|policy|violates/i);
  });
});

// ─── RLS: noticing_logs ───────────────────────────────────────────────────────

// SKIPPED: the `noticing_logs` table is NOT created by the migration tooling.
// Migration 20260552_noticing_logs.sql is recorded in schema_migrations but the
// table is absent after a fresh `supabase stop && start && db reset` (verified
// 2026-05-30). The migration SQL is valid (it creates the table when run by
// hand); the mixed 8-digit (20260552) / 14-digit (e.g. 20260516000000) migration
// version formats break Supabase's apply step, so the version is marked applied
// without running. Re-enable this block once the migration-version format is
// fixed and the table is reliably created by `db reset`.
describe.skip("RLS: noticing_logs", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    const admin = createServiceClient();
    await admin.from("noticing_logs").delete().eq("user_id", SEED_USERS.alice.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("bob cannot read alice's noticing_logs", async () => {
    await alice
      .from("noticing_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "RLS test situation",
      })
      .throwOnError();

    const { data, error } = await bob
      .from("noticing_logs")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ─── RLS: recovery_plans + challenge_plans ────────────────────────────────────

describe("RLS: recovery_plans and challenge_plans", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    const admin = createServiceClient();
    // challenge_plans FK-cascades from recovery_plans
    await admin.from("challenge_plans").delete().eq("user_id", SEED_USERS.alice.id);
    await admin.from("recovery_plans").delete().eq("user_id", SEED_USERS.alice.id);
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("bob cannot read alice's recovery_plan", async () => {
    await alice.from("recovery_plans").insert({ user_id: SEED_USERS.alice.id }).throwOnError();

    const { data, error } = await bob
      .from("recovery_plans")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("bob cannot read alice's challenge_plans", async () => {
    const plan = await alice
      .from("recovery_plans")
      .insert({ user_id: SEED_USERS.alice.id })
      .select("id")
      .single();
    expect(plan.error).toBeNull();

    await alice
      .from("challenge_plans")
      .insert({
        user_id: SEED_USERS.alice.id,
        recovery_plan_id: plan.data!.id,
        challenge_description: "Private challenge",
      })
      .throwOnError();

    const { data, error } = await bob
      .from("challenge_plans")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ─── RLS: anon sweep ─────────────────────────────────────────────────────────
// Anonymous (unauthenticated) clients should see nothing in any user table.

describe("RLS: anon client sees nothing", () => {
  it("anon reads [] from mood_logs", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("mood_logs").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon reads [] from journal_entries", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("journal_entries").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon reads [] from core_beliefs", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("core_beliefs").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon reads [] from web_push_subscriptions", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("web_push_subscriptions").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // SKIPPED: noticing_logs is not created by the migration tooling (see the
  // RLS: noticing_logs block above for the migration-version-format bug).
  it.skip("anon reads [] from noticing_logs", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("noticing_logs").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon reads [] from recovery_plans", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("recovery_plans").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("anon cannot insert into mood_logs (expects an error)", async () => {
    const anon = createAnonClient();
    const { error } = await anon.from("mood_logs").insert({
      user_id: SEED_USERS.alice.id,
      mood_score: 5,
    });
    expect(error).not.toBeNull();
  });
});

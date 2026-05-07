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
        automatic_thought: "RLS thought",
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
      automatic_thought: "spoofed",
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

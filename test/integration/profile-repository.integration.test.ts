import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// Mirrors the queries in src/features/profile/repository.ts and exercises the
// profile-pics storage bucket RLS policies. Captures alice's profile row in
// beforeAll and restores it after each test.

describe("profiles (integration)", () => {
  let alice: SupabaseClient;
  let originalProfile: Record<string, unknown>;

  beforeAll(async () => {
    alice = await signInAs("alice");
    const { data, error } = await alice
      .from("profiles")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    if (error) throw error;
    originalProfile = data as Record<string, unknown>;
  });

  afterEach(async () => {
    const admin = createServiceClient();
    const { error } = await admin
      .from("profiles")
      .upsert(originalProfile, { onConflict: "user_id" });
    if (error) throw error;
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("reads the seeded profile", async () => {
    const { data, error } = await alice
      .from("profiles")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      email: SEED_USERS.alice.email,
      avatar_source: null,
    });
  });

  it("upserts an avatar transitioning oauth -> upload -> none", async () => {
    const oauth = await alice
      .from("profiles")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          avatar_url: "https://example.test/oauth-avatar.png",
          avatar_storage_path: null,
          avatar_source: "oauth",
          avatar_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("avatar_source, avatar_url, avatar_storage_path")
      .single();
    expect(oauth.error).toBeNull();
    expect(oauth.data).toMatchObject({
      avatar_source: "oauth",
      avatar_url: "https://example.test/oauth-avatar.png",
    });

    const upload = await alice
      .from("profiles")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          avatar_url: null,
          avatar_storage_path: `${SEED_USERS.alice.id}/avatar-test.png`,
          avatar_source: "upload",
          avatar_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("avatar_source, avatar_url, avatar_storage_path")
      .single();
    expect(upload.error).toBeNull();
    expect(upload.data).toMatchObject({
      avatar_source: "upload",
      avatar_url: null,
      avatar_storage_path: `${SEED_USERS.alice.id}/avatar-test.png`,
    });

    const cleared = await alice
      .from("profiles")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          avatar_url: null,
          avatar_storage_path: null,
          avatar_source: null,
          avatar_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("avatar_source, avatar_url, avatar_storage_path, avatar_updated_at")
      .single();
    expect(cleared.error).toBeNull();
    expect(cleared.data).toMatchObject({
      avatar_source: null,
      avatar_url: null,
      avatar_storage_path: null,
    });
    expect(cleared.data?.avatar_updated_at).not.toBeNull();
  });

  it("rejects an avatar_source value outside the allowed set", async () => {
    const upsert = await alice
      .from("profiles")
      .upsert(
        {
          user_id: SEED_USERS.alice.id,
          avatar_source: "imaginary",
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    expect(upsert.error).not.toBeNull();
    expect(upsert.error?.message).toMatch(/profiles_avatar_source_check/);
  });
});

describe("profile-pics storage (integration)", () => {
  let alice: SupabaseClient;
  const filename = `avatar-integration-${Date.now()}.png`;
  const ownPath = `${SEED_USERS.alice.id}/${filename}`;

  // 1x1 transparent PNG
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );

  beforeAll(async () => {
    alice = await signInAs("alice");
  });

  afterEach(async () => {
    const admin = createServiceClient();
    await admin.storage.from("profile-pics").remove([ownPath]);
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("uploads, signs, and removes an object inside the user's own folder", async () => {
    const upload = await alice.storage.from("profile-pics").upload(ownPath, pngBytes, {
      contentType: "image/png",
      upsert: true,
    });
    expect(upload.error).toBeNull();

    const signed = await alice.storage.from("profile-pics").createSignedUrl(ownPath, 60);
    expect(signed.error).toBeNull();
    expect(signed.data?.signedUrl).toMatch(/profile-pics/);

    const remove = await alice.storage.from("profile-pics").remove([ownPath]);
    expect(remove.error).toBeNull();
  });

  it("blocks uploading into another user's folder", async () => {
    const foreignPath = `${SEED_USERS.bob.id}/${filename}`;
    const upload = await alice.storage.from("profile-pics").upload(foreignPath, pngBytes, {
      contentType: "image/png",
      upsert: true,
    });

    expect(upload.error).not.toBeNull();
    expect(upload.error?.message ?? "").toMatch(/policy|denied|unauthorized/i);
  });
});

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
    // `profiles` is a decrypting view (display_name encrypted at rest). PostgREST upsert sends
    // INSERT ... ON CONFLICT, which a view cannot be the target of; the per-user merge lives in
    // the INSTEAD OF INSERT trigger, so restore via .insert() (the trigger resolves the conflict).
    const admin = createServiceClient();
    const { error } = await admin.from("profiles").insert(originalProfile);
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

  it("merges an avatar transitioning oauth -> upload -> none via complete-row inserts", async () => {
    // The repository now writes COMPLETE rows (read-modify-write), so the per-user merge lives in
    // the INSTEAD OF INSERT trigger (ON CONFLICT (user_id)). Each write below sends every mutable
    // column; email/display_name are re-sent to preserve them (the trigger DO UPDATE has no
    // coalesce, so an omitted column would NULL it — the very ambiguity the refactor removed).
    const baseRow = {
      user_id: SEED_USERS.alice.id,
      email: SEED_USERS.alice.email,
      display_name: originalProfile.display_name as string | null,
    };

    const oauth = await alice
      .from("profiles")
      .insert({
        ...baseRow,
        avatar_url: "https://example.test/oauth-avatar.png",
        avatar_storage_path: null,
        avatar_source: "oauth",
        avatar_updated_at: new Date().toISOString(),
      })
      .select("avatar_source, avatar_url, avatar_storage_path")
      .single();
    expect(oauth.error).toBeNull();
    expect(oauth.data).toMatchObject({
      avatar_source: "oauth",
      avatar_url: "https://example.test/oauth-avatar.png",
    });

    const upload = await alice
      .from("profiles")
      .insert({
        ...baseRow,
        avatar_url: null,
        avatar_storage_path: `${SEED_USERS.alice.id}/avatar-test.png`,
        avatar_source: "upload",
        avatar_updated_at: new Date().toISOString(),
      })
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
      .insert({
        ...baseRow,
        avatar_url: null,
        avatar_storage_path: null,
        avatar_source: null,
        avatar_updated_at: new Date().toISOString(),
      })
      .select("avatar_source, avatar_url, avatar_storage_path, avatar_updated_at, display_name")
      .single();
    expect(cleared.error).toBeNull();
    expect(cleared.data).toMatchObject({
      avatar_source: null,
      avatar_url: null,
      avatar_storage_path: null,
      display_name: originalProfile.display_name as string | null,
    });
    expect(cleared.data?.avatar_updated_at).not.toBeNull();
  });

  it("rejects an avatar_source value outside the allowed set", async () => {
    const insert = await alice
      .from("profiles")
      .insert({
        user_id: SEED_USERS.alice.id,
        email: SEED_USERS.alice.email,
        avatar_source: "imaginary",
      })
      .select("*")
      .single();

    expect(insert.error).not.toBeNull();
    expect(insert.error?.message).toMatch(/profiles_avatar_source_check/);
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

import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, createServiceClient, signInAs } from "./helpers";

// Verifies the transparent encrypted view over profiles (the final encryption gap):
// - display_name is encrypted at rest (profiles_data.display_name_enc is ciphertext) and
//   decrypts transparently on read through the same `profiles` name.
// - email + all avatar columns + timestamps are PASS-THROUGH (plaintext at rest).
// - Clearing display_name to NULL works (the repo sends null explicitly).
// - Updating the avatar PRESERVES display_name (the original deferral bug): because the repo
//   writes COMPLETE rows and the INSTEAD OF INSERT trigger does a no-coalesce ON CONFLICT
//   DO UPDATE, a re-sent display_name survives an avatar-only change.
// - Upsert-merge: a second complete-row insert for the same user merges (PK user_id).
// - RLS: a second user is isolated.
// - export_user_data() returns the profile (plaintext email + decrypted display_name reachable
//   through the view); delete_user_account() deletes through the view.
//
// profiles has NO `id` column — identity is user_id.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array || Array.isArray(value))
    return Buffer.from(value as Uint8Array).toString("hex");
  return JSON.stringify(value);
}

const SECRET_NAME = "secret-marker-Display Зорница";

describe("profiles display_name encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();
  let originalProfile: Record<string, unknown>;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
    const { data, error } = await alice
      .from("profiles")
      .select("*")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    if (error) throw error;
    originalProfile = data as Record<string, unknown>;
  });

  afterEach(async () => {
    // Restore alice's seeded profile. profiles is a view → insert (the INSTEAD OF trigger merges).
    const { error } = await admin.from("profiles").insert(originalProfile);
    if (error) throw error;
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  // A COMPLETE mutable-column row (mirrors how the repository now writes).
  function completeRow(overrides: Record<string, unknown>) {
    return {
      user_id: SEED_USERS.alice.id,
      email: SEED_USERS.alice.email,
      display_name: SECRET_NAME,
      avatar_url: null,
      avatar_storage_path: null,
      avatar_source: null,
      avatar_updated_at: null,
      ...overrides,
    };
  }

  it("encrypts display_name at rest and decrypts on read; email/avatar pass through", async () => {
    const written = await alice
      .from("profiles")
      .insert(
        completeRow({
          email: SEED_USERS.alice.email,
          avatar_source: "oauth",
          avatar_url: "https://x.test/a.png",
        }),
      )
      .select("display_name, email, avatar_source, avatar_url")
      .single();
    expect(written.error).toBeNull();
    expect(written.data).toMatchObject({
      display_name: SECRET_NAME,
      email: SEED_USERS.alice.email,
      avatar_source: "oauth",
      avatar_url: "https://x.test/a.png",
    });

    // At rest: display_name is ciphertext; email/avatar columns stay plaintext on the base table.
    const atRest = await admin
      .from("profiles_data")
      .select("display_name_enc, email, avatar_source, avatar_url")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.display_name_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.display_name_enc)).not.toContain("secret-marker");
    expect(cipherToText(atRest.data?.display_name_enc)).not.toContain("Зорница");
    expect(atRest.data?.email).toBe(SEED_USERS.alice.email);
    expect(atRest.data?.avatar_source).toBe("oauth");
    expect(atRest.data?.avatar_url).toBe("https://x.test/a.png");

    // profiles_data has no plaintext display_name column anymore (dropped in 20260664).
    const probe = await admin.from("profiles_data").select("display_name").limit(1);
    expect(probe.error).not.toBeNull();
    expect(probe.error?.message ?? "").toMatch(/display_name/);
  });

  it("clears display_name to NULL (the value is sent as null explicitly)", async () => {
    await alice.from("profiles").insert(completeRow({})).select("display_name").single();

    const cleared = await alice
      .from("profiles")
      .insert(completeRow({ display_name: null }))
      .select("display_name")
      .single();
    expect(cleared.error).toBeNull();
    expect(cleared.data?.display_name).toBeNull();

    // NULL display_name round-trips as NULL ciphertext (no encrypted empty string at rest).
    const atRest = await admin
      .from("profiles_data")
      .select("display_name_enc")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(atRest.error).toBeNull();
    expect(atRest.data?.display_name_enc).toBeNull();
  });

  it("updating the avatar PRESERVES display_name (the original deferral bug)", async () => {
    // Set a known name first.
    await alice
      .from("profiles")
      .insert(completeRow({ display_name: SECRET_NAME }))
      .select("display_name")
      .single();

    // Now change ONLY the avatar — but the repo sends a COMPLETE row, re-sending display_name.
    const avatarUpdate = await alice
      .from("profiles")
      .insert(
        completeRow({
          display_name: SECRET_NAME, // re-sent (preserve) — NOT omitted
          avatar_source: "upload",
          avatar_storage_path: `${SEED_USERS.alice.id}/avatar-x.png`,
          avatar_updated_at: new Date().toISOString(),
        }),
      )
      .select("display_name, avatar_source, avatar_storage_path")
      .single();
    expect(avatarUpdate.error).toBeNull();
    expect(avatarUpdate.data).toMatchObject({
      display_name: SECRET_NAME,
      avatar_source: "upload",
      avatar_storage_path: `${SEED_USERS.alice.id}/avatar-x.png`,
    });

    // Confirm via a fresh read that the name survived the avatar change.
    const reread = await alice
      .from("profiles")
      .select("display_name")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(reread.error).toBeNull();
    expect(reread.data?.display_name).toBe(SECRET_NAME);
  });

  it("upsert-merge: a second complete-row insert for the same user merges (one row, PK user_id)", async () => {
    await alice
      .from("profiles")
      .insert(completeRow({ display_name: "first-name" }))
      .select("user_id")
      .single();

    const second = await alice
      .from("profiles")
      .insert(completeRow({ display_name: "second-name" }))
      .select("display_name")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.display_name).toBe("second-name");

    const rows = await alice.from("profiles").select("user_id").eq("user_id", SEED_USERS.alice.id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });

  it("rejects a display_name over the 100-char cap (guard moved into the trigger)", async () => {
    const tooLong = "x".repeat(101);
    const rejected = await alice
      .from("profiles")
      .insert(completeRow({ display_name: tooLong }))
      .select("display_name")
      .single();
    expect(rejected.error).not.toBeNull();
    expect(rejected.error?.message ?? "").toMatch(/100 characters/);
  });

  it("RLS: a second user cannot read or mutate another user's profile", async () => {
    await alice
      .from("profiles")
      .insert(completeRow({ display_name: SECRET_NAME }))
      .select("user_id")
      .single();

    const bobRead = await bob
      .from("profiles")
      .select("user_id, display_name")
      .eq("user_id", SEED_USERS.alice.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("profiles")
      .update({ display_name: "hacked" })
      .eq("user_id", SEED_USERS.alice.id);
    expect(bobUpd.error).toBeNull();

    const aliceRead = await alice
      .from("profiles")
      .select("display_name")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.display_name).toBe(SECRET_NAME);
  });

  it("export_user_data() returns the profile (plaintext email + decrypted display_name via view)", async () => {
    await alice
      .from("profiles")
      .insert(completeRow({ display_name: SECRET_NAME }))
      .select("user_id")
      .single();

    const exported = await alice.rpc("export_user_data");
    expect(exported.error).toBeNull();
    const profile = (exported.data as { profile?: { email?: string } } | null)?.profile;
    expect(profile?.email).toBe(SEED_USERS.alice.email);

    // The export selects email/created_at/updated_at; the same-named view also decrypts
    // display_name for any caller, confirmed by a direct view read.
    const viewName = await alice
      .from("profiles")
      .select("display_name")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(viewName.error).toBeNull();
    expect(viewName.data?.display_name).toBe(SECRET_NAME);
  });

  it("delete_user_account() deletes the profile through the view", async () => {
    const testEmail = `profile-delete-flow-${Date.now()}@test.local`;
    const testPassword = "password123";

    // Local GoTrue ignores a requested user_id, so capture the ACTUAL created id for the FK.
    const created = await admin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const createdId = created.data?.user?.id as string;
    expect(createdId).toBeTruthy();

    try {
      const ins = await admin
        .from("profiles")
        .insert({ user_id: createdId, email: testEmail, display_name: "to-be-deleted" });
      expect(ins.error).toBeNull();

      // The profile exists at rest before deletion.
      const before = await admin.from("profiles_data").select("user_id").eq("user_id", createdId);
      expect(before.data).toHaveLength(1);

      const client = createAnonClient();
      const signIn = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      expect(signIn.error).toBeNull();

      const del = await client.rpc("delete_user_account");
      expect(del.error).toBeNull();

      const remaining = await admin
        .from("profiles_data")
        .select("user_id")
        .eq("user_id", createdId);
      expect(remaining.error).toBeNull();
      expect(remaining.data).toEqual([]);
    } finally {
      await admin.auth.admin.deleteUser(createdId).catch(() => undefined);
    }
  });
});

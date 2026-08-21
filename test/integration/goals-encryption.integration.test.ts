import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllGoalsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over goals:
// - title + description round-trip plaintext through the same `goals` name, while
//   `goals_data` holds only ciphertext (*_enc).
// - pass-through columns (life_domain, goal_type, target_date, status) survive a round-trip.
// - value_key round-trips encrypted, and a goal anchored to nothing keeps a NULL key
//   through both triggers (#1287) - it can never gate goal creation.
// - the title 300-char and description 4000-char caps are enforced in the trigger.
// - RLS isolates a second user.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const TITLE = "Run a half marathon (secret-marker-TITLE)";
const DESCRIPTION = "Build up to 21km over six months (secret-marker-DESC)";

describe("goals encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllGoalsForUser(SEED_USERS.alice.id);
    await deleteAllGoalsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      title: TITLE,
      description: DESCRIPTION,
      life_domain: "health",
      goal_type: "outcome",
      target_date: "2026-12-31",
      status: "active",
    };
  }

  it("INSERT round-trips plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("goals").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: TITLE,
      description: DESCRIPTION,
      life_domain: "health",
      goal_type: "outcome",
      target_date: "2026-12-31",
      status: "active",
    });

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("goals_data")
      .select("title_enc, description_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.title_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.title_enc)).not.toContain("secret-marker-TITLE");
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-DESC");
  });

  it("UPDATE re-encrypts and pass-through columns survive", async () => {
    const created = await alice.from("goals").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin.from("goals_data").select("title_enc").eq("id", id).single();
    const beforeCipher = cipherToText(before.data?.title_enc);

    const updated = await alice
      .from("goals")
      .update({
        title: "Run a full marathon (secret-marker-NEW)",
        life_domain: "growth",
        status: "completed",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.title).toBe("Run a full marathon (secret-marker-NEW)");
    expect(updated.data?.life_domain).toBe("growth");
    expect(updated.data?.status).toBe("completed");

    const after = await admin.from("goals_data").select("title_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.title_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  // #1287. The key is a pointer into the user's ranked priority values, encrypted at rest
  // even though this table leaves its other enum-ish columns in plaintext: values_profile
  // encrypts its own value list, and a plaintext pointer would put "anchored to honesty"
  // in the clear anyway.
  it("INSERT round-trips the value key while storing it as ciphertext", async () => {
    const insert = await alice
      .from("goals")
      .insert({ ...baseRow(), value_key: "honest-secret-marker-VALUE" })
      .select("*")
      .single();
    expect(insert.error).toBeNull();
    expect(insert.data?.value_key).toBe("honest-secret-marker-VALUE");

    const id = insert.data!.id as string;
    const atRest = await admin.from("goals_data").select("value_key_enc").eq("id", id).single();
    expect(atRest.error).toBeNull();
    const cipher = cipherToText(atRest.data?.value_key_enc);
    expect(cipher.length).toBeGreaterThan(0);
    expect(cipher).not.toContain("secret-marker-VALUE");
  });

  // The programme's first week lists goal-setting BEFORE values clarification, so the
  // first goal on the intended path is written with no priority values in existence.
  // NULL must survive both triggers rather than becoming "": a coalesce anywhere on this
  // path would turn "anchored to nothing" into "anchored to the empty string".
  it("a goal anchored to nothing keeps a NULL key through INSERT and UPDATE", async () => {
    const insert = await alice.from("goals").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data?.value_key).toBeNull();

    const id = insert.data!.id as string;
    const atRest = await admin.from("goals_data").select("value_key_enc").eq("id", id).single();
    expect(atRest.error).toBeNull();
    expect(atRest.data?.value_key_enc).toBeNull();

    // Editing an unrelated field must not invent a key.
    const updated = await alice
      .from("goals")
      .update({ status: "completed" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.value_key).toBeNull();
  });

  it("UPDATE encrypts the value key, and can clear it back to NULL", async () => {
    const created = await alice
      .from("goals")
      .insert({ ...baseRow(), value_key: "caring" })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const anchored = await alice
      .from("goals")
      .update({ value_key: "brave-secret-marker-VALUE" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(anchored.error).toBeNull();
    expect(anchored.data?.value_key).toBe("brave-secret-marker-VALUE");

    const atRest = await admin.from("goals_data").select("value_key_enc").eq("id", id).single();
    expect(cipherToText(atRest.data?.value_key_enc)).not.toContain("secret-marker-VALUE");

    // Un-anchoring is a real state, not an empty string.
    const cleared = await alice
      .from("goals")
      .update({ value_key: null })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(cleared.error).toBeNull();
    expect(cleared.data?.value_key).toBeNull();

    const clearedAtRest = await admin
      .from("goals_data")
      .select("value_key_enc")
      .eq("id", id)
      .single();
    expect(clearedAtRest.data?.value_key_enc).toBeNull();
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("goals").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice.from("goals").delete().eq("user_id", SEED_USERS.alice.id).eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("goals_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with title longer than 300 characters is rejected", async () => {
    const result = await alice
      .from("goals")
      .insert({ ...baseRow(), title: "x".repeat(301) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("INSERT with description longer than 4000 characters is rejected", async () => {
    const result = await alice
      .from("goals")
      .insert({ ...baseRow(), description: "x".repeat(4001) })
      .select("id")
      .single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read, update, or delete another user's goal", async () => {
    const created = await alice.from("goals").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("goals").select("id, title").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("goals").update({ title: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("goals").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("goals")
      .select("title, description, life_domain")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.title).toBe(TITLE);
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
    expect(aliceRead.data?.life_domain).toBe("health");
  });
});

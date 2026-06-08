import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllExposureForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over exposure_hierarchies:
// - text columns (title, anxiety_type) round-trip plaintext through the same
//   `exposure_hierarchies` name, while `exposure_hierarchies_data` holds only ciphertext (*_enc).
// - the title length cap (300) is enforced by the INSTEAD OF trigger.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const TITLE = "Fear of public speaking (secret-marker-TITLE)";
const ANXIETY_TYPE = "social-anxiety (secret-marker-ANX)";

describe("exposure_hierarchies encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllExposureForUser(SEED_USERS.alice.id);
    await deleteAllExposureForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      title: TITLE,
      anxiety_type: ANXIETY_TYPE,
    };
  }

  it("INSERT round-trips text plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("exposure_hierarchies").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      title: TITLE,
      anxiety_type: ANXIETY_TYPE,
    });
    // Pass-through timestamps survive the round-trip.
    expect(insert.data?.created_at).toBeTruthy();
    expect(insert.data?.updated_at).toBeTruthy();

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("exposure_hierarchies_data")
      .select("title_enc, anxiety_type_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.title_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.title_enc)).not.toContain("secret-marker-TITLE");
    expect(cipherToText(atRest.data?.anxiety_type_enc)).not.toContain("secret-marker-ANX");
  });

  it("UPDATE re-encrypts and round-trips the new values", async () => {
    const created = await alice
      .from("exposure_hierarchies")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("exposure_hierarchies_data")
      .select("title_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.title_enc);

    const updated = await alice
      .from("exposure_hierarchies")
      .update({ title: "Updated fear (secret-marker-NEW)", anxiety_type: "panic" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.title).toBe("Updated fear (secret-marker-NEW)");
    expect(updated.data?.anxiety_type).toBe("panic");

    const after = await admin
      .from("exposure_hierarchies_data")
      .select("title_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.title_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NEW");
  });

  it("DELETE via the view's trigger removes the base row", async () => {
    const created = await alice
      .from("exposure_hierarchies")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("exposure_hierarchies")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("exposure_hierarchies_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with title longer than 300 characters is rejected", async () => {
    const row = { ...baseRow(), title: "x".repeat(301) };
    const result = await alice.from("exposure_hierarchies").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's hierarchy", async () => {
    const created = await alice
      .from("exposure_hierarchies")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("exposure_hierarchies").select("id, title").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("exposure_hierarchies").update({ title: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("exposure_hierarchies").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("exposure_hierarchies")
      .select("title, anxiety_type")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.title).toBe(TITLE);
    expect(aliceRead.data?.anxiety_type).toBe(ANXIETY_TYPE);
  });
});

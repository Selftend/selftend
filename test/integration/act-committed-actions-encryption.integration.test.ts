import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_committed_actions:
// - title / description / obstacles round-trip plaintext through the same `act_committed_actions`
//   name, while `act_committed_actions_data` holds only ciphertext (*_enc).
// - pass-through columns (life_domain, status, target_date) survive a round-trip; the life_domain
//   and status enum CHECKs still apply on the base table.
// - act_action_steps.action_id FK -> act_committed_actions_data(id) still cascades on DELETE.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const TITLE = "Walk three times this week (secret-marker-TIT)";
const DESCRIPTION = "Short walks after lunch (secret-marker-DESC)";
const OBSTACLES = "Tend to skip when busy (secret-marker-OBS)";

describe("act_committed_actions encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllActLogsForUser(SEED_USERS.alice.id);
    await deleteAllActLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      life_domain: "personalGrowth",
      title: TITLE,
      description: DESCRIPTION,
      status: "active",
      target_date: "2026-07-01",
      obstacles: OBSTACLES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_committed_actions").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      life_domain: "personalGrowth",
      title: TITLE,
      description: DESCRIPTION,
      status: "active",
      target_date: "2026-07-01",
      obstacles: OBSTACLES,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_committed_actions_data")
      .select("title_enc, description_enc, obstacles_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.title_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.title_enc)).not.toContain("secret-marker-TIT");
    expect(cipherToText(atRest.data?.description_enc)).not.toContain("secret-marker-DESC");
    expect(cipherToText(atRest.data?.obstacles_enc)).not.toContain("secret-marker-OBS");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice
      .from("act_committed_actions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_committed_actions_data")
      .select("title_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.title_enc);

    const NEW_TITLE = "Walk daily (secret-marker-TIT2)";
    const updated = await alice
      .from("act_committed_actions")
      .update({ title: NEW_TITLE, status: "completed" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.title).toBe(NEW_TITLE);
    expect(updated.data?.status).toBe("completed");

    const after = await admin
      .from("act_committed_actions_data")
      .select("title_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.title_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-TIT2");
  });

  it("DELETE through the view removes the base row and cascades to action steps", async () => {
    const created = await alice
      .from("act_committed_actions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const actionId = created.data!.id as string;

    const step = await alice
      .from("act_action_steps")
      .insert({
        user_id: SEED_USERS.alice.id,
        action_id: actionId,
        description: "First small step",
      })
      .select("id")
      .single();
    expect(step.error).toBeNull();
    const stepId = step.data!.id as string;

    const del = await alice
      .from("act_committed_actions")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", actionId);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_committed_actions_data").select("id").eq("id", actionId);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);

    // FK ON DELETE CASCADE removed the dependent action step too.
    const stepRead = await admin.from("act_action_steps_data").select("id").eq("id", stepId);
    expect(stepRead.error).toBeNull();
    expect(stepRead.data).toEqual([]);
  });

  it("INSERT with an invalid status enum is rejected", async () => {
    const row = { ...baseRow(), status: "notARealStatus" };
    const result = await alice.from("act_committed_actions").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's committed action", async () => {
    const created = await alice
      .from("act_committed_actions")
      .insert(baseRow())
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_committed_actions").select("id, title").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("act_committed_actions").update({ title: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_committed_actions").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_committed_actions")
      .select("title, description, obstacles")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.title).toBe(TITLE);
    expect(aliceRead.data?.description).toBe(DESCRIPTION);
    expect(aliceRead.data?.obstacles).toBe(OBSTACLES);
  });
});

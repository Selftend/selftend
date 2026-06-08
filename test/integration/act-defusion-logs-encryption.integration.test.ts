import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_defusion_logs:
// - fused_thought / defused_version / notes round-trip plaintext through the same
//   `act_defusion_logs` name, while `act_defusion_logs_data` holds only ciphertext (*_enc).
// - pass-through columns (thought_category, technique_used, fusion_level_before/after) survive a
//   round-trip and the enum CHECK constraints still apply on the base table.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const FUSED = "I am a failure (secret-marker-FUS)";
const DEFUSED = "I am having the thought that I am a failure (secret-marker-DEF)";
const NOTES = "Naming the story helped (secret-marker-NOT)";

describe("act_defusion_logs encrypted view (integration)", () => {
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
      fused_thought: FUSED,
      thought_category: "selfJudgment",
      fusion_level_before: 80,
      technique_used: "namingTheStory",
      defused_version: DEFUSED,
      fusion_level_after: 30,
      notes: NOTES,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_defusion_logs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      fused_thought: FUSED,
      thought_category: "selfJudgment",
      fusion_level_before: 80,
      technique_used: "namingTheStory",
      defused_version: DEFUSED,
      fusion_level_after: 30,
      notes: NOTES,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_defusion_logs_data")
      .select("fused_thought_enc, defused_version_enc, notes_enc")
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.fused_thought_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.fused_thought_enc)).not.toContain("secret-marker-FUS");
    expect(cipherToText(atRest.data?.defused_version_enc)).not.toContain("secret-marker-DEF");
    expect(cipherToText(atRest.data?.notes_enc)).not.toContain("secret-marker-NOT");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("act_defusion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_defusion_logs_data")
      .select("fused_thought_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.fused_thought_enc);

    const NEW_FUSED = "A different hook (secret-marker-FUS2)";
    const updated = await alice
      .from("act_defusion_logs")
      .update({ fused_thought: NEW_FUSED, fusion_level_after: 10, thought_category: "worry" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.fused_thought).toBe(NEW_FUSED);
    expect(updated.data?.fusion_level_after).toBe(10);
    expect(updated.data?.thought_category).toBe("worry");

    const after = await admin
      .from("act_defusion_logs_data")
      .select("fused_thought_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.fused_thought_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-FUS2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_defusion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_defusion_logs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_defusion_logs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with an invalid technique_used enum is rejected", async () => {
    const row = { ...baseRow(), technique_used: "notARealTechnique" };
    const result = await alice.from("act_defusion_logs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's defusion log", async () => {
    const created = await alice.from("act_defusion_logs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_defusion_logs").select("id, fused_thought").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_defusion_logs")
      .update({ fused_thought: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_defusion_logs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_defusion_logs")
      .select("fused_thought, notes")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.fused_thought).toBe(FUSED);
    expect(aliceRead.data?.notes).toBe(NOTES);
  });
});

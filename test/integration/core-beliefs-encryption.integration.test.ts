import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllCoreBeliefsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over core_beliefs:
// - text columns (belief_statement/alternative_belief/reinforcement_plan) and text[] columns
//   (triggering_situations/evidence_for/evidence_against) round-trip plaintext through the same
//   `core_beliefs` name, while `core_beliefs_data` holds only ciphertext (*_enc).
// - pass-through columns (belief strengths, next_review_date) survive a round-trip.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const BELIEF = "I am fundamentally unlovable (secret-marker-BEL)";
const ALTERNATIVE = "I am worthy of connection (secret-marker-ALT)";
const REINFORCE = "Re-read this when self-critical (secret-marker-REI)";
const TRIGGERS = ["Being ignored (secret-marker-TRG1)", "Conflict (secret-marker-TRG2)"];
const EVIDENCE_FOR = ["A friend cancelled (secret-marker-EVF1)"];
const EVIDENCE_AGAINST = ["My sister calls weekly (secret-marker-EVA1)"];

describe("core_beliefs encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllCoreBeliefsForUser(SEED_USERS.alice.id);
    await deleteAllCoreBeliefsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      belief_statement: BELIEF,
      triggering_situations: TRIGGERS,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      alternative_belief: ALTERNATIVE,
      original_belief_strength: 90,
      alternative_belief_strength: 30,
      reinforcement_plan: REINFORCE,
    };
  }

  it("INSERT round-trips text + text[] plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("core_beliefs").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      belief_statement: BELIEF,
      alternative_belief: ALTERNATIVE,
      reinforcement_plan: REINFORCE,
      triggering_situations: TRIGGERS,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      original_belief_strength: 90,
      alternative_belief_strength: 30,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("core_beliefs_data")
      .select(
        "belief_statement_enc, alternative_belief_enc, reinforcement_plan_enc, triggering_situations_enc, evidence_for_enc, evidence_against_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.belief_statement_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.belief_statement_enc)).not.toContain("secret-marker-BEL");
    expect(cipherToText(atRest.data?.alternative_belief_enc)).not.toContain("secret-marker-ALT");
    expect(cipherToText(atRest.data?.reinforcement_plan_enc)).not.toContain("secret-marker-REI");
    expect(cipherToText(atRest.data?.triggering_situations_enc)).not.toContain(
      "secret-marker-TRG1",
    );
    expect(cipherToText(atRest.data?.evidence_for_enc)).not.toContain("secret-marker-EVF1");
    expect(cipherToText(atRest.data?.evidence_against_enc)).not.toContain("secret-marker-EVA1");
  });

  it("UPDATE re-encrypts and preserves pass-through strengths", async () => {
    const created = await alice.from("core_beliefs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("core_beliefs_data")
      .select("belief_statement_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.belief_statement_enc);

    const NEW_BELIEF = "I am learning to trust (secret-marker-BEL2)";
    const NEW_TRIGGERS = ["Public speaking (secret-marker-TRG3)"];
    const updated = await alice
      .from("core_beliefs")
      .update({
        belief_statement: NEW_BELIEF,
        triggering_situations: NEW_TRIGGERS,
        alternative_belief_strength: 65,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.belief_statement).toBe(NEW_BELIEF);
    expect(updated.data?.triggering_situations).toEqual(NEW_TRIGGERS);
    expect(updated.data?.alternative_belief_strength).toBe(65);

    const after = await admin
      .from("core_beliefs_data")
      .select("belief_statement_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.belief_statement_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-BEL2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("core_beliefs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("core_beliefs")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const viewRead = await alice.from("core_beliefs").select("id").eq("id", id).maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    const baseRead = await admin.from("core_beliefs_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with belief_statement longer than 4000 characters is rejected", async () => {
    const row = { ...baseRow(), belief_statement: "x".repeat(4001) };
    const result = await alice.from("core_beliefs").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's core belief", async () => {
    const created = await alice.from("core_beliefs").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("core_beliefs").select("id, belief_statement").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("core_beliefs")
      .update({ belief_statement: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("core_beliefs").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("core_beliefs")
      .select("belief_statement, triggering_situations")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.belief_statement).toBe(BELIEF);
    expect(aliceRead.data?.triggering_situations).toEqual(TRIGGERS);
  });
});

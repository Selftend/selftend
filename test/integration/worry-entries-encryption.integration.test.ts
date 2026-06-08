import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllWorryEntriesForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over worry_entries:
// - text columns (worry_statement/coping_statement) and text[] columns
//   (evidence_for/evidence_against/action_steps) round-trip plaintext through the same
//   `worry_entries` name, while `worry_entries_data` holds only ciphertext (*_enc).
// - pass-through columns (worry_category, probability_estimate, resolved) survive a round-trip.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const WORRY = "I'll bomb the interview (secret-marker-WOR)";
const COPING = "I prepared; I can only do my best (secret-marker-COP)";
const EVIDENCE_FOR = ["I stumbled in a mock (secret-marker-EVF1)"];
const EVIDENCE_AGAINST = ["I aced the screening (secret-marker-EVA1)"];
const ACTION_STEPS = ["Rehearse answers (secret-marker-ACT1)", "Sleep early (secret-marker-ACT2)"];

describe("worry_entries encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllWorryEntriesForUser(SEED_USERS.alice.id);
    await deleteAllWorryEntriesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      worry_statement: WORRY,
      worry_category: "hypothetical",
      probability_estimate: 70,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      coping_statement: COPING,
      action_steps: ACTION_STEPS,
      resolved: false,
    };
  }

  it("INSERT round-trips text + text[] plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("worry_entries").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      worry_statement: WORRY,
      coping_statement: COPING,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      action_steps: ACTION_STEPS,
      worry_category: "hypothetical",
      probability_estimate: 70,
      resolved: false,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("worry_entries_data")
      .select(
        "worry_statement_enc, coping_statement_enc, evidence_for_enc, evidence_against_enc, action_steps_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.worry_statement_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.worry_statement_enc)).not.toContain("secret-marker-WOR");
    expect(cipherToText(atRest.data?.coping_statement_enc)).not.toContain("secret-marker-COP");
    expect(cipherToText(atRest.data?.evidence_for_enc)).not.toContain("secret-marker-EVF1");
    expect(cipherToText(atRest.data?.evidence_against_enc)).not.toContain("secret-marker-EVA1");
    expect(cipherToText(atRest.data?.action_steps_enc)).not.toContain("secret-marker-ACT1");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("worry_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("worry_entries_data")
      .select("worry_statement_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.worry_statement_enc);

    const NEW_WORRY = "Maybe it will go fine (secret-marker-WOR2)";
    const NEW_STEPS = ["Breathe (secret-marker-ACT3)"];
    const updated = await alice
      .from("worry_entries")
      .update({
        worry_statement: NEW_WORRY,
        action_steps: NEW_STEPS,
        resolved: true,
        worry_category: "real_problem",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.worry_statement).toBe(NEW_WORRY);
    expect(updated.data?.action_steps).toEqual(NEW_STEPS);
    expect(updated.data?.resolved).toBe(true);
    expect(updated.data?.worry_category).toBe("real_problem");

    const after = await admin
      .from("worry_entries_data")
      .select("worry_statement_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.worry_statement_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-WOR2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("worry_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("worry_entries")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const viewRead = await alice.from("worry_entries").select("id").eq("id", id).maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    const baseRead = await admin.from("worry_entries_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with worry_statement longer than 4000 characters is rejected", async () => {
    const row = { ...baseRow(), worry_statement: "x".repeat(4001) };
    const result = await alice.from("worry_entries").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's worry entry", async () => {
    const created = await alice.from("worry_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("worry_entries").select("id, worry_statement").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("worry_entries")
      .update({ worry_statement: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("worry_entries").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("worry_entries")
      .select("worry_statement, action_steps")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.worry_statement).toBe(WORRY);
    expect(aliceRead.data?.action_steps).toEqual(ACTION_STEPS);
  });
});

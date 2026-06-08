import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_value_entries:
// - value_statement / current_actions_note / desired_actions_note / barriers round-trip plaintext
//   through the same `act_value_entries` name, while `act_value_entries_data` holds only ciphertext.
// - pass-through columns (life_domain, importance_rating, current_alignment_rating) survive a
//   round-trip; the life_domain enum CHECK still applies on the base table.
// - UPSERT: a second INSERT for the same (user_id, life_domain) merges via the INSTEAD OF INSERT
//   trigger's ON CONFLICT rather than erroring (upsertValueEntry semantics).

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const STATEMENT = "Being a present, patient leader (secret-marker-VAL)";
const CURRENT = "Weekly 1:1s (secret-marker-CUR)";
const DESIRED = "Daily check-ins (secret-marker-DES)";
const BARRIERS = "Calendar overload (secret-marker-BAR)";

describe("act_value_entries encrypted view (integration)", () => {
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
      life_domain: "work",
      value_statement: STATEMENT,
      importance_rating: 9,
      current_alignment_rating: 6,
      current_actions_note: CURRENT,
      desired_actions_note: DESIRED,
      barriers: BARRIERS,
    };
  }

  it("INSERT round-trips all text columns while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_value_entries").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      life_domain: "work",
      value_statement: STATEMENT,
      importance_rating: 9,
      current_alignment_rating: 6,
      current_actions_note: CURRENT,
      desired_actions_note: DESIRED,
      barriers: BARRIERS,
    });

    const id = insert.data!.id as string;
    const atRest = await admin
      .from("act_value_entries_data")
      .select(
        "value_statement_enc, current_actions_note_enc, desired_actions_note_enc, barriers_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.value_statement_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.value_statement_enc)).not.toContain("secret-marker-VAL");
    expect(cipherToText(atRest.data?.current_actions_note_enc)).not.toContain("secret-marker-CUR");
    expect(cipherToText(atRest.data?.desired_actions_note_enc)).not.toContain("secret-marker-DES");
    expect(cipherToText(atRest.data?.barriers_enc)).not.toContain("secret-marker-BAR");
  });

  it("UPDATE re-encrypts and preserves pass-through columns", async () => {
    const created = await alice.from("act_value_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("act_value_entries_data")
      .select("value_statement_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.value_statement_enc);

    const NEW_STATEMENT = "Leading with steady warmth (secret-marker-VAL2)";
    const updated = await alice
      .from("act_value_entries")
      .update({ value_statement: NEW_STATEMENT, importance_rating: 10 })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.value_statement).toBe(NEW_STATEMENT);
    expect(updated.data?.importance_rating).toBe(10);

    const after = await admin
      .from("act_value_entries_data")
      .select("value_statement_enc")
      .eq("id", id)
      .single();
    const afterCipher = cipherToText(after.data?.value_statement_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-VAL2");
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice.from("act_value_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const del = await alice
      .from("act_value_entries")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(del.error).toBeNull();

    const baseRead = await admin.from("act_value_entries_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("UPSERT: a second INSERT for the same (user_id, life_domain) merges instead of erroring", async () => {
    const first = await alice.from("act_value_entries").insert(baseRow()).select("id").single();
    expect(first.error).toBeNull();

    const MERGED = "Re-stated value (secret-marker-MERGE)";
    const second = await alice
      .from("act_value_entries")
      .insert({
        user_id: SEED_USERS.alice.id,
        life_domain: "work",
        value_statement: MERGED,
        importance_rating: 8,
        current_alignment_rating: 5,
        current_actions_note: "updated current",
        desired_actions_note: "updated desired",
        barriers: "updated barriers",
      })
      .select("*")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.value_statement).toBe(MERGED);
    expect(second.data?.importance_rating).toBe(8);

    // Exactly one row for the (user, work) pair (the upsert merged).
    const rows = await alice
      .from("act_value_entries")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id)
      .eq("life_domain", "work");
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);

    // At-rest re-encryption: the merged ciphertext does not leak the new plaintext.
    const id = second.data!.id as string;
    const atRest = await admin
      .from("act_value_entries_data")
      .select("value_statement_enc")
      .eq("id", id)
      .single();
    expect(cipherToText(atRest.data?.value_statement_enc)).not.toContain("secret-marker-MERGE");
  });

  it("INSERT with an invalid life_domain enum is rejected", async () => {
    const row = { ...baseRow(), life_domain: "notARealDomain" };
    const result = await alice.from("act_value_entries").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's value entry", async () => {
    const created = await alice.from("act_value_entries").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("act_value_entries").select("id, value_statement").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_value_entries")
      .update({ value_statement: "hacked" })
      .eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_value_entries").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_value_entries")
      .select("value_statement, current_actions_note, desired_actions_note, barriers")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.value_statement).toBe(STATEMENT);
    expect(aliceRead.data?.current_actions_note).toBe(CURRENT);
    expect(aliceRead.data?.desired_actions_note).toBe(DESIRED);
    expect(aliceRead.data?.barriers).toBe(BARRIERS);
  });
});

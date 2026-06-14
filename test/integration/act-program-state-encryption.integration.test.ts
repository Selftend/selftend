import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, deleteAllActLogsForUser, signInAs } from "./helpers";

// Verifies the transparent encrypted view over act_program_state:
// - primary_concerns (text[]) round-trips plaintext through the same `act_program_state` name,
//   while `act_program_state_data` holds only ciphertext (primary_concerns_enc).
// - pass-through columns survive a round-trip: active_principles (text[], PLAINTEXT),
//   myths_acknowledged, preferred_check_in_time (PLAINTEXT structured HH:mm), last_check_in_at.
// - UPSERT: act_program_state is a per-user singleton (PK user_id). A second INSERT with the same
//   user merges (the INSTEAD OF INSERT trigger's ON CONFLICT (user_id) DO UPDATE) rather than
//   erroring - the upsertACTProgramState semantics formerly carried by PostgREST upsert.
// - This table has NO `id` column; identity is user_id.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const CONCERNS = ["secret-marker-CON-a", "secret-marker-CON-b"];
const PRINCIPLES = ["defusion", "acceptance"];
const CHECK_IN = "08:30";

describe("act_program_state encrypted view (integration)", () => {
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
      active_principles: PRINCIPLES,
      primary_concerns: CONCERNS,
      myths_acknowledged: true,
      preferred_check_in_time: CHECK_IN,
    };
  }

  it("INSERT round-trips the text[] while storing ciphertext at rest", async () => {
    const insert = await alice.from("act_program_state").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      active_principles: PRINCIPLES,
      primary_concerns: CONCERNS,
      myths_acknowledged: true,
      preferred_check_in_time: CHECK_IN,
    });

    const atRest = await admin
      .from("act_program_state_data")
      .select(
        "primary_concerns_enc, active_principles, preferred_check_in_time, myths_acknowledged",
      )
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.primary_concerns_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.primary_concerns_enc)).not.toContain("secret-marker-CON");
    // Pass-through columns stay plaintext on the base table.
    expect(atRest.data?.active_principles).toEqual(PRINCIPLES);
    expect(atRest.data?.preferred_check_in_time).toBe(CHECK_IN);
    expect(atRest.data?.myths_acknowledged).toBe(true);
  });

  it("UPDATE re-encrypts primary_concerns and preserves pass-through columns", async () => {
    const created = await alice.from("act_program_state").insert(baseRow()).select("*").single();
    expect(created.error).toBeNull();

    const before = await admin
      .from("act_program_state_data")
      .select("primary_concerns_enc")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    const beforeCipher = cipherToText(before.data?.primary_concerns_enc);

    const NEXT_CONCERNS = ["secret-marker-CON2-x"];
    const updated = await alice
      .from("act_program_state")
      .update({
        primary_concerns: NEXT_CONCERNS,
        active_principles: ["expansion"],
        myths_acknowledged: false,
      })
      .eq("user_id", SEED_USERS.alice.id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.primary_concerns).toEqual(NEXT_CONCERNS);
    expect(updated.data?.active_principles).toEqual(["expansion"]);
    expect(updated.data?.myths_acknowledged).toBe(false);

    const after = await admin
      .from("act_program_state_data")
      .select("primary_concerns_enc")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    const afterCipher = cipherToText(after.data?.primary_concerns_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-CON2");
  });

  it("UPSERT: a second INSERT for the same user merges instead of erroring", async () => {
    const first = await alice.from("act_program_state").insert(baseRow()).select("*").single();
    expect(first.error).toBeNull();

    const NEXT_CONCERNS = ["secret-marker-merge"];
    const second = await alice
      .from("act_program_state")
      .insert({
        user_id: SEED_USERS.alice.id,
        primary_concerns: NEXT_CONCERNS,
        active_principles: ["contact"],
        myths_acknowledged: false,
      })
      .select("*")
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.primary_concerns).toEqual(NEXT_CONCERNS);
    expect(second.data?.active_principles).toEqual(["contact"]);

    // Exactly one row for the user (the per-user singleton merged).
    const rows = await alice
      .from("act_program_state")
      .select("user_id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });

  it("DELETE through the view removes the underlying base row", async () => {
    const created = await alice
      .from("act_program_state")
      .insert(baseRow())
      .select("user_id")
      .single();
    expect(created.error).toBeNull();

    const del = await alice.from("act_program_state").delete().eq("user_id", SEED_USERS.alice.id);
    expect(del.error).toBeNull();

    const viewRead = await alice
      .from("act_program_state")
      .select("user_id")
      .eq("user_id", SEED_USERS.alice.id)
      .maybeSingle();
    expect(viewRead.error).toBeNull();
    expect(viewRead.data).toBeNull();

    const baseRead = await admin
      .from("act_program_state_data")
      .select("user_id")
      .eq("user_id", SEED_USERS.alice.id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("RLS: a second user cannot read or mutate another user's program state", async () => {
    const created = await alice
      .from("act_program_state")
      .insert(baseRow())
      .select("user_id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob
      .from("act_program_state")
      .select("user_id, primary_concerns")
      .eq("user_id", SEED_USERS.alice.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob
      .from("act_program_state")
      .update({ primary_concerns: ["hacked"] })
      .eq("user_id", SEED_USERS.alice.id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("act_program_state").delete().eq("user_id", SEED_USERS.alice.id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("act_program_state")
      .select("primary_concerns, active_principles")
      .eq("user_id", SEED_USERS.alice.id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.primary_concerns).toEqual(CONCERNS);
    expect(aliceRead.data?.active_principles).toEqual(PRINCIPLES);
  });
});

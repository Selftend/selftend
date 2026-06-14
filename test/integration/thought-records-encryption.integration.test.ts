import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createServiceClient,
  deleteAllThoughtRecordsForUser,
  signInAs,
} from "./helpers";

// Verifies the transparent encrypted view over thought_records:
// - text columns (situation/balanced_thought/outcome_notes), text[] columns
//   (evidence_for/evidence_against) and a JSONB column (nats) all round-trip plaintext through
//   the same `thought_records` name, while `thought_records_data` holds only ciphertext (*_enc).
// - pass-through columns (emotions[], distortions[], intensities) survive a round-trip.

function cipherToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const SITUATION = "Missed a deadline (secret-marker-SIT)";
const BALANCED = "One slip does not define me (secret-marker-BAL)";
const OUTCOME = "Felt lighter afterwards (secret-marker-OUT)";
const EVIDENCE_FOR = [
  "I did submit late (secret-marker-EVF1)",
  "I forgot the reminder (secret-marker-EVF2)",
];
const EVIDENCE_AGAINST = ["I asked for an extension (secret-marker-EVA1)"];
const NATS = [
  { thought: "I always fail (secret-marker-NAT1)", distortion: "all_or_nothing" },
  { thought: "They will fire me (secret-marker-NAT2)", distortion: "fortune_telling" },
];

describe("thought_records encrypted view (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;
  const admin = createServiceClient();

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
    await deleteAllThoughtRecordsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  function baseRow() {
    return {
      user_id: SEED_USERS.alice.id,
      situation: SITUATION,
      emotions: ["anxious", "ashamed"],
      distortions: ["all_or_nothing"],
      balanced_thought: BALANCED,
      emotion_intensity_before: 80,
      emotion_intensity_after: 40,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      outcome_notes: OUTCOME,
      nats: NATS,
    };
  }

  it("INSERT round-trips text, text[] and JSONB plaintext while storing ciphertext at rest", async () => {
    const insert = await alice.from("thought_records").insert(baseRow()).select("*").single();
    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      situation: SITUATION,
      balanced_thought: BALANCED,
      outcome_notes: OUTCOME,
      evidence_for: EVIDENCE_FOR,
      evidence_against: EVIDENCE_AGAINST,
      emotions: ["anxious", "ashamed"],
      distortions: ["all_or_nothing"],
      emotion_intensity_before: 80,
      emotion_intensity_after: 40,
    });
    // JSONB round-trips to the exact same object.
    expect(insert.data?.nats).toEqual(NATS);

    const id = insert.data!.id as string;

    const atRest = await admin
      .from("thought_records_data")
      .select(
        "situation_enc, balanced_thought_enc, outcome_notes_enc, evidence_for_enc, evidence_against_enc, nats_enc",
      )
      .eq("id", id)
      .single();
    expect(atRest.error).toBeNull();
    expect(cipherToText(atRest.data?.situation_enc).length).toBeGreaterThan(0);
    expect(cipherToText(atRest.data?.situation_enc)).not.toContain("secret-marker-SIT");
    expect(cipherToText(atRest.data?.balanced_thought_enc)).not.toContain("secret-marker-BAL");
    expect(cipherToText(atRest.data?.outcome_notes_enc)).not.toContain("secret-marker-OUT");
    expect(cipherToText(atRest.data?.evidence_for_enc)).not.toContain("secret-marker-EVF1");
    expect(cipherToText(atRest.data?.evidence_against_enc)).not.toContain("secret-marker-EVA1");
    expect(cipherToText(atRest.data?.nats_enc)).not.toContain("secret-marker-NAT1");
  });

  it("UPDATE re-encrypts and JSONB / text[] round-trip the new values", async () => {
    const created = await alice.from("thought_records").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const before = await admin
      .from("thought_records_data")
      .select("nats_enc")
      .eq("id", id)
      .single();
    const beforeCipher = cipherToText(before.data?.nats_enc);

    const NEW_NATS = [
      { thought: "Maybe I overreacted (secret-marker-NAT3)", distortion: "magnification" },
    ];
    const NEW_EVIDENCE = ["I fixed it the next day (secret-marker-EVF3)"];
    const updated = await alice
      .from("thought_records")
      .update({ nats: NEW_NATS, evidence_for: NEW_EVIDENCE, situation: "Updated situation" })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    expect(updated.error).toBeNull();
    expect(updated.data?.nats).toEqual(NEW_NATS);
    expect(updated.data?.evidence_for).toEqual(NEW_EVIDENCE);
    expect(updated.data?.situation).toBe("Updated situation");

    const after = await admin.from("thought_records_data").select("nats_enc").eq("id", id).single();
    const afterCipher = cipherToText(after.data?.nats_enc);
    expect(afterCipher.length).toBeGreaterThan(0);
    expect(afterCipher).not.toEqual(beforeCipher);
    expect(afterCipher).not.toContain("secret-marker-NAT3");
  });

  // thought_records intentionally has NO user DELETE RLS policy (the app archives via
  // archived_at instead of hard-deleting). The INSTEAD OF delete trigger therefore only takes
  // effect for service-role (cleanup/admin) - which is exactly what the afterEach cleanup uses.
  it("DELETE via the view's trigger removes the base row (service-role), user delete is a no-op", async () => {
    const created = await alice.from("thought_records").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    // A user DELETE is hidden by RLS (no delete policy) - no-op, row survives.
    const userDel = await alice
      .from("thought_records")
      .delete()
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(userDel.error).toBeNull();
    const stillThere = await admin.from("thought_records_data").select("id").eq("id", id);
    expect(stillThere.data).toEqual([{ id }]);

    // Service-role DELETE flows through the INSTEAD OF trigger and removes the base row.
    const adminDel = await admin.from("thought_records").delete().eq("id", id);
    expect(adminDel.error).toBeNull();

    const baseRead = await admin.from("thought_records_data").select("id").eq("id", id);
    expect(baseRead.error).toBeNull();
    expect(baseRead.data).toEqual([]);
  });

  it("INSERT with situation longer than 4000 characters is rejected", async () => {
    const row = { ...baseRow(), situation: "x".repeat(4001) };
    const result = await alice.from("thought_records").insert(row).select("id").single();
    expect(result.error).not.toBeNull();
  });

  it("RLS: a second user cannot read or mutate another user's thought record", async () => {
    const created = await alice.from("thought_records").insert(baseRow()).select("id").single();
    expect(created.error).toBeNull();
    const id = created.data!.id as string;

    const bobRead = await bob.from("thought_records").select("id, situation").eq("id", id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);

    const bobUpd = await bob.from("thought_records").update({ situation: "hacked" }).eq("id", id);
    expect(bobUpd.error).toBeNull();

    const bobDel = await bob.from("thought_records").delete().eq("id", id);
    expect(bobDel.error).toBeNull();

    const aliceRead = await alice
      .from("thought_records")
      .select("situation, nats")
      .eq("id", id)
      .single();
    expect(aliceRead.error).toBeNull();
    expect(aliceRead.data?.situation).toBe(SITUATION);
    expect(aliceRead.data?.nats).toEqual(NATS);
  });
});

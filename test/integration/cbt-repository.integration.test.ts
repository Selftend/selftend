import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllThoughtRecordsForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/cbt/repository.ts. Tests the DB contract
// the repo depends on (schema columns, RLS allowing self-writes, ordering,
// archived_at filter), not the mapping functions (those have unit tests).

describe("cbt thought_records (integration)", () => {
  let alice: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
  });

  afterEach(async () => {
    await deleteAllThoughtRecordsForUser(SEED_USERS.alice.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
  });

  it("inserts a thought record with nats and reads it back", async () => {
    const nats = [
      { text: "I am completely useless", beliefRating: 95, isHotThought: true },
      { text: "This job should have been mine", beliefRating: 100, isHotThought: false },
    ];

    const insert = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Test situation",
        nats,
        emotions: ["Anxious"],
        emotion_intensity_before: 80,
        distortions: ["catastrophizing"],
        evidence_for: ["It felt urgent"],
        evidence_against: ["No one has blamed me"],
        balanced_thought: "Test balance",
        emotion_intensity_after: 50,
        outcome_notes: "Less certain after writing it down",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      situation: "Test situation",
      nats,
      emotions: ["Anxious"],
      emotion_intensity_before: 80,
      distortions: ["catastrophizing"],
      evidence_for: ["It felt urgent"],
      evidence_against: ["No one has blamed me"],
      balanced_thought: "Test balance",
      emotion_intensity_after: 50,
      outcome_notes: "Less certain after writing it down",
      archived_at: null,
    });
    expect(insert.data?.id).toEqual(expect.any(String));
    expect(insert.data?.created_at).toEqual(expect.any(String));
  });

  it("updates a field without touching nats", async () => {
    const nats = [{ text: "initial thought", beliefRating: null, isHotThought: true }];

    const created = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Original situation",
        nats,
        emotions: [],
        distortions: [],
        balanced_thought: "initial balanced",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const updated = await alice
      .from("thought_records")
      .update({
        situation: "Updated",
        balanced_thought: "updated balanced",
      })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", created.data!.id)
      .select("*")
      .single();

    expect(updated.error).toBeNull();
    expect(updated.data?.situation).toBe("Updated");
    expect(updated.data?.balanced_thought).toBe("updated balanced");
    expect(updated.data?.nats).toEqual(nats);
  });

  it("archiving hides the record from the active list", async () => {
    const created = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Will be archived",
        nats: [{ text: "thought", beliefRating: null, isHotThought: true }],
        emotions: ["Anxious"],
        distortions: ["catastrophizing"],
        balanced_thought: "balanced",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();
    const id = created.data!.id;

    const archive = await alice
      .from("thought_records")
      .update({ archived_at: new Date().toISOString() })
      .eq("user_id", SEED_USERS.alice.id)
      .eq("id", id);
    expect(archive.error).toBeNull();

    const active = await alice
      .from("thought_records")
      .select("id")
      .eq("user_id", SEED_USERS.alice.id)
      .is("archived_at", null);
    expect(active.error).toBeNull();
    expect(active.data).toEqual([]);

    const all = await alice
      .from("thought_records")
      .select("id, archived_at")
      .eq("user_id", SEED_USERS.alice.id);
    expect(all.error).toBeNull();
    expect(all.data).toHaveLength(1);
    expect(all.data?.[0].archived_at).not.toBeNull();
  });
});

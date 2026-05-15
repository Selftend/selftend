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

  it("inserts a thought record and reads it back", async () => {
    const insert = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Test situation",
        automatic_thought: "Test thought",
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
      automatic_thought: "Test thought",
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

  it("allows a blank partial thought record", async () => {
    const insert = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "",
        automatic_thought: "",
        emotions: [],
        distortions: [],
        balanced_thought: "",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      situation: "",
      automatic_thought: "",
      emotions: [],
      distortions: [],
      balanced_thought: "",
      archived_at: null,
    });
  });

  it("lists non-archived records ordered by updated_at desc", async () => {
    const rows = [
      { situation: "Older", thought: "older thought" },
      { situation: "Middle", thought: "middle thought" },
      { situation: "Newer", thought: "newer thought" },
    ];
    for (const row of rows) {
      const result = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          situation: row.situation,
          automatic_thought: row.thought,
          emotions: ["Anxious"],
          distortions: ["catastrophizing"],
          balanced_thought: "balanced",
        })
        .select("id")
        .single();
      expect(result.error).toBeNull();
    }

    const list = await alice
      .from("thought_records")
      .select("situation")
      .eq("user_id", SEED_USERS.alice.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    expect(list.error).toBeNull();
    const situations = list.data?.map((r) => r.situation);
    expect(situations).toEqual(["Newer", "Middle", "Older"]);
  });

  it("updates a thought record", async () => {
    const created = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Initial",
        automatic_thought: "initial",
        emotions: ["Anxious"],
        distortions: ["catastrophizing"],
        balanced_thought: "initial balanced",
      })
      .select("*")
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
    expect(updated.data?.automatic_thought).toBe("initial");
  });

  it("archiving hides the record from the active list", async () => {
    const created = await alice
      .from("thought_records")
      .insert({
        user_id: SEED_USERS.alice.id,
        situation: "Will be archived",
        automatic_thought: "thought",
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

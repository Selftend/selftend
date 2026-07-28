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

  // The captured civil day a thought record was written on (#330).
  describe("created_offset_minutes", () => {
    const baseRecord = {
      situation: "Offset test",
      nats: [{ text: "thought", beliefRating: null, isHotThought: true }],
      emotions: [],
      distortions: [],
      balanced_thought: "balanced",
    };

    it("round-trips an explicit offset through the encrypted view", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: "2026-05-15T19:00:00.000Z",
          created_offset_minutes: -420,
        })
        .select("*")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.created_offset_minutes).toBe(-420);

      // Read it back rather than trusting the INSERT response: the value has to
      // have survived the encrypted-view writer, not just been echoed out of NEW.
      const read = await alice
        .from("thought_records")
        .select("created_offset_minutes")
        .eq("id", insert.data!.id)
        .single();
      expect(read.error).toBeNull();
      expect(read.data?.created_offset_minutes).toBe(-420);
    });

    it("records an omitted offset as unknown rather than UTC", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({ user_id: SEED_USERS.alice.id, ...baseRecord })
        .select("created_offset_minutes, created_at")
        .single();

      expect(insert.error).toBeNull();
      // A 0 here would be the column claiming a fact the caller never gave (#250).
      expect(insert.data?.created_offset_minutes).toBeNull();
      // created_at is still server-defaulted for clients that omit it, and the
      // zz_ occurrence trigger must sort late enough to see that default rather
      // than rejecting the insert as "Occurrence time is required".
      expect(insert.data?.created_at).toEqual(expect.any(String));
    });

    it("accepts an explicit zero offset from a caller genuinely at UTC", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: "2026-05-15T19:00:00.000Z",
          created_offset_minutes: 0,
        })
        .select("created_offset_minutes")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.created_offset_minutes).toBe(0);
    });

    it("preserves the captured offset across an unrelated edit", async () => {
      const created = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: "2026-05-15T19:00:00.000Z",
          created_offset_minutes: -420,
        })
        .select("id")
        .single();
      expect(created.error).toBeNull();

      // Editing the text - or archiving - must never re-stamp the record's civil
      // day. The UPDATE writer carries the stored value through NEW unchanged.
      const updated = await alice
        .from("thought_records")
        .update({ situation: "Reread in another timezone" })
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", created.data!.id)
        .select("created_offset_minutes, created_at")
        .single();

      expect(updated.error).toBeNull();
      expect(updated.data?.created_offset_minutes).toBe(-420);
      expect(updated.data?.created_at).toBe("2026-05-15T19:00:00+00:00");
    });

    it("rejects an out-of-range offset", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: "2026-05-15T19:00:00.000Z",
          created_offset_minutes: 900,
        })
        .select("id");

      expect(insert.error).not.toBeNull();
    });

    it("rejects a creation time in the future", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_offset_minutes: 0,
        })
        .select("id");

      expect(insert.error).not.toBeNull();
    });
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

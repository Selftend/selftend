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

  // The belief re-rating (#1376). This is the only seam that can prove the
  // migration: the column is written through a view whose INSTEAD OF triggers
  // enumerate columns by hand, so a column missing from the view, the insert
  // writer or the update writer fails HERE and nowhere else - a unit test mocks
  // the client away, and an insert that silently drops the column still returns
  // a row and still reports success.
  describe("belief_after", () => {
    const base = {
      user_id: SEED_USERS.alice.id,
      situation: "Belief test",
      nats: [{ text: "I will be late", beliefRating: 90, isHotThought: true }],
      emotions: [],
      distortions: [],
      balanced_thought: "Probably fine",
    };

    it("round-trips a value through the encrypted view", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({ ...base, belief_after: 40 })
        .select("*")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.belief_after).toBe(40);
    });

    it("stores an omitted rating as null rather than zero", async () => {
      // Null is "not rated"; 0 is "I no longer believe this at all". A coalesce
      // in the insert writer would turn every skipped rating into the strongest
      // possible result.
      const insert = await alice.from("thought_records").insert(base).select("*").single();

      expect(insert.error).toBeNull();
      expect(insert.data?.belief_after).toBeNull();
    });

    it("accepts an explicit zero", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({ ...base, belief_after: 0 })
        .select("*")
        .single();

      expect(insert.error).toBeNull();
      expect(insert.data?.belief_after).toBe(0);
    });

    it("updates the value, and can clear it back to null", async () => {
      const created = await alice
        .from("thought_records")
        .insert({ ...base, belief_after: 70 })
        .select("id")
        .single();
      expect(created.error).toBeNull();

      const raised = await alice
        .from("thought_records")
        .update({ belief_after: 20 })
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", created.data!.id)
        .select("*")
        .single();
      expect(raised.error).toBeNull();
      expect(raised.data?.belief_after).toBe(20);

      const cleared = await alice
        .from("thought_records")
        .update({ belief_after: null })
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", created.data!.id)
        .select("*")
        .single();
      expect(cleared.error).toBeNull();
      expect(cleared.data?.belief_after).toBeNull();
    });

    it("preserves the rating across an edit that does not mention it", async () => {
      const created = await alice
        .from("thought_records")
        .insert({ ...base, belief_after: 35 })
        .select("id")
        .single();
      expect(created.error).toBeNull();

      const edited = await alice
        .from("thought_records")
        .update({ situation: "Edited elsewhere" })
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", created.data!.id)
        .select("*")
        .single();

      expect(edited.error).toBeNull();
      expect(edited.data?.belief_after).toBe(35);
    });

    it("rejects a rating outside 0..100", async () => {
      const insert = await alice
        .from("thought_records")
        .insert({ ...base, belief_after: 101 })
        .select("*")
        .single();

      expect(insert.error).not.toBeNull();
    });
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

    // Redeclaring thought_records_upd to carry the new column is the moment the
    // `returning ... into` clause from 20260662 is easiest to drop by accident.
    // Without it the UPDATE writer hands PostgREST a NEW that still holds the
    // pre-edit updated_at, and the history list - which sorts and labels by it -
    // shows the stale value until a separate fetch lands.
    it("returns the freshly stamped updated_at from an edit", async () => {
      const created = await alice
        .from("thought_records")
        .insert({
          user_id: SEED_USERS.alice.id,
          ...baseRecord,
          created_at: "2026-05-15T19:00:00.000Z",
          created_offset_minutes: -420,
        })
        .select("id, updated_at")
        .single();
      expect(created.error).toBeNull();

      const updated = await alice
        .from("thought_records")
        .update({ situation: "Edited" })
        .eq("user_id", SEED_USERS.alice.id)
        .eq("id", created.data!.id)
        .select("updated_at")
        .single();

      expect(updated.error).toBeNull();
      expect(updated.data?.updated_at).not.toBe(created.data?.updated_at);

      // ...and the value handed back is the one that actually persisted, not a
      // timestamp the writer invented on its way out.
      const read = await alice
        .from("thought_records")
        .select("updated_at")
        .eq("id", created.data!.id)
        .single();
      expect(read.error).toBeNull();
      expect(read.data?.updated_at).toBe(updated.data?.updated_at);
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

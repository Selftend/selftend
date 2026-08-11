import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, deleteAllSleepLogsForUser, signInAs } from "./helpers";

// Mirrors the queries in src/features/sleep/repository.ts. Verifies the DB
// contract the repo depends on (schema columns, RLS allowing self-writes,
// ordering, scoping).

describe("sleep sleep_logs (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    alice = await signInAs("alice");
    bob = await signInAs("bob");
  });

  afterEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
    await deleteAllSleepLogsForUser(SEED_USERS.bob.id);
  });

  afterAll(async () => {
    await alice.auth.signOut();
    await bob.auth.signOut();
  });

  it("inserts a sleep log and reads it back", async () => {
    const insert = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 4,
        notes: "felt rested",
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data).toMatchObject({
      user_id: SEED_USERS.alice.id,
      duration_minutes: 480,
      quality: 4,
      notes: "felt rested",
    });
    expect(insert.data?.logged_at).toEqual(expect.any(String));
  });

  it("rejects non-positive durations via the check constraint", async () => {
    const insert = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 0,
        quality: 3,
        notes: "",
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("rejects quality outside 1-5", async () => {
    const tooHigh = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 6,
        notes: "",
      })
      .select("id");
    expect(tooHigh.error).not.toBeNull();
  });

  it("lists logs ordered by logged_at desc", async () => {
    const rows = [
      { duration_minutes: 360, logged_at: "2026-05-13T08:00:00.000Z" },
      { duration_minutes: 480, logged_at: "2026-05-15T08:00:00.000Z" },
      { duration_minutes: 420, logged_at: "2026-05-14T08:00:00.000Z" },
    ];
    for (const row of rows) {
      const r = await alice
        .from("sleep_logs")
        .insert({ user_id: SEED_USERS.alice.id, quality: 3, notes: "", ...row })
        .select("id")
        .single();
      expect(r.error).toBeNull();
    }

    const list = await alice
      .from("sleep_logs")
      .select("duration_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false });

    expect(list.error).toBeNull();
    expect(list.data?.map((r) => r.duration_minutes)).toEqual([480, 420, 360]);
  });

  it("stores a sleep window, derives entry_day, and validates the duration against it", async () => {
    const window = JSON.stringify({
      startedAt: "2026-05-14T20:30:00.000Z", // 22:30 at +120 — May 14 locally
      startedOffsetMinutes: 120,
      endedAt: "2026-05-15T04:00:00.000Z",
      endedOffsetMinutes: 120,
    });

    const insert = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 450,
        quality: 4,
        notes: "",
        logged_at: "2026-05-15T04:00:00.000Z",
        logged_offset_minutes: 120,
        sleep_window: window,
      })
      .select("*")
      .single();

    expect(insert.error).toBeNull();
    // The entry belongs to the civil day at sleep start, in its captured frame.
    expect(insert.data?.entry_day).toBe("2026-05-14");
    expect(JSON.parse(insert.data!.sleep_window)).toMatchObject({
      startedAt: expect.stringContaining("2026-05-14T20:30:00"),
      startedOffsetMinutes: 120,
      endedOffsetMinutes: 120,
    });

    // The ciphertext round-trips through the decrypting view.
    const readBack = await alice
      .from("sleep_logs")
      .select("sleep_window, entry_day, duration_minutes")
      .eq("id", insert.data!.id)
      .single();
    expect(readBack.error).toBeNull();
    expect(JSON.parse(readBack.data!.sleep_window)).toMatchObject({ startedOffsetMinutes: 120 });

    // Clearing the window deletes the ciphertext and re-derives entry_day from
    // the captured occurrence (04:00Z at +120 is May 15 locally).
    const cleared = await alice
      .from("sleep_logs")
      .update({ sleep_window: null, duration_minutes: 400 })
      .eq("id", insert.data!.id)
      .select("sleep_window, entry_day")
      .single();
    expect(cleared.error).toBeNull();
    expect(cleared.data?.sleep_window).toBeNull();
    expect(cleared.data?.entry_day).toBe("2026-05-15");
  });

  it("rejects a windowed write whose duration contradicts its own bounds", async () => {
    const insert = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480, // bounds say 450
        quality: 4,
        notes: "",
        logged_at: "2026-05-15T04:00:00.000Z",
        logged_offset_minutes: 120,
        sleep_window: JSON.stringify({
          startedAt: "2026-05-14T20:30:00.000Z",
          startedOffsetMinutes: 120,
          endedAt: "2026-05-15T04:00:00.000Z",
          endedOffsetMinutes: 120,
        }),
      })
      .select("id");
    expect(insert.error).not.toBeNull();
  });

  it("rejects a one-sided or inverted window", async () => {
    const base = {
      user_id: SEED_USERS.alice.id,
      duration_minutes: 450,
      quality: 4,
      notes: "",
      logged_at: "2026-05-15T04:00:00.000Z",
      logged_offset_minutes: 120,
    };

    const oneSided = await alice
      .from("sleep_logs")
      .insert({
        ...base,
        sleep_window: JSON.stringify({
          startedAt: "2026-05-14T20:30:00.000Z",
          startedOffsetMinutes: 120,
        }),
      })
      .select("id");
    expect(oneSided.error).not.toBeNull();

    const inverted = await alice
      .from("sleep_logs")
      .insert({
        ...base,
        sleep_window: JSON.stringify({
          startedAt: "2026-05-15T04:00:00.000Z",
          startedOffsetMinutes: 120,
          endedAt: "2026-05-14T20:30:00.000Z",
          endedOffsetMinutes: 120,
        }),
      })
      .select("id");
    expect(inverted.error).not.toBeNull();
  });

  it("backfills entry_day for duration-only rows from the captured occurrence", async () => {
    const insert = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 4,
        notes: "",
        logged_at: "2026-05-15T01:00:00.000Z",
        logged_offset_minutes: -660, // 14:00 the previous day at -11
      })
      .select("entry_day, sleep_window")
      .single();

    expect(insert.error).toBeNull();
    expect(insert.data?.entry_day).toBe("2026-05-14");
    expect(insert.data?.sleep_window).toBeNull();
  });

  it("scopes select by RLS so another user cannot read", async () => {
    const created = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 4,
        notes: "private",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobRead = await bob.from("sleep_logs").select("id").eq("id", created.data!.id);
    expect(bobRead.error).toBeNull();
    expect(bobRead.data).toEqual([]);
  });

  it("update on row owned by another user does nothing under RLS", async () => {
    const created = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 4,
        notes: "private",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const bobUpdate = await bob
      .from("sleep_logs")
      .update({ notes: "hacked" })
      .eq("id", created.data!.id);
    expect(bobUpdate.error).toBeNull();

    const aliceCheck = await alice
      .from("sleep_logs")
      .select("notes")
      .eq("id", created.data!.id)
      .single();
    expect(aliceCheck.data?.notes).toBe("private");
  });

  it("delete by id scoped to user", async () => {
    const created = await alice
      .from("sleep_logs")
      .insert({
        user_id: SEED_USERS.alice.id,
        duration_minutes: 480,
        quality: 4,
        notes: "",
      })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const del = await alice.from("sleep_logs").delete().eq("id", created.data!.id);
    expect(del.error).toBeNull();

    const list = await alice.from("sleep_logs").select("id").eq("user_id", SEED_USERS.alice.id);
    expect(list.data).toEqual([]);
  });
});

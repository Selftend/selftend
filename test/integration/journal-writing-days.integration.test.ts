import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, deleteAllJournalEntriesForUser, signInAs } from "./helpers";

interface WritingDayRow {
  day_key: string;
  word_count: number | string;
}

async function writingDays(client: SupabaseClient, days = 14) {
  return client.rpc("journal_writing_days", { p_time_zone: "UTC", p_days: days });
}

describe("journal_writing_days (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllJournalEntriesForUser(SEED_USERS.alice.id);
    await deleteAllJournalEntriesForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("returns a dense fourteen-day window for an empty journal", async () => {
    const result = await writingDays(alice);
    expect(result.error).toBeNull();

    const rows = (result.data ?? []) as WritingDayRow[];
    expect(rows).toHaveLength(14);
    expect(rows.every((row) => Number(row.word_count) === 0)).toBe(true);
  });

  it("counts every entry in the window rather than stopping at the list cap", async () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      user_id: SEED_USERS.alice.id,
      title: `Entry ${index}`,
      body: "three little words",
    }));
    const insert = await alice.from("journal_entries").insert(rows);
    expect(insert.error).toBeNull();

    const result = await writingDays(alice);
    expect(result.error).toBeNull();
    const totals = (result.data ?? []) as WritingDayRow[];
    expect(totals.reduce((sum, row) => sum + Number(row.word_count), 0)).toBe(180);
  });

  it("buckets entries by their captured civil-day offset across UTC midnight", async () => {
    const utcYesterday = new Date();
    utcYesterday.setUTCHours(0, 0, 0, 0);
    utcYesterday.setUTCDate(utcYesterday.getUTCDate() - 1);
    const utcDayBefore = new Date(utcYesterday);
    utcDayBefore.setUTCDate(utcDayBefore.getUTCDate() - 1);
    const utcToday = new Date(utcYesterday);
    utcToday.setUTCDate(utcToday.getUTCDate() + 1);

    const insert = await alice.from("journal_entries").insert([
      {
        user_id: SEED_USERS.alice.id,
        title: "East of UTC",
        body: "two words",
        occurred_at: `${utcYesterday.toISOString().slice(0, 10)}T23:30:00.000Z`,
        occurred_offset_minutes: 120,
      },
      {
        user_id: SEED_USERS.alice.id,
        title: "West of UTC",
        body: "three private words",
        occurred_at: `${utcYesterday.toISOString().slice(0, 10)}T00:30:00.000Z`,
        occurred_offset_minutes: -120,
      },
    ]);
    expect(insert.error).toBeNull();

    const result = await writingDays(alice);
    expect(result.error).toBeNull();
    const totals = new Map(
      ((result.data ?? []) as WritingDayRow[]).map((row) => [row.day_key, Number(row.word_count)]),
    );
    expect(totals.get(utcToday.toISOString().slice(0, 10))).toBe(2);
    expect(totals.get(utcDayBefore.toISOString().slice(0, 10))).toBe(3);
  });

  it("keeps each caller's private entries out of the other's totals", async () => {
    const mine = await alice.from("journal_entries").insert({
      user_id: SEED_USERS.alice.id,
      title: "Mine",
      body: "four private words here",
    });
    expect(mine.error).toBeNull();
    const theirs = await bob.from("journal_entries").insert({
      user_id: SEED_USERS.bob.id,
      title: "Theirs",
      body: "two words",
    });
    expect(theirs.error).toBeNull();

    const aliceResult = await writingDays(alice);
    const bobResult = await writingDays(bob);
    expect(aliceResult.error).toBeNull();
    expect(bobResult.error).toBeNull();
    expect(
      ((aliceResult.data ?? []) as WritingDayRow[]).reduce(
        (sum, row) => sum + Number(row.word_count),
        0,
      ),
    ).toBe(4);
    expect(
      ((bobResult.data ?? []) as WritingDayRow[]).reduce(
        (sum, row) => sum + Number(row.word_count),
        0,
      ),
    ).toBe(2);
  });

  it("rejects invalid windows and unauthenticated callers", async () => {
    const invalid = await writingDays(alice, 0);
    expect(invalid.error).not.toBeNull();

    const anon = createAnonClient();
    const unauthenticated = await writingDays(anon);
    expect(unauthenticated.error).not.toBeNull();
  });
});

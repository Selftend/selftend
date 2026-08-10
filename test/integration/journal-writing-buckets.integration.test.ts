import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, deleteAllJournalEntriesForUser, signInAs } from "./helpers";

interface WritingBucketRow {
  bucket_start_key: string;
  bucket_end_key: string;
  word_count: number | string;
  bucket_unit: "day" | "week" | "month" | "year";
  range_start_key: string;
  range_end_key: string;
}

function writingBuckets(client: SupabaseClient, days: number | null) {
  return client.rpc("journal_writing_buckets", { p_time_zone: "UTC", p_days: days });
}

describe("journal_writing_buckets (integration)", () => {
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

  it("returns dense daily and seven-day preset buckets", async () => {
    const daily = await writingBuckets(alice, 30);
    expect(daily.error).toBeNull();
    expect(daily.data).toHaveLength(30);
    expect((daily.data as WritingBucketRow[]).every((row) => row.bucket_unit === "day")).toBe(true);

    const weekly = await writingBuckets(alice, 90);
    expect(weekly.error).toBeNull();
    expect(weekly.data).toHaveLength(13);
    expect((weekly.data as WritingBucketRow[]).every((row) => row.bucket_unit === "week")).toBe(
      true,
    );
  });

  it("counts every private entry without returning a body", async () => {
    const insert = await alice.from("journal_entries").insert(
      Array.from({ length: 60 }, (_, index) => ({
        user_id: SEED_USERS.alice.id,
        title: `Entry ${index}`,
        body: "three little words",
      })),
    );
    expect(insert.error).toBeNull();

    const result = await writingBuckets(alice, 7);
    expect(result.error).toBeNull();
    const rows = result.data as WritingBucketRow[];
    expect(rows.reduce((sum, row) => sum + Number(row.word_count), 0)).toBe(180);
    expect(Object.keys(rows[0]!)).toEqual(
      expect.not.arrayContaining(["body", "title", "body_enc", "title_enc"]),
    );
  });

  it("adapts all time to yearly buckets for a history over two years", async () => {
    const old = new Date();
    old.setUTCFullYear(old.getUTCFullYear() - 3);
    const insert = await alice.from("journal_entries").insert({
      user_id: SEED_USERS.alice.id,
      title: "Old entry",
      body: "four words live here",
      occurred_at: old.toISOString(),
      occurred_offset_minutes: 0,
    });
    expect(insert.error).toBeNull();

    const result = await writingBuckets(alice, null);
    expect(result.error).toBeNull();
    const rows = result.data as WritingBucketRow[];
    expect(rows.every((row) => row.bucket_unit === "year")).toBe(true);
    expect(rows.reduce((sum, row) => sum + Number(row.word_count), 0)).toBe(4);
    expect(rows[0]!.range_start_key).toBe(old.toISOString().slice(0, 10));
  });

  it("keeps callers isolated and rejects unsupported or anonymous requests", async () => {
    await alice.from("journal_entries").insert({
      user_id: SEED_USERS.alice.id,
      title: "Mine",
      body: "four private words here",
    });
    await bob.from("journal_entries").insert({
      user_id: SEED_USERS.bob.id,
      title: "Theirs",
      body: "two words",
    });

    const aliceResult = await writingBuckets(alice, 7);
    const bobResult = await writingBuckets(bob, 7);
    expect(
      (aliceResult.data as WritingBucketRow[]).reduce(
        (sum, row) => sum + Number(row.word_count),
        0,
      ),
    ).toBe(4);
    expect(
      (bobResult.data as WritingBucketRow[]).reduce((sum, row) => sum + Number(row.word_count), 0),
    ).toBe(2);

    expect((await writingBuckets(alice, 14)).error).not.toBeNull();
    expect((await writingBuckets(createAnonClient(), 30)).error).not.toBeNull();
  });
});

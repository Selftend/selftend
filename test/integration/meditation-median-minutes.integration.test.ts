import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, createServiceClient, signInAs } from "./helpers";

// The hero median stat used to take the median over the client's 200-session list query,
// so it silently became a "newest 200 sits" figure for daily meditators (#337). These
// cover the server-side replacement: exactness past the cap, agreement with the
// client-side median(), and per-user scoping under RLS.

async function deleteAllMeditationSessionsForUser(userId: string) {
  const admin = createServiceClient();
  await admin.from("meditation_sessions").delete().eq("user_id", userId);
}

// Insert helper: `completed_at` is spread across days so the rows are ordered the way the
// capped list query would order them (newest first).
function sits(userId: string, durations: number[]) {
  return durations.map((duration, i) => ({
    user_id: userId,
    duration_minutes: duration,
    completed_at: new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString(),
  }));
}

describe("meditation_median_minutes (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllMeditationSessionsForUser(SEED_USERS.alice.id);
    await deleteAllMeditationSessionsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("returns null when the user has no sessions", async () => {
    const result = await alice.rpc("meditation_median_minutes");
    expect(result.error).toBeNull();
    // Null, not zero: "no sits yet" is not "a zero-minute median". The hero renders a dash.
    expect(result.data).toBeNull();
  });

  it("takes the median over every sit, not just the 200 the list query loads", async () => {
    // 250 sits: 150 older 60-minute ones and 100 newer 5-minute ones. Ordered newest
    // first, the capped 200-row window holds all 100 short sits and only 100 of the long
    // ones, so its median is (5 + 60) / 2 = 32.5. Over the real history the 125th and
    // 126th shortest sits are both 60, so the lifetime median is 60 - nearly double.
    const shortSits = sits(
      SEED_USERS.alice.id,
      Array.from({ length: 100 }, () => 5),
    );
    const longSits = sits(
      SEED_USERS.alice.id,
      Array.from({ length: 150 }, () => 60),
    ).map((row, i) => ({
      ...row,
      // Older than every short sit, so the newest-200 window is short-heavy.
      completed_at: new Date(Date.UTC(2025, 0, 1) + i * 3600_000).toISOString(),
    }));
    const insert = await alice.from("meditation_sessions").insert([...longSits, ...shortSits]);
    expect(insert.error).toBeNull();

    // Sanity-check the premise: the capped list really does disagree.
    const capped = await alice
      .from("meditation_sessions")
      .select("duration_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .order("completed_at", { ascending: false })
      .limit(200);
    expect(capped.error).toBeNull();
    const cappedDurations = (capped.data as { duration_minutes: number }[]).map(
      (r) => r.duration_minutes,
    );
    expect(cappedDurations).toHaveLength(200);
    const sorted = [...cappedDurations].sort((a, b) => a - b);
    const cappedMedian = (sorted[99] + sorted[100]) / 2;
    expect(cappedMedian).toBe(32.5);

    const result = await alice.rpc("meditation_median_minutes");
    expect(result.error).toBeNull();
    expect(Number(result.data)).toBe(60);
  });

  it("interpolates an even-count median the way median() does", async () => {
    // Two sits: median() averages the middle pair, and so does percentile_cont.
    const insert = await alice
      .from("meditation_sessions")
      .insert(sits(SEED_USERS.alice.id, [20, 25]));
    expect(insert.error).toBeNull();

    const result = await alice.rpc("meditation_median_minutes");
    expect(result.error).toBeNull();
    // Exact 22.5 - the client rounds it to 23, matching Math.round in median(). Rounding
    // in SQL would break this tie to even and say 22.
    expect(Number(result.data)).toBe(22.5);
    expect(Math.round(Number(result.data))).toBe(23);
  });

  it("returns the middle sit for an odd count", async () => {
    const insert = await alice
      .from("meditation_sessions")
      .insert(sits(SEED_USERS.alice.id, [45, 5, 20]));
    expect(insert.error).toBeNull();

    const result = await alice.rpc("meditation_median_minutes");
    expect(result.error).toBeNull();
    expect(Number(result.data)).toBe(20);
  });

  it("takes the median of only the caller's own sits", async () => {
    // The safety argument for `security invoker`: the RLS policy on meditation_sessions,
    // not the function body, is what confines the aggregate to one user. Alice's own
    // median is 10; a run that saw Bob's sits too would read 90.
    const mine = await alice
      .from("meditation_sessions")
      .insert(sits(SEED_USERS.alice.id, [10, 10, 10]));
    expect(mine.error).toBeNull();
    const theirs = await bob
      .from("meditation_sessions")
      .insert(sits(SEED_USERS.bob.id, [90, 90, 90, 90, 90]));
    expect(theirs.error).toBeNull();

    const aliceMedian = await alice.rpc("meditation_median_minutes");
    expect(aliceMedian.error).toBeNull();
    expect(Number(aliceMedian.data)).toBe(10);

    const bobMedian = await bob.rpc("meditation_median_minutes");
    expect(bobMedian.error).toBeNull();
    expect(Number(bobMedian.data)).toBe(90);
  });

  it("rejects an unauthenticated caller", async () => {
    const anon = createAnonClient();
    const result = await anon.rpc("meditation_median_minutes");
    expect(result.error).not.toBeNull();
  });
});

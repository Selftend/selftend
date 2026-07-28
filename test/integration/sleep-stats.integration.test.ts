import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createAnonClient, deleteAllSleepLogsForUser, signInAs } from "./helpers";

// The sleep tracker's summary figures used to be computed on the device from
// `useSleepLogs(userId, 50)`, so every one of them was really a "newest 50 logs" figure
// (#256). These cover the server-side replacement: exactness past the cap, bucketing by
// the captured civil day rather than the viewer's, and per-user scoping under RLS.

const DAY_MS = 86_400_000;

interface SleepStatsRow {
  avg_duration_minutes_7: string | number | null;
  avg_quality_7: string | number | null;
  avg_duration_minutes_30: string | number | null;
  avg_quality_30: string | number | null;
  quality_counts_30: (string | number)[];
  longest_minutes: number | null;
  shortest_minutes: number | null;
  weekday_avg_minutes: (string | number | null)[];
}

async function stats(client: SupabaseClient, timeZone: string) {
  const result = await client
    .rpc("sleep_stats", { p_time_zone: timeZone })
    .maybeSingle<SleepStatsRow>();
  expect(result.error).toBeNull();
  return result.data!;
}

// `logged_offset_minutes` is sent explicitly so the captured civil day is fixed and the
// test does not depend on where it runs. A null offset is the "never captured" case and
// gets its own test below.
function night(
  userId: string,
  durationMinutes: number,
  quality: number,
  loggedAt: Date,
  offsetMinutes: number | null = 0,
) {
  return {
    user_id: userId,
    duration_minutes: durationMinutes,
    quality,
    notes: "",
    logged_at: loggedAt.toISOString(),
    logged_offset_minutes: offsetMinutes,
  };
}

describe("sleep_stats (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });
  afterEach(async () => {
    await deleteAllSleepLogsForUser(SEED_USERS.alice.id);
    await deleteAllSleepLogsForUser(SEED_USERS.bob.id);
  });
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("returns null averages when the user has no nights", async () => {
    const row = await stats(alice, "UTC");

    // Null, not zero: "nothing logged" is not "a zero-hour night". The screen renders a
    // dash for it. The dense arrays still come back at full length.
    expect(row.avg_duration_minutes_7).toBeNull();
    expect(row.avg_duration_minutes_30).toBeNull();
    expect(row.longest_minutes).toBeNull();
    expect(row.shortest_minutes).toBeNull();
    expect(row.quality_counts_30.map(Number)).toEqual([0, 0, 0, 0, 0]);
    expect(row.weekday_avg_minutes).toEqual([null, null, null, null, null, null, null]);
  });

  it("averages every night in the 30-day window, not just the newest 50 logged", async () => {
    // 70 nights inside the last 18 captured days - four a night, which someone logging
    // naps or split sleep reaches in under three weeks. The 30 newest are short (300
    // min), the 40 older ones long (600 min), so the newest-50 window the list query
    // returns is short-heavy: its average is 420, while the true 30-day average over all
    // 70 is 471.43. The screen used to render 420 under a "Last 30 days" label.
    const now = Date.now();
    const rows = Array.from({ length: 70 }, (_, i) => {
      const short = i < 30;
      return night(
        SEED_USERS.alice.id,
        short ? 300 : 600,
        short ? 2 : 5,
        // Strictly decreasing, so "newest 50" is unambiguous, and always inside 30 days.
        new Date(now - Math.floor(i / 4) * DAY_MS - i * 60_000),
      );
    });
    const insert = await alice.from("sleep_logs").insert(rows);
    expect(insert.error).toBeNull();

    // Sanity-check the premise: the capped list really does disagree.
    const capped = await alice
      .from("sleep_logs")
      .select("duration_minutes")
      .eq("user_id", SEED_USERS.alice.id)
      .order("logged_at", { ascending: false })
      .limit(50);
    expect(capped.error).toBeNull();
    const cappedDurations = (capped.data as { duration_minutes: number }[]).map(
      (r) => r.duration_minutes,
    );
    expect(cappedDurations).toHaveLength(50);
    const cappedAvg = cappedDurations.reduce((sum, d) => sum + d, 0) / cappedDurations.length;
    expect(cappedAvg).toBe(420);

    const row = await stats(alice, "UTC");
    expect(Number(row.avg_duration_minutes_30)).toBeCloseTo(471.428571, 5);
    // What the repository's Math.round makes of it, versus the capped 420 (7.0h).
    expect(Math.round(Number(row.avg_duration_minutes_30))).toBe(471);
    // Quality truncated the same way: 40 fives are past the cap for the capped list.
    expect(row.quality_counts_30.map(Number)).toEqual([0, 30, 0, 0, 40]);
  });

  it("takes the longest and shortest night over the whole history, past the cap", async () => {
    // Both labels name no window, so they read as lifetime figures - but a user's best
    // and worst nights drop out of the capped list as soon as they pass 50 logs.
    const now = Date.now();
    const rows = [
      // The extremes, logged long ago and far outside any 50-row window.
      night(SEED_USERS.alice.id, 720, 5, new Date(now - 400 * DAY_MS)),
      night(SEED_USERS.alice.id, 120, 1, new Date(now - 399 * DAY_MS)),
      ...Array.from({ length: 60 }, (_, i) =>
        night(SEED_USERS.alice.id, 480, 3, new Date(now - i * DAY_MS - 60_000)),
      ),
    ];
    const insert = await alice.from("sleep_logs").insert(rows);
    expect(insert.error).toBeNull();

    const row = await stats(alice, "UTC");
    expect(row.longest_minutes).toBe(720);
    expect(row.shortest_minutes).toBe(120);
    // The 30-day window is unaffected by those two - they are over a year old.
    expect(Number(row.avg_duration_minutes_30)).toBe(480);
  });

  it("buckets a night by the day captured with it, not the day the viewer is having", async () => {
    // 2026-07-20T23:30Z captured at +120 is already the 21st where it was logged. A
    // viewer in UTC reading it as the 20th would move it into another weekday column,
    // which is the class of bug #250/#401 closed.
    const insert = await alice
      .from("sleep_logs")
      .insert([night(SEED_USERS.alice.id, 400, 3, new Date("2026-07-20T23:30:00Z"), 120)]);
    expect(insert.error).toBeNull();

    const row = await stats(alice, "UTC");
    // 2026-07-21 was a Tuesday; index 1 Monday-first. The 20th (index 0) stays empty.
    expect(row.weekday_avg_minutes[0]).toBeNull();
    expect(Number(row.weekday_avg_minutes[1])).toBe(400);
  });

  it("falls back to the viewer's zone only for a night with no captured offset", async () => {
    // Every row predating 20260726 has a null offset, so this is the common path, not an
    // edge case. `entryDayKey` falls back to the viewer's local day for those, and the
    // RPC has to make the same choice - which is what the zone argument is for.
    const insert = await alice
      .from("sleep_logs")
      .insert([night(SEED_USERS.alice.id, 400, 3, new Date("2026-07-20T23:30:00Z"), null)]);
    expect(insert.error).toBeNull();

    // A viewer in UTC sees it on Monday the 20th...
    const utc = await stats(alice, "UTC");
    expect(Number(utc.weekday_avg_minutes[0])).toBe(400);
    expect(utc.weekday_avg_minutes[1]).toBeNull();

    // ...and a viewer in Sofia (+03 in July) sees the same instant on Tuesday the 21st.
    // A zone name rather than a fixed offset is what lets Postgres apply +03 here and
    // +02 to a January night, instead of misbucketing across the DST boundary.
    const sofia = await stats(alice, "Europe/Sofia");
    expect(sofia.weekday_avg_minutes[0]).toBeNull();
    expect(Number(sofia.weekday_avg_minutes[1])).toBe(400);
  });

  it("closes the window on the latest captured day when it is ahead of the viewer", async () => {
    // Mirrors `dayRangeEndKey`: a night logged east of here still counts, rather than
    // falling off the end of a window anchored on the viewer's own today.
    //
    // The gap is forced rather than hoped for. The night is captured at +14:00 and read
    // by a viewer at -12:00, so its civil day is always 26 hours - at least one whole
    // day - ahead of the viewer's. A window that ended on the viewer's today would
    // exclude it outright and report no nights at all.
    const insert = await alice
      .from("sleep_logs")
      .insert([night(SEED_USERS.alice.id, 500, 4, new Date(Date.now() - 60_000), 840)]);
    expect(insert.error).toBeNull();

    const row = await stats(alice, "Etc/GMT+12"); // POSIX sign: this is UTC-12.
    expect(Number(row.avg_duration_minutes_7)).toBe(500);
    expect(Number(row.avg_duration_minutes_30)).toBe(500);
  });

  it("returns the exact average, leaving the .5 tie for the client to round", async () => {
    // 450 and 451 average to 450.5. The RPC must hand that back untouched so the
    // repository's Math.round can take it to 451 the way the client-side
    // averageDurationMinutes() always did; rounding in SQL would break the tie to even.
    const now = Date.now();
    const insert = await alice
      .from("sleep_logs")
      .insert([
        night(SEED_USERS.alice.id, 450, 4, new Date(now - 60_000)),
        night(SEED_USERS.alice.id, 451, 4, new Date(now - 120_000)),
      ]);
    expect(insert.error).toBeNull();

    const row = await stats(alice, "UTC");
    expect(Number(row.avg_duration_minutes_7)).toBe(450.5);
    expect(Math.round(Number(row.avg_duration_minutes_7))).toBe(451);
  });

  it("aggregates only the caller's own nights", async () => {
    // The safety argument for `security invoker`: the RLS policy on sleep_logs_data, not
    // the function body, is what confines these aggregates to one user. Alice averages
    // 300; a run that saw Bob's nights too would read differently.
    const now = Date.now();
    const mine = await alice
      .from("sleep_logs")
      .insert([night(SEED_USERS.alice.id, 300, 2, new Date(now - 60_000))]);
    expect(mine.error).toBeNull();
    const theirs = await bob
      .from("sleep_logs")
      .insert([night(SEED_USERS.bob.id, 900, 5, new Date(now - 60_000))]);
    expect(theirs.error).toBeNull();

    const mineRow = await stats(alice, "UTC");
    expect(Number(mineRow.avg_duration_minutes_30)).toBe(300);
    expect(mineRow.longest_minutes).toBe(300);

    const theirsRow = await stats(bob, "UTC");
    expect(Number(theirsRow.avg_duration_minutes_30)).toBe(900);
    expect(theirsRow.longest_minutes).toBe(900);
  });

  it("rejects an unauthenticated caller", async () => {
    const anon = createAnonClient();
    const result = await anon.rpc("sleep_stats", { p_time_zone: "UTC" });
    expect(result.error).not.toBeNull();
  });

  it("rejects an unknown time zone rather than silently misbucketing", async () => {
    const result = await alice.rpc("sleep_stats", { p_time_zone: "Mars/Olympus" });
    expect(result.error).not.toBeNull();
  });
});

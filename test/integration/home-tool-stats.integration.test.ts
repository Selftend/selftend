import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SEED_USERS,
  createAnonClient,
  deleteAllGratitudeEntriesForUser,
  deleteAllHabitsForUser,
  deleteAllJournalEntriesForUser,
  deleteAllMindfulnessSessionsForUser,
  deleteAllMoodLogsForUser,
  deleteAllSleepLogsForUser,
  createServiceClient,
  signInAs,
} from "./helpers";

/**
 * `home_tool_stats(p_time_zone, p_day, p_grounding_names)` — the one aggregate behind
 * all eight Home tool cards (#2212).
 *
 * Home renders the whole catalogue for everyone, so the eight stat lines used to cost
 * fifteen queries on every cold load, guest included. This is the server side of the
 * replacement, and these tests cover the two things only a real database can show:
 *
 * 1. **Ownership.** `security invoker` means each base table's own RLS policy is what
 *    confines every figure to one user — not the function body. Two seeded users with
 *    different histories must read different numbers.
 * 2. **Parity (ADR-0001's obligation).** Every figure here is also produced by the
 *    tool's own read — a PostgREST head count, or the tool's own RPC — and a stat
 *    expressed twice has to be pinned to itself, or the two drift silently while both
 *    stay plausible.
 */

const DAY_MS = 86_400_000;

/** The grounding slug set, as `src/constants/grounding.ts` holds it. */
const GROUNDING = ["54321", "cold-water", "feet-floor"];

interface StatsRow {
  tool_key: string;
  stats: Record<string, number | string | null>;
}

async function stats(
  client: SupabaseClient,
  options: { timeZone?: string; day?: string; grounding?: string[] } = {},
): Promise<Record<string, Record<string, number | string | null>>> {
  const result = await client.rpc("home_tool_stats", {
    p_time_zone: options.timeZone ?? "UTC",
    p_day: options.day ?? new Date().toISOString().slice(0, 10),
    p_grounding_names: options.grounding ?? GROUNDING,
  });
  expect(result.error).toBeNull();
  const rows = result.data as StatsRow[];
  return Object.fromEntries(rows.map((row) => [row.tool_key, row.stats]));
}

const num = (value: number | string | null | undefined) => Number(value);

describe("home_tool_stats (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
  });

  afterEach(async () => {
    for (const id of [SEED_USERS.alice.id, SEED_USERS.bob.id]) {
      await deleteAllMoodLogsForUser(id);
      await deleteAllJournalEntriesForUser(id);
      await deleteAllGratitudeEntriesForUser(id);
      await deleteAllMindfulnessSessionsForUser(id);
      await deleteAllSleepLogsForUser(id);
      await deleteAllHabitsForUser(id);
      const admin = createServiceClient();
      const { error } = await admin.from("meditation_sessions").delete().eq("user_id", id);
      if (error) throw new Error(`meditation cleanup failed: ${error.message}`);
    }
  });

  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("returns one row per tool, and every one of the eight", async () => {
    const byTool = await stats(alice);

    expect(Object.keys(byTool).sort()).toEqual([
      "breathing",
      "gratitude",
      "grounding",
      "habits",
      "journal",
      "meditation",
      "mood",
      "sleep",
    ]);
  });

  it("reads as empty - never null - for a person with no records at all", async () => {
    // The card renders `Nothing yet` off a zero. A missing row or a null count would
    // reach the client as "not loaded" and draw nothing at all, forever.
    const byTool = await stats(alice);

    expect(num(byTool.mood.lifetimeCount)).toBe(0);
    expect(num(byTool.journal.entries)).toBe(0);
    expect(num(byTool.journal.words)).toBe(0);
    expect(num(byTool.gratitude.entries)).toBe(0);
    expect(num(byTool.breathing.sessions)).toBe(0);
    expect(num(byTool.grounding.sessions)).toBe(0);
    expect(num(byTool.meditation.sits)).toBe(0);
    expect(num(byTool.habits.active)).toBe(0);
    // Null where null is the honest answer: no sits has no median, no nights has no
    // average, no session has no last time.
    expect(byTool.meditation.medianMinutes).toBeNull();
    expect(byTool.sleep.avgDurationMinutes7).toBeNull();
    expect(byTool.grounding.lastCompletedAt).toBeNull();
  });

  /**
   * ☠️ **The safety argument for `security invoker`.** The RLS policy on each base
   * table, not this function's body, is what confines the figures to one caller. A
   * run that saw Bob's rows would read differently — and every number would look
   * perfectly plausible while wrong.
   */
  it("aggregates only the caller's own rows", async () => {
    const mine = await alice
      .from("mood_logs")
      .insert([{ user_id: SEED_USERS.alice.id, mood_score: 3 }]);
    expect(mine.error).toBeNull();
    const theirs = await bob.from("mood_logs").insert([
      { user_id: SEED_USERS.bob.id, mood_score: 5 },
      { user_id: SEED_USERS.bob.id, mood_score: 5 },
      { user_id: SEED_USERS.bob.id, mood_score: 5 },
    ]);
    expect(theirs.error).toBeNull();
    const journal = await bob
      .from("journal_entries")
      .insert([{ user_id: SEED_USERS.bob.id, title: "Theirs", body: "four whole little words" }]);
    expect(journal.error).toBeNull();

    const mineStats = await stats(alice);
    const theirsStats = await stats(bob);

    expect(num(mineStats.mood.lifetimeCount)).toBe(1);
    expect(num(theirsStats.mood.lifetimeCount)).toBe(3);
    // Alice sees none of Bob's words, and Bob's own leg is not zero - so this is
    // isolation rather than the function simply returning nothing.
    expect(num(mineStats.journal.words)).toBe(0);
    expect(num(theirsStats.journal.words)).toBe(4);
  });

  it("rejects an unauthenticated caller", async () => {
    const anon = createAnonClient();
    const result = await anon.rpc("home_tool_stats", {
      p_time_zone: "UTC",
      p_day: "2026-09-04",
      p_grounding_names: GROUNDING,
    });
    expect(result.error).not.toBeNull();
  });

  it("rejects an unknown time zone rather than silently misbucketing", async () => {
    const result = await alice.rpc("home_tool_stats", {
      p_time_zone: "Mars/Olympus",
      p_day: "2026-09-04",
      p_grounding_names: GROUNDING,
    });
    expect(result.error).not.toBeNull();
  });

  describe("parity with each tool's own read", () => {
    it("counts check-ins, journal entries and gratitude entries exactly as the head counts do", async () => {
      const rows = Array.from({ length: 60 }, (_, i) => ({
        user_id: SEED_USERS.alice.id,
        mood_score: (i % 5) + 1,
        logged_at: new Date(Date.now() - i * DAY_MS).toISOString(),
        logged_offset_minutes: 0,
      }));
      expect((await alice.from("mood_logs").insert(rows)).error).toBeNull();
      expect(
        (
          await alice.from("journal_entries").insert(
            Array.from({ length: 55 }, (_, i) => ({
              user_id: SEED_USERS.alice.id,
              title: `E${i}`,
              body: "three little words",
            })),
          )
        ).error,
      ).toBeNull();
      expect(
        (
          await alice.from("gratitude_entries").insert(
            Array.from({ length: 12 }, () => ({
              user_id: SEED_USERS.alice.id,
              item_1: "Coffee",
            })),
          )
        ).error,
      ).toBeNull();

      const byTool = await stats(alice);

      // The exact head counts the tool screens use - well past the 50-row list caps
      // that made these figures wrong before ADR-0001.
      const moodCount = await alice
        .from("mood_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", SEED_USERS.alice.id);
      const journalCount = await alice
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", SEED_USERS.alice.id);
      const gratitudeCount = await alice
        .from("gratitude_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", SEED_USERS.alice.id);

      expect(num(byTool.mood.lifetimeCount)).toBe(moodCount.count);
      expect(num(byTool.journal.entries)).toBe(journalCount.count);
      expect(num(byTool.gratitude.entries)).toBe(gratitudeCount.count);
      // And the word total is the tool's own RPC, not a second implementation of it.
      const words = await alice.rpc("journal_word_total");
      expect(num(byTool.journal.words)).toBe(Number(words.data));
      expect(num(byTool.journal.words)).toBe(165);
    });

    it("takes the meditation median and the sleep averages from the tools' own functions", async () => {
      const now = Date.now();
      expect(
        (
          await alice.from("meditation_sessions").insert([
            {
              user_id: SEED_USERS.alice.id,
              duration_minutes: 10,
              completed_at: new Date(now - DAY_MS).toISOString(),
            },
            {
              user_id: SEED_USERS.alice.id,
              duration_minutes: 21,
              completed_at: new Date(now - 2 * DAY_MS).toISOString(),
            },
            {
              user_id: SEED_USERS.alice.id,
              duration_minutes: 30,
              completed_at: new Date(now - 3 * DAY_MS).toISOString(),
            },
          ])
        ).error,
      ).toBeNull();
      expect(
        (
          await alice.from("sleep_logs").insert([
            {
              user_id: SEED_USERS.alice.id,
              duration_minutes: 450,
              quality: 4,
              notes: "",
              logged_at: new Date(now - DAY_MS).toISOString(),
              logged_offset_minutes: 0,
            },
            {
              user_id: SEED_USERS.alice.id,
              duration_minutes: 451,
              quality: 3,
              notes: "",
              logged_at: new Date(now - 2 * DAY_MS).toISOString(),
              logged_offset_minutes: 0,
            },
          ])
        ).error,
      ).toBeNull();

      const byTool = await stats(alice);
      const median = await alice.rpc("meditation_median_minutes");
      const sleep = await alice.rpc("sleep_stats", { p_time_zone: "UTC" }).maybeSingle();

      expect(num(byTool.meditation.medianMinutes)).toBe(Number(median.data));
      expect(num(byTool.meditation.medianMinutes)).toBe(21);
      const sleepRow = sleep.data as { avg_duration_minutes_7: number; avg_quality_7: number };
      expect(num(byTool.sleep.avgDurationMinutes7)).toBe(Number(sleepRow.avg_duration_minutes_7));
      // Exact and UNROUNDED, so the client's Math.round breaks the .5 tie upward the
      // way `sleepStats()` always did; rounding in SQL would tie it to even.
      expect(num(byTool.sleep.avgDurationMinutes7)).toBe(450.5);
      expect(num(byTool.sleep.avgQuality7)).toBe(Number(sleepRow.avg_quality_7));
    });

    it("splits breathing from grounding by exercise name, the way both tools do", async () => {
      const now = Date.now();
      const session = (name: string, minutes: number, agoMs = 0) => ({
        user_id: SEED_USERS.alice.id,
        exercise_name: name,
        duration_minutes: minutes,
        completed_at: new Date(now - agoMs).toISOString(),
        completed_offset_minutes: 0,
      });
      expect(
        (
          await alice.from("mindfulness_sessions").insert([
            session("box-breathing", 5, 3 * DAY_MS),
            session("478", 7, 2 * DAY_MS),
            // A custom pattern's session carries the pattern's id as its name, which
            // is why breathing counts by EXCLUSION rather than by a slug list.
            session("8e2d1f16-0000-4000-8000-000000000001", 3, DAY_MS),
            session("54321", 4, 4 * DAY_MS),
            session("feet-floor", 6, 60_000),
          ])
        ).error,
      ).toBeNull();

      const byTool = await stats(alice);
      const breathingMinutes = await alice.rpc("breathing_total_minutes", {
        excluded_names: GROUNDING,
      });

      expect(num(byTool.breathing.sessions)).toBe(3);
      expect(num(byTool.breathing.minutes)).toBe(Number(breathingMinutes.data));
      expect(num(byTool.breathing.minutes)).toBe(15);
      expect(num(byTool.grounding.sessions)).toBe(2);
      // Recency is the NEWEST grounding session, with its own captured offset beside
      // it - the card formats the instant, it never computes "N days ago".
      expect(byTool.grounding.lastCompletedAt).toBe(new Date(now - 60_000).toISOString());
      expect(num(byTool.grounding.lastCompletedOffsetMinutes)).toBe(0);
    });

    it("counts the calendar week and the trailing average the way the check-in screen does", async () => {
      // 2026-05-28 is a Thursday; its Monday is the 25th. Two entries inside that week,
      // one the Sunday before it - which belongs to the trailing 7 days but NOT to the
      // calendar week. The two windows differ on purpose (#697), and this is the row
      // that tells them apart.
      const at = (day: string) => `${day}T12:00:00.000Z`;
      const entry = (day: string, score: number) => ({
        user_id: SEED_USERS.alice.id,
        mood_score: score,
        logged_at: at(day),
        logged_offset_minutes: 0,
      });
      expect(
        (
          await alice.from("mood_logs").insert([
            entry("2026-05-25", 4),
            entry("2026-05-28", 2),
            entry("2026-05-24", 5),
            // Well outside both windows, but inside the lifetime count.
            entry("2026-01-01", 1),
          ])
        ).error,
      ).toBeNull();

      const byTool = await stats(alice, { day: "2026-05-28" });

      expect(num(byTool.mood.lifetimeCount)).toBe(4);
      // Mon 25th through Sun 31st: the 25th and the 28th.
      expect(num(byTool.mood.thisWeekCount)).toBe(2);
      // Trailing seven days ending on the 28th: the 24th, 25th and 28th -> 11/3.
      expect(num(byTool.mood.avg7)).toBeCloseTo(11 / 3, 6);
    });

    it("buckets a check-in by the day captured with it, not the viewer's", async () => {
      // 2026-05-24T23:30Z captured at +120 is already the 25th where it was logged, so
      // it belongs to the calendar week starting that Monday. A viewer in UTC reading
      // it as the 24th would drop it - the class of bug #250/#401 closed.
      expect(
        (
          await alice.from("mood_logs").insert([
            {
              user_id: SEED_USERS.alice.id,
              mood_score: 3,
              logged_at: "2026-05-24T23:30:00.000Z",
              logged_offset_minutes: 120,
            },
          ])
        ).error,
      ).toBeNull();

      const byTool = await stats(alice, { day: "2026-05-28", timeZone: "UTC" });
      expect(num(byTool.mood.thisWeekCount)).toBe(1);
    });

    it("falls back to the viewer's zone only for a row with no captured offset", async () => {
      // Every row predating 20260726 has a null offset, so this is the common path.
      // `entryDayKey` falls back to the viewer's local day for those, and the RPC has
      // to make the same choice - which is what the zone argument is for.
      expect(
        (
          await alice.from("gratitude_entries").insert([
            {
              user_id: SEED_USERS.alice.id,
              item_1: "Late night",
              logged_at: "2026-05-24T23:30:00.000Z",
              logged_offset_minutes: null,
            },
          ])
        ).error,
      ).toBeNull();

      // In UTC the entry is Sunday the 24th - the week before.
      const utc = await stats(alice, { day: "2026-05-28", timeZone: "UTC" });
      expect(num(utc.gratitude.thisWeek)).toBe(0);
      // In Sofia (+03 in May) the same instant is Monday the 25th - inside the week.
      const sofia = await stats(alice, { day: "2026-05-28", timeZone: "Europe/Sofia" });
      expect(num(sofia.gratitude.thisWeek)).toBe(1);
      // The lifetime count never depends on the frame.
      expect(num(utc.gratitude.entries)).toBe(1);
      expect(num(sofia.gratitude.entries)).toBe(1);
    });

    it("counts habits due and ticked on the day asked for, the way isScheduledOn does", async () => {
      // 2026-05-28 is a Thursday (JS day 4). Daily habits are due; a Sundays-only one is
      // not; an archived one is not active at all.
      const habit = (name: string, cadence: string, customDays: number[] = []) => ({
        user_id: SEED_USERS.alice.id,
        name,
        kind: "build",
        cadence,
        custom_days: customDays,
      });
      const inserted = await alice
        .from("habits")
        .insert([
          habit("Daily one", "daily"),
          habit("Daily two", "daily"),
          habit("Sundays", "custom", [0]),
        ])
        .select("id, name");
      expect(inserted.error).toBeNull();
      const rows = inserted.data as { id: string; name: string }[];
      const daily = rows.find((row) => row.name === "Daily one")!;
      expect(
        (
          await alice
            .from("habit_logs")
            .insert([{ user_id: SEED_USERS.alice.id, habit_id: daily.id, logged_on: "2026-05-28" }])
        ).error,
      ).toBeNull();

      const byTool = await stats(alice, { day: "2026-05-28" });

      expect(num(byTool.habits.active)).toBe(3);
      expect(num(byTool.habits.dueToday)).toBe(2);
      expect(num(byTool.habits.doneToday)).toBe(1);

      // On the Sunday the custom habit is due and the ticked daily one is not ticked.
      const sunday = await stats(alice, { day: "2026-05-31" });
      expect(num(sunday.habits.dueToday)).toBe(3);
      expect(num(sunday.habits.doneToday)).toBe(0);
    });

    it("counts weekday habits Monday to Friday only", async () => {
      const inserted = await alice
        .from("habits")
        .insert([
          { user_id: SEED_USERS.alice.id, name: "Weekdays", kind: "build", cadence: "weekdays" },
        ]);
      expect(inserted.error).toBeNull();

      // Thursday, then Saturday and Sunday.
      expect(num((await stats(alice, { day: "2026-05-28" })).habits.dueToday)).toBe(1);
      expect(num((await stats(alice, { day: "2026-05-30" })).habits.dueToday)).toBe(0);
      expect(num((await stats(alice, { day: "2026-05-31" })).habits.dueToday)).toBe(0);
    });

    it("does not count an archived habit as active", async () => {
      const inserted = await alice
        .from("habits")
        .insert([
          {
            user_id: SEED_USERS.alice.id,
            name: "Retired",
            kind: "build",
            cadence: "daily",
            archived_at: new Date().toISOString(),
          },
        ])
        .select("id");
      expect(inserted.error).toBeNull();

      const byTool = await stats(alice, { day: "2026-05-28" });
      expect(num(byTool.habits.active)).toBe(0);
      expect(num(byTool.habits.dueToday)).toBe(0);
    });
  });
});

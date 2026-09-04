import type { SupabaseClient } from "@supabase/supabase-js";

import { entryDayKey } from "@/src/lib/occurrence-time";

import {
  SEED_USERS,
  createAnonClient,
  createServiceClient,
  deleteAllActivityLogsForUser,
  deleteAllGratitudeEntriesForUser,
  deleteAllHabitsForUser,
  deleteAllJournalEntriesForUser,
  deleteAllMindfulnessSessionsForUser,
  deleteAllMoodLogsForUser,
  deleteAllSelfCareLogsForUser,
  deleteAllSleepLogsForUser,
  deleteAllThoughtRecordsForUser,
  runSql,
  signInAs,
} from "./helpers";

// `record_days(p_fallback_offset_minutes)` answers "which days does this person
// have any record on?" across the whole product, over all time (#1904).
//
// The ADR-0001 parity test lives here: the RPC's day keys must equal
// `entryDayKey`'s (src/lib/occurrence-time.ts) over the same rows, INCLUDING the
// null-offset fallback. Every fixture below is therefore declared as the exact
// pair the owning module hands `entryDayKey` to produce its own `dayKey` - which
// for a windowed sleep entry is the WINDOW'S START, not `logged_at`.
//
// ☠️ Every fixture also lands on a day of its own, and each source contributes
// BOTH a captured-offset row and a never-captured one. That is not decoration:
// an earlier draft gave two sources the same instant, and deleting one source's
// fallback arm left the day standing (produced by the other) with the parity
// test still green. One source, one day, or a mutant survives.

const ALICE = SEED_USERS.alice.id;

/** Minutes east of UTC. Non-whole-hour and non-UTC on purpose: under a plain UTC
 *  frame the fallback and captured-offset paths collapse into the same answer and
 *  these tests would pass against a broken implementation, and a whole-hour frame
 *  hides 30-minute arithmetic. (The same reasoning pins jest.config.js to
 *  Asia/Kolkata; jest.integration.config.js does not pin TZ, so the frame is
 *  passed explicitly here rather than read from the runner's clock.) */
const KOLKATA = 330;
const PACIFIC = -480;

type SourceName =
  | "mood"
  | "gratitude"
  | "journal"
  | "sleep"
  | "meditation"
  | "mindfulness"
  | "activity"
  | "thoughtRecord";

/**
 * One fixture row, described the way the CLIENT describes it: the occurrence
 * instant and the offset captured with it, `null` meaning "never captured".
 */
interface Fixture {
  source: SourceName;
  occurredAt: string;
  capturedOffsetMinutes: number | null;
}

// Rows whose day is fixed by the frame captured at logging time. Each lands on
// its own civil day, and the two offset signs alternate so neither is a
// coincidence. 20:00Z is one civil day at +05:30 (01:30 the next morning) and
// another at -08:00 (noon the same day).
const CAPTURED: Fixture[] = [
  { source: "mood", occurredAt: "2026-03-01T20:00:00.000Z", capturedOffsetMinutes: KOLKATA },
  { source: "gratitude", occurredAt: "2026-03-03T20:00:00.000Z", capturedOffsetMinutes: PACIFIC },
  { source: "journal", occurredAt: "2026-03-05T20:00:00.000Z", capturedOffsetMinutes: KOLKATA },
  { source: "sleep", occurredAt: "2026-03-07T20:00:00.000Z", capturedOffsetMinutes: PACIFIC },
  { source: "meditation", occurredAt: "2026-03-09T20:00:00.000Z", capturedOffsetMinutes: KOLKATA },
  { source: "mindfulness", occurredAt: "2026-03-11T20:00:00.000Z", capturedOffsetMinutes: PACIFIC },
  { source: "activity", occurredAt: "2026-03-13T20:00:00.000Z", capturedOffsetMinutes: KOLKATA },
  {
    source: "thoughtRecord",
    occurredAt: "2026-03-15T20:00:00.000Z",
    capturedOffsetMinutes: PACIFIC,
  },
];

// The legacy tail 20260726_occurrence_offset_nullable left behind, plus every
// row written by a client predating its table's offset column. These are the
// ONLY rows the passed-in frame touches, and one per source so a fallback arm
// cannot be deleted from one leg and covered by another.
//
// Every other day, deliberately: at 20:00Z these fall on day+1 under +05:30 and
// on the day itself under -08:00, so the two frames produce DISJOINT sets and
// "which days moved" is answerable. Consecutive days would overlap after the
// shift and the frame test would compare almost-identical sets.
const LEGACY: Fixture[] = [
  { source: "mood", occurredAt: "2026-04-01T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "gratitude", occurredAt: "2026-04-03T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "journal", occurredAt: "2026-04-05T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "sleep", occurredAt: "2026-04-07T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "meditation", occurredAt: "2026-04-09T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "mindfulness", occurredAt: "2026-04-11T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "activity", occurredAt: "2026-04-13T20:00:00.000Z", capturedOffsetMinutes: null },
  { source: "thoughtRecord", occurredAt: "2026-04-15T20:00:00.000Z", capturedOffsetMinutes: null },
];

// A windowed sleep entry belongs to the civil day at SLEEP START (#800) - the
// night before the morning it was logged on.
const WINDOW_START = "2026-03-17T22:30:00.000Z";
const WINDOW_END = "2026-03-18T06:30:00.000Z";
const WINDOW_LOGGED_AT = "2026-03-18T07:00:00.000Z";
const WINDOWED_SLEEP: Fixture = {
  source: "sleep",
  occurredAt: WINDOW_START,
  capturedOffsetMinutes: 0,
};
/** The day `logged_at` would have produced. Nothing else touches it, so its
 *  absence is unambiguous. */
const WINDOW_WRONG_DAY = "2026-03-18";

// Plaintext civil dates: no timestamp, no offset, no frame question at all.
const HABIT_DAY = "2026-03-21";
const SELF_CARE_DAY = "2026-03-23";

// One day carrying records from two different tools, so "distinct by day" has
// something to be distinct about. Kept off every other fixture's day.
const SHARED_DAY = "2026-03-25";
const SHARED_DAY_MOOD_AT = "2026-03-25T06:00:00.000Z"; // 06:00 UTC, offset 0

// Rows that must contribute NOTHING, each on a day nothing else touches.
const SCHEDULED_ONLY_AT = "2026-05-01T10:00:00.000Z"; // planned, never done
const ARCHIVED_AT = "2026-05-02T10:00:00.000Z"; // archived thought record

/**
 * What `entryDayKey` says about the whole fixture set under one viewer frame -
 * the expected side of the parity assertion.
 *
 * The frame stands in only where no offset was captured, which is precisely
 * `entryDayKey`'s own fallback ("the viewer's local day"), expressed as the one
 * frame the client passes in. The two can differ by a day for a legacy row on
 * the far side of a DST boundary from the viewer's current reading; that is
 * inherent to the client-passed frame (`program_widget_task_status` carries the
 * same property), and is why the frame is written explicitly here rather than
 * read from the runner's clock.
 */
function expectedDays(frameOffsetMinutes: number): string[] {
  const fromTimestamps = [...CAPTURED, ...LEGACY, WINDOWED_SLEEP].map((fixture) =>
    entryDayKey(fixture.occurredAt, fixture.capturedOffsetMinutes ?? frameOffsetMinutes),
  );
  return [...new Set([...fromTimestamps, HABIT_DAY, SELF_CARE_DAY, SHARED_DAY])].sort();
}

function dayOf(fixture: Fixture, frameOffsetMinutes: number): string {
  return entryDayKey(fixture.occurredAt, fixture.capturedOffsetMinutes ?? frameOffsetMinutes);
}

async function recordDays(client: SupabaseClient, frameOffsetMinutes: number): Promise<string[]> {
  const { data, error } = await client.rpc("record_days", {
    p_fallback_offset_minutes: frameOffsetMinutes,
  });
  expect(error).toBeNull();
  return (data ?? []) as string[];
}

async function clearAlice() {
  await Promise.all([
    deleteAllMoodLogsForUser(ALICE),
    deleteAllGratitudeEntriesForUser(ALICE),
    deleteAllJournalEntriesForUser(ALICE),
    deleteAllSleepLogsForUser(ALICE),
    deleteAllMindfulnessSessionsForUser(ALICE),
    deleteAllActivityLogsForUser(ALICE),
    deleteAllThoughtRecordsForUser(ALICE),
    deleteAllSelfCareLogsForUser(ALICE),
    deleteAllHabitsForUser(ALICE),
  ]);
  const admin = createServiceClient();
  const { error } = await admin.from("meditation_sessions").delete().eq("user_id", ALICE);
  if (error) throw new Error(`meditation cleanup failed: ${error.message}`);
}

function rowsFor(source: SourceName): Fixture[] {
  return [...CAPTURED, ...LEGACY].filter((fixture) => fixture.source === source);
}

/** Writes every fixture above, plus the two rows that must not count. */
async function seedEveryTool(client: SupabaseClient) {
  const inserts = [
    client.from("mood_logs").insert([
      ...rowsFor("mood").map((f) => ({
        user_id: ALICE,
        mood_score: 4,
        logged_at: f.occurredAt,
        logged_offset_minutes: f.capturedOffsetMinutes,
      })),
      // The second tool on SHARED_DAY.
      {
        user_id: ALICE,
        mood_score: 3,
        logged_at: SHARED_DAY_MOOD_AT,
        logged_offset_minutes: 0,
      },
    ]),
    client.from("gratitude_entries").insert(
      rowsFor("gratitude").map((f) => ({
        user_id: ALICE,
        item_1: "Sunlight",
        logged_at: f.occurredAt,
        logged_offset_minutes: f.capturedOffsetMinutes,
      })),
    ),
    client.from("journal_entries").insert(
      rowsFor("journal").map((f) => ({
        user_id: ALICE,
        title: "A page",
        body: "Some words",
        occurred_at: f.occurredAt,
        occurred_offset_minutes: f.capturedOffsetMinutes,
      })),
    ),
    client.from("meditation_sessions").insert(
      rowsFor("meditation").map((f) => ({
        user_id: ALICE,
        duration_minutes: 10,
        completed_at: f.occurredAt,
        completed_offset_minutes: f.capturedOffsetMinutes,
      })),
    ),
    client.from("mindfulness_sessions").insert(
      rowsFor("mindfulness").map((f) => ({
        user_id: ALICE,
        exercise_name: "box-breathing",
        duration_minutes: 3,
        completed_at: f.occurredAt,
        completed_offset_minutes: f.capturedOffsetMinutes,
      })),
    ),
    client.from("activity_logs").insert([
      ...rowsFor("activity").map((f) => ({
        user_id: ALICE,
        activity_name: "A walk",
        category: "pleasure",
        completed_at: f.occurredAt,
        completed_offset_minutes: f.capturedOffsetMinutes,
      })),
      // Scheduled but never completed: planning is not a record of doing.
      {
        user_id: ALICE,
        activity_name: "A call I never made",
        category: "mastery",
        scheduled_at: SCHEDULED_ONLY_AT,
        scheduled_offset_minutes: KOLKATA,
      },
    ]),
    client.from("thought_records").insert([
      ...rowsFor("thoughtRecord").map((f) => ({
        user_id: ALICE,
        situation: "A live record",
        created_at: f.occurredAt,
        created_offset_minutes: f.capturedOffsetMinutes,
      })),
      // Archiving is this tool's delete; a removed record leaves no mark.
      {
        user_id: ALICE,
        situation: "A record I deleted",
        created_at: ARCHIVED_AT,
        created_offset_minutes: KOLKATA,
        archived_at: ARCHIVED_AT,
      },
    ]),
    client.from("sleep_logs").insert([
      // Duration-only entries keep the captured-day calculation.
      ...rowsFor("sleep").map((f) => ({
        user_id: ALICE,
        duration_minutes: 400,
        quality: 3,
        notes: "",
        logged_at: f.occurredAt,
        logged_offset_minutes: f.capturedOffsetMinutes,
      })),
      // Windowed: logged on the morning of the 18th, about a night that began
      // on the 17th.
      {
        user_id: ALICE,
        duration_minutes: 480,
        quality: 4,
        notes: "",
        logged_at: WINDOW_LOGGED_AT,
        logged_offset_minutes: 0,
        sleep_window: JSON.stringify({
          startedAt: WINDOW_START,
          startedOffsetMinutes: WINDOWED_SLEEP.capturedOffsetMinutes,
          endedAt: WINDOW_END,
          endedOffsetMinutes: 0,
        }),
      },
    ]),
    client.from("self_care_logs").insert([
      { user_id: ALICE, log_date: SELF_CARE_DAY },
      { user_id: ALICE, log_date: SHARED_DAY },
    ]),
  ];

  for (const result of await Promise.all(inserts)) {
    expect(result.error).toBeNull();
  }

  const habit = await client
    .from("habits")
    .insert({ user_id: ALICE, name: "Walk", kind: "build", cadence: "daily" })
    .select("id")
    .single();
  expect(habit.error).toBeNull();
  const log = await client
    .from("habit_logs")
    .insert({ user_id: ALICE, habit_id: habit.data!.id, logged_on: HABIT_DAY });
  expect(log.error).toBeNull();
}

describe("record_days (integration)", () => {
  let alice: SupabaseClient;
  let bob: SupabaseClient;

  beforeAll(async () => {
    [alice, bob] = await Promise.all([signInAs("alice"), signInAs("bob")]);
    await clearAlice();
  });
  afterEach(clearAlice);
  afterAll(async () => {
    await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
  });

  it("returns nothing when the person has no record at all", async () => {
    expect(await recordDays(alice, KOLKATA)).toEqual([]);
  });

  // === The ADR-0001 parity test =========================================
  it("agrees with entryDayKey over every source, including the null-offset fallback", async () => {
    await seedEveryTool(alice);

    expect(await recordDays(alice, KOLKATA)).toEqual(expectedDays(KOLKATA));
  });

  it.each(CAPTURED)("carries $source's captured day, whatever the viewer's frame", async (f) => {
    await seedEveryTool(alice);

    // The captured frame decides, so the same day appears under both viewers.
    const day = dayOf(f, KOLKATA);
    expect(await recordDays(alice, KOLKATA)).toContain(day);
    expect(await recordDays(alice, PACIFIC)).toContain(day);
  });

  it.each(LEGACY)("files $source's never-captured row in the viewer's frame", async (f) => {
    await seedEveryTool(alice);

    expect(await recordDays(alice, KOLKATA)).toContain(dayOf(f, KOLKATA));
    expect(await recordDays(alice, PACIFIC)).toContain(dayOf(f, PACIFIC));
  });

  it("agrees under a second frame, and moves ONLY the rows that captured none", async () => {
    await seedEveryTool(alice);

    const kolkata = await recordDays(alice, KOLKATA);
    const pacific = await recordDays(alice, PACIFIC);

    expect(pacific).toEqual(expectedDays(PACIFIC));
    expect(kolkata.filter((day) => !pacific.includes(day)).sort()).toEqual(
      [...new Set(LEGACY.map((f) => dayOf(f, KOLKATA)))].sort(),
    );
    expect(pacific.filter((day) => !kolkata.includes(day)).sort()).toEqual(
      [...new Set(LEGACY.map((f) => dayOf(f, PACIFIC)))].sort(),
    );
  });

  it("yields one key for a day carrying records from several tools", async () => {
    await seedEveryTool(alice);

    const days = await recordDays(alice, KOLKATA);
    // A check-in and a self-care log both land on SHARED_DAY: two records, one
    // mark - exactly like a day with one record.
    expect(days.filter((day) => day === SHARED_DAY)).toEqual([SHARED_DAY]);
    expect(new Set(days).size).toBe(days.length);
  });

  it("files a windowed sleep entry on the night it began, not the morning it was logged", async () => {
    await seedEveryTool(alice);

    const days = await recordDays(alice, KOLKATA);
    // #800: the entry belongs to the civil day at sleep start, which is where the
    // sleep screen itself renders it. Reading `logged_at` would say the 18th.
    expect(days).toContain(dayOf(WINDOWED_SLEEP, KOLKATA));
    expect(days).not.toContain(WINDOW_WRONG_DAY);
  });

  it("counts an activity only once it is done, and drops an archived thought record", async () => {
    await seedEveryTool(alice);

    const days = await recordDays(alice, KOLKATA);
    expect(days).not.toContain(entryDayKey(SCHEDULED_ONLY_AT, KOLKATA));
    expect(days).not.toContain(entryDayKey(ARCHIVED_AT, KOLKATA));
  });

  it("returns days ascending, so the axis can anchor on the first record", async () => {
    await seedEveryTool(alice);

    const days = await recordDays(alice, KOLKATA);
    expect(days).toEqual([...days].sort());
    expect(days[0]).toBe(dayOf(CAPTURED[0], KOLKATA));
  });

  // === security invoker ==================================================
  it("never shows one person the other's days", async () => {
    await seedEveryTool(alice);
    const alicesDays = await recordDays(alice, KOLKATA);
    const bobsDays = await recordDays(bob, KOLKATA);

    // Bob carries his own seeded fixtures, so assert on the sentinel days alice
    // just wrote rather than on emptiness.
    expect(alicesDays).not.toEqual([]);
    for (const day of alicesDays) {
      expect(bobsDays).not.toContain(day);
    }
  });

  it("is declared security invoker and stable", () => {
    // Asserted against the catalogue, not inferred from behaviour: every leg also
    // carries its own `user_id = uid` predicate (it is what lets the per-user
    // indexes serve the scan), so a `security definer` slip would still return
    // the right rows and the leak test above would stay green. RLS is the second
    // lock, and this is the only thing that can see it is fitted.
    const row = runSql(
      "select prosecdef, provolatile from pg_proc " +
        "where oid = 'public.record_days(integer)'::regprocedure;",
    );
    expect(row).toBe("f|s");
  });

  it("refuses an unauthenticated caller", async () => {
    // Two shapes. The anon key has no EXECUTE grant at all; the service role has
    // one via `postgres` but carries no auth.uid(), which is exactly the shape a
    // leak would take - there the guard, not the grant, has to stop it.
    const anon = await createAnonClient().rpc("record_days", {
      p_fallback_offset_minutes: KOLKATA,
    });
    expect(anon.error).not.toBeNull();

    const admin = await createServiceClient().rpc("record_days", {
      p_fallback_offset_minutes: KOLKATA,
    });
    expect(admin.error).not.toBeNull();
  });

  it("rejects a frame outside the offsets the columns themselves allow", async () => {
    for (const frame of [841, -841]) {
      const { error } = await alice.rpc("record_days", { p_fallback_offset_minutes: frame });
      expect(error).not.toBeNull();
    }
    const missing = await alice.rpc("record_days", { p_fallback_offset_minutes: null });
    expect(missing.error).not.toBeNull();
  });
});

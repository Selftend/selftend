// Seed the LOCAL demo account (demo@test.local) with ~3 months of realistic
// data across the eight tools, the CBT module and the ACT practice logs, so
// redesigned surfaces can be reviewed with real density: paging, heatmap depth,
// distribution spread, week history, and every technique, status and category
// variant rendered at least once.
//
// Usage:  node scripts/seed-demo-data.mjs
//
// - Local Supabase only (hardcoded local dev keys, same as test/integration/
//   helpers.ts). Never points at staging or prod.
// - Re-runnable: wipes the demo user's rows in the seeded tables first, then
//   inserts a deterministic dataset (seeded PRNG), so re-seeding after a
//   `supabase db reset` reproduces the same picture.
// - Inserts go through the PLAINTEXT VIEWS (mood_logs, sleep_logs, …) so the
//   encryption layer does its own work — never the *_data base tables.
// - Run `npx supabase migration up` first if the stack has been reset.

import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const LOCAL_SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Must match supabase/seed.sql (the `demo` seed user).
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000003";

// Read the live policy version so the consent gate never fires for the demo
// account regardless of when this script runs.
const policySource = fs.readFileSync(
  path.join(process.cwd(), "src/features/policies/policy-content.ts"),
  "utf8",
);
const policyVersion = policySource.match(/policyVersion = "([^"]+)"/)?.[1];
if (!policyVersion) throw new Error("Could not read policyVersion from policy-content.ts");

// Deterministic PRNG (mulberry32) — same data on every run.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(879883);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const chance = (p) => rng() < p;
const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// The seeded window: ~3 months ending today. `new Date()` is fine here — the
// script runs in plain Node, and the dataset should always end "today".
const DAYS = 89;
const end = new Date();
end.setHours(12, 0, 0, 0);

// Run early in the day and today's later entries would land in the future,
// tripping the DB's occurrence-time guard ("Occurrence time cannot be in the
// future") and failing the whole seed. Clamp to just-passed instead — today's
// rows bunch up near "now", which only shows when seeding at odd hours and
// only on today's rows. The margin absorbs the clock drift between building a
// row here and the database checking it.
const FUTURE_MARGIN_MS = 120_000;

function clampToPast(millis) {
  return new Date(Math.min(millis, Date.now() - FUTURE_MARGIN_MS)).toISOString();
}

/** The calendar date at day index i (0 = oldest), as a machine-local Date. */
function dayAt(dayIndex) {
  const d = new Date(end);
  d.setDate(d.getDate() - (DAYS - 1 - dayIndex));
  return d;
}

/** Local-civil-day at index i (0 = oldest), at local hour/minute. */
function at(dayIndex, hour, minute = 0) {
  const d = dayAt(dayIndex);
  d.setHours(hour, minute, 0, 0);
  return clampToPast(d.getTime());
}

/**
 * The seeding machine's civil date at day index i, as `YYYY-MM-DD`.
 *
 * For the date-typed columns — `self_care_logs.log_date`,
 * `core_beliefs.next_review_date` — which are a calendar day rather than an
 * instant. Built from the LOCAL getters, never by slicing an ISO string: an
 * evening timestamp west of Greenwich serialises to the following UTC date, so
 * `at(d, 21).slice(0, 10)` files the row on the wrong day on half the planet.
 *
 * Accepts indices past the end of the window, which is how a review date lands
 * in the future.
 */
function dayKeyAt(dayIndex) {
  return localDayKey(dayAt(dayIndex));
}

/** A `Date`'s civil day as `YYYY-MM-DD`, read off the LOCAL getters. */
function localDayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * A civil day AFTER today, at local hour/minute.
 *
 * The one thing `at()` cannot express, because it clamps every timestamp into
 * the past — everything else this script writes records something that already
 * happened. A SCHEDULED activity is the exception: planning ahead is what
 * behavioural activation is, and the activities screen fills its "Upcoming"
 * section only from plans dated after today. The database agrees — the
 * occurrence guard on `activity_logs` validates `completed_at` and checks only
 * the RANGE of `scheduled_offset_minutes`, never the scheduled instant.
 */
function atFuture(daysAfterToday, hour, minute = 0) {
  const d = dayAt(DAYS - 1);
  d.setDate(d.getDate() + daysAfterToday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * The same calendar day as `at()`, but at an explicit UTC hour/minute.
 *
 * `at()` stamps the SEEDING MACHINE's local clock, so it cannot express a fixed
 * UTC wall time: `at(d, 11)` is 11:00 in Sofia on one machine and 11:00 in
 * London on another. Tables that carry no captured-offset column have nowhere
 * to record which was meant, so their rows must be pinned to UTC instead of
 * inheriting whatever clock the seeding machine happened to have. Applies the
 * same future-clamp as `at()`.
 *
 * Every caller today goes through `inBand()` in the ACT section, which is where
 * the tables with no captured-offset column live (#1284). Reach for it directly
 * only for a table with the same problem and a different intended time.
 */
function atUtc(dayIndex, hour, minute = 0) {
  const d = dayAt(dayIndex);
  return clampToPast(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, 0, 0));
}

/**
 * The captured UTC offset for a timestamp, in minutes east of UTC, derived from
 * the seeding machine rather than hardcoded.
 *
 * `at()` builds every timestamp from the machine's local clock, so the offset
 * stored beside it has to be that machine's. The hardcoded +180 (EEST) this
 * replaces was a lie anywhere but UTC+3: the instant said one thing and the
 * offset column said another, and every consumer that resolves a civil day from
 * the pair landed on the wrong day. Derived per timestamp rather than once, so
 * a window that spans a daylight-saving change still describes each row
 * correctly. Only the stored integer varies by machine — the resolved picture
 * is identical everywhere, because consumers read the day through the pair.
 *
 * Takes either an ISO string from `at()` or a `Date` — the sleep window builds
 * its own Dates rather than going through `at()`.
 */
function offsetMinutesFor(timestamp) {
  return -new Date(timestamp).getTimezoneOffset();
}

const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function wipe(table) {
  const { error } = await admin.from(table).delete().eq("user_id", DEMO_USER_ID);
  if (error) throw new Error(`wipe ${table}: ${error.message}`);
}

async function insert(table, rows) {
  if (rows.length === 0) return 0;
  // Chunk: PostgREST handles large arrays fine, but keep payloads modest.
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 100));
    if (error) throw new Error(`insert ${table} (chunk ${i}): ${error.message}`);
  }
  return rows.length;
}

/**
 * Insert one parent row and hand back the id the database chose for it.
 *
 * The FK chains thread through this rather than through ids generated up here.
 * Nothing displays an id and no test pins one, so a pre-generated uuid would add
 * a second thing the seed has to keep stable for no gain — the contract is that
 * a re-run reproduces the same PICTURE, and ids are not part of the picture.
 */
async function insertReturningId(table, row) {
  const { data, error } = await admin.from(table).insert(row).select("id").single();
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return data.id;
}

const counts = {};

// ---------------------------------------------------------------- preferences
{
  const { error } = await admin.from("user_preferences").upsert(
    {
      user_id: DEMO_USER_ID,
      app_onboarding_completed: true,
      policy_version_accepted: policyVersion,
      reminder_consent: false,
      reminder_consent_updated_at: "2026-01-01T00:00:00.000Z",
      email_verified: true,
      emotions_seeded: true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`user_preferences: ${error.message}`);
  counts.user_preferences = 1;
}

// ------------------------------------------------------------------- emotions
// Full default set (constants/emotions.ts order) + two customs, so the picker,
// manage screen, and usage counts all have something to show.
{
  await wipe("emotion_preferences");
  const defaults = [
    ["happy", "😊"],
    ["excited", "🤩"],
    ["loved", "🥰"],
    ["inspired", "💡"],
    ["proud", "💪"],
    ["playful", "😄"],
    ["grateful", "🙏"],
    ["hopeful", "🌟"],
    ["relaxed", "😌"],
    ["content", "☺️"],
    ["anxious", "😰"],
    ["sad", "😢"],
    ["angry", "😡"],
    ["ashamed", "😳"],
    ["guilty", "😔"],
    ["overwhelmed", "😵"],
    ["frustrated", "😤"],
    ["lonely", "🫂"],
    ["fearful", "😨"],
    ["hopeless", "😞"],
    ["numb", "😶"],
    ["irritated", "😒"],
  ];
  const rows = defaults.map(([id, emoji], i) => ({
    user_id: DEMO_USER_ID,
    emotion_id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    emoji,
    position: i,
    removed: false,
    is_custom: false,
  }));
  rows.push(
    {
      user_id: DEMO_USER_ID,
      emotion_id: "custom-cozy",
      name: "Cozy",
      emoji: "🛋️",
      position: defaults.length,
      removed: false,
      is_custom: true,
    },
    {
      user_id: DEMO_USER_ID,
      emotion_id: "custom-curious",
      name: "Curious",
      emoji: "🧐",
      position: defaults.length + 1,
      removed: false,
      is_custom: true,
    },
  );
  counts.emotion_preferences = await insert("emotion_preferences", rows);
}

// ------------------------------------------------------------------- check-in
{
  await wipe("mood_logs");
  const pleasant = ["happy", "grateful", "relaxed", "content", "hopeful", "playful", "custom-cozy"];
  const difficult = [
    "anxious",
    "sad",
    "frustrated",
    "overwhelmed",
    "irritated",
    "lonely",
    "custom-curious",
  ];
  const noteShort = [
    "Slow morning, better afternoon.",
    "Walk after lunch helped.",
    "Too much coffee, jittery.",
    "Good call with mum.",
    "Deadline pressure at work.",
    "Slept badly, felt it all day.",
    "Quiet evening, read a book.",
  ];
  const noteLong =
    "Long day. The morning meeting ran over and I skipped lunch, which always makes " +
    "everything feel heavier than it is. By the evening I noticed I was catastrophising " +
    "about the review on Friday, so I wrote it down here instead of chewing on it. " +
    "The walk home in the rain was actually the best part of the day.";
  const rows = [];
  for (let d = 0; d < DAYS; d++) {
    if (chance(0.28)) continue; // gaps — empty days must render as gaps
    // Weighted score: mostly 3-4, tails at 1 and 5.
    const r = rng();
    const score = r < 0.06 ? 1 : r < 0.2 ? 2 : r < 0.55 ? 3 : r < 0.88 ? 4 : 5;
    const entriesToday = d === DAYS - 3 ? 3 : chance(0.15) ? 2 : 1; // one 3-entry day
    for (let e = 0; e < entriesToday; e++) {
      const s = Math.min(5, Math.max(1, score + (e > 0 ? between(-1, 1) : 0)));
      const pool = s >= 4 ? pleasant : s <= 2 ? difficult : chance(0.5) ? pleasant : difficult;
      const emotions = chance(0.75)
        ? [...new Set(Array.from({ length: between(1, 3) }, () => pick(pool)))]
        : [];
      const loggedAt = at(d, e === 0 ? between(8, 11) : between(17, 22), between(0, 59));
      rows.push({
        user_id: DEMO_USER_ID,
        mood_score: s,
        emotions,
        notes: chance(0.1) ? noteLong : chance(0.35) ? pick(noteShort) : "",
        linked_strategy: rows.length === 40 ? "behavioral-activation" : null,
        // A few entries carry the "go deeper" CBT fields (kept per #698).
        situation: chance(0.08) ? "Team stand-up ran long and I got put on the spot." : "",
        thoughts: chance(0.08) ? "I always freeze when it matters." : "",
        behaviours: chance(0.06) ? "Went quiet, avoided questions afterwards." : "",
        bodily_sensations: chance(0.06) ? "Tight chest, warm face." : "",
        logged_at: loggedAt,
        logged_offset_minutes: offsetMinutesFor(loggedAt),
        created_at: loggedAt,
      });
    }
  }
  counts.mood_logs = await insert("mood_logs", rows);
}

// -------------------------------------------------------------------- journal
{
  await wipe("journal_entries");
  const topics = [
    [
      "Weekend reset",
      "Spent Saturday deep-cleaning the flat and it genuinely changed my mood for the whole weekend. There is something about visible order that quiets the inner noise.",
    ],
    [
      "Arguing better",
      "N. and I disagreed about the holiday budget again, but this time I noticed the spiral early and asked for a pause. Twenty minutes later the whole thing took five minutes to settle.",
    ],
    [
      "Work worries",
      "The reorg rumours are back. Writing down what I actually know versus what I am inventing: I know my project is funded through Q4. Everything else is speculation.",
    ],
    [
      "Small wins",
      "Fixed the bike, called the dentist, cooked instead of ordering. None of it dramatic, all of it the life I keep saying I want.",
    ],
    [
      "On my father",
      "His birthday would have been this week. Grief is quieter now — more like weather than a wound. I let myself look through the old photos and it was mostly warm.",
    ],
    [
      "Can't sleep",
      "Third night this week staring at the ceiling at 2am. Patterns I notice: late screens, unfinished arguments with people who are not in the room.",
    ],
    [
      "First swim of the year",
      "The sea was freezing and perfect. Ten minutes in the water undid about two weeks of hunching over a laptop.",
    ],
  ];
  const rows = [];
  let day = 2;
  while (day < DAYS && rows.length < 26) {
    const [title, body] = topics[rows.length % topics.length];
    const occurredAt = at(day, between(19, 22), between(0, 59));
    rows.push({
      user_id: DEMO_USER_ID,
      title: rows.length % 5 === 4 ? "" : title, // some untitled entries
      body:
        rows.length === 10
          ? body +
            "\n\n" +
            body +
            "\n\nAnd a third paragraph to make this one properly long, the kind that tests clamping on the overview and the full read on the detail screen."
          : body,
      occurred_at: occurredAt,
      occurred_offset_minutes: offsetMinutesFor(occurredAt),
      created_at: occurredAt,
    });
    day += between(2, 5);
  }
  counts.journal_entries = await insert("journal_entries", rows);
}

// ------------------------------------------------- breathing custom exercise
// Inserted BEFORE the sessions: custom-exercise sessions store the exercise
// row's generated id in exercise_name (resolve-exercise.ts resolveCustom), not
// its display name — the overview queries built-in slugs plus current custom
// ids. Color must be a BreathingExerciseColor STORAGE value; "amber" maps to
// think's gold tint (exercise-colors.ts), "think" itself is not storable.
let customExerciseId;
{
  await wipe("breathing_exercises");
  const { data, error } = await admin
    .from("breathing_exercises")
    .insert({
      user_id: DEMO_USER_ID,
      name: "Evening wind-down",
      inhale_seconds: 4,
      hold_in_seconds: 4,
      exhale_seconds: 6,
      hold_out_seconds: 2,
      cycles: 10,
      color: "amber",
    })
    .select("id")
    .single();
  if (error) throw new Error(`breathing_exercises: ${error.message}`);
  customExerciseId = data.id;
  counts.breathing_exercises = 1;
}

// ------------------------------------------- breathing + grounding (sessions)
{
  await wipe("mindfulness_sessions");
  const rows = [];
  // Breathing: ~30 sessions across the window.
  const patterns = [
    ["box-breathing", 16, 8],
    ["4-7-8", 19, 6],
    ["coherent-breathing", 11, 12],
    [customExerciseId, 16, 10], // the custom exercise, keyed by its row id
  ];
  for (let d = 1; d < DAYS; d += between(2, 4)) {
    const [name, cycleSeconds, cycles] = pick(patterns);
    const seconds = cycleSeconds * cycles;
    const completedAt = at(d, between(7, 21), between(0, 59));
    rows.push({
      user_id: DEMO_USER_ID,
      exercise_name: name,
      duration_minutes: Math.max(1, Math.round(seconds / 60)),
      duration_seconds: seconds,
      cycles,
      reflection: chance(0.2) ? "Calmer by the last round." : "",
      mood_after: chance(0.5) ? between(3, 5) : null,
      feeling_after: null,
      completed_at: completedAt,
      completed_offset_minutes: offsetMinutesFor(completedAt),
      created_at: completedAt,
    });
  }
  // Grounding: ~14 sessions, mixed techniques, some finished partway.
  const techniques = [
    ["54321", 5],
    ["cold-water", 4],
    ["feet-floor", 4],
  ];
  for (let d = 3; d < DAYS; d += between(4, 9)) {
    const [slug, total] = pick(techniques);
    const done = chance(0.8) ? total : between(2, total - 1);
    const minutes = between(2, 6);
    const completedAt = at(d, between(9, 22), between(0, 59));
    rows.push({
      user_id: DEMO_USER_ID,
      exercise_name: slug,
      duration_minutes: minutes,
      duration_seconds: minutes * 60,
      cycles: null,
      steps_completed: done,
      steps_total: total,
      reflection: "",
      mood_after: null,
      feeling_after: chance(0.5) ? pick(["steadier", "calmer", "still shaky", "present"]) : null,
      completed_at: completedAt,
      completed_offset_minutes: offsetMinutesFor(completedAt),
      created_at: completedAt,
    });
  }
  counts.mindfulness_sessions = await insert("mindfulness_sessions", rows);
}

// ----------------------------------------------------------------- meditation
{
  await wipe("meditation_sessions");
  await wipe("stage_practice_notes");
  const techniques = ["breathAtNose", "followingTheBreath", "bodyScan", "connecting"];
  const rows = [];
  for (let d = 0; d < DAYS; d += between(2, 4)) {
    const completedAt = at(d, chance(0.7) ? between(6, 9) : between(20, 22), between(0, 59));
    rows.push({
      user_id: DEMO_USER_ID,
      duration_minutes: pick([10, 15, 15, 20, 30]),
      stage_at_session: d < DAYS / 2 ? 2 : 3,
      mind_wandering_episodes: chance(0.7) ? between(1, 9) : null,
      dullness_level: pick(["none", "none", "subtle", "strong"]),
      distraction_level: pick(["none", "subtle", "subtle", "gross"]),
      obstacle_tags: chance(0.3) ? [pick(["resistance", "procrastination"])] : [],
      reflection: chance(0.25)
        ? pick([
            "Kept coming back to the breath without the usual frustration.",
            "Sleepy start, settled in the second half.",
            "Busy mind today — counted more wanderings than usual.",
          ])
        : "",
      mood_after: chance(0.6) ? between(3, 5) : null,
      technique_used: pick(techniques),
      completed_at: completedAt,
      completed_offset_minutes: offsetMinutesFor(completedAt),
      created_at: completedAt,
    });
  }
  counts.meditation_sessions = await insert("meditation_sessions", rows);

  const { error } = await admin.from("meditation_program_state").upsert(
    {
      user_id: DEMO_USER_ID,
      current_stage: 3,
      assessed_stage: 3,
      milestones_reached: [],
      onboarding_completed_at: at(0, 8),
      last_session_at: rows[rows.length - 1].completed_at,
      preferred_duration_minutes: 15,
      preferred_time_of_day: "morning",
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`meditation_program_state: ${error.message}`);
  counts.meditation_program_state = 1;

  counts.stage_practice_notes = await insert("stage_practice_notes", [
    {
      user_id: DEMO_USER_ID,
      stage: 2,
      note: "Forgetting still happens fast when tired — shorter sits on bad-sleep days work better.",
    },
    {
      user_id: DEMO_USER_ID,
      stage: 3,
      note: "Labelling distractions ('planning', 'replaying') helps me let them go.",
    },
  ]);
}

// ---------------------------------------------------------------------- sleep
{
  await wipe("sleep_logs");
  const rows = [];
  for (let d = 0; d < DAYS; d++) {
    if (chance(0.12)) continue; // a few unlogged nights
    const duration = between(300, 540);
    const quality = duration < 360 ? between(1, 3) : duration < 450 ? between(2, 4) : between(3, 5);
    const loggedAt = at(d, between(7, 9), between(0, 59));
    const withWindow = chance(0.5); // the encrypted-window opt-in edge shape
    let sleepWindow = null;
    if (withWindow) {
      const bedHour = pick([22, 23, 23, 0]);
      const started = new Date(loggedAt);
      started.setDate(started.getDate() - (bedHour >= 20 ? 1 : 0));
      started.setHours(bedHour, between(0, 55), 0, 0);
      const ended = new Date(started.getTime() + duration * 60_000);
      // Seeding at an odd hour can push the newest night's wake time past
      // "now", which the DB rejects ("Sleep end cannot be in the future").
      // The window is a 50% opt-in anyway — skip it rather than distort it.
      if (ended.getTime() <= Date.now() - FUTURE_MARGIN_MS) {
        sleepWindow = JSON.stringify({
          startedAt: started.toISOString(),
          startedOffsetMinutes: offsetMinutesFor(started),
          endedAt: ended.toISOString(),
          endedOffsetMinutes: offsetMinutesFor(ended),
        });
      }
    }
    rows.push({
      user_id: DEMO_USER_ID,
      duration_minutes: duration,
      quality,
      notes: chance(0.25)
        ? pick([
            "Woke up twice.",
            "Deep and unbroken.",
            "Late screens again.",
            "Neighbours until midnight.",
            "Best night in a while.",
          ])
        : "",
      sleep_window: sleepWindow,
      logged_at: loggedAt,
      logged_offset_minutes: offsetMinutesFor(loggedAt),
      created_at: loggedAt,
    });
  }
  counts.sleep_logs = await insert("sleep_logs", rows);
}

// --------------------------------------------------------------------- habits
{
  await wipe("habit_logs");
  await wipe("habits");
  const habits = [
    {
      user_id: DEMO_USER_ID,
      name: "Morning walk",
      kind: "build",
      identity: "Someone who starts the day outside",
      cue_plan: "After my first coffee, I put my shoes on.",
      stack_after: "First coffee",
      two_minute_version: "Walk to the corner and back",
      cadence: "daily",
      color: "aqua",
      created_at: at(0, 9),
      adherence: 0.75,
    },
    {
      user_id: DEMO_USER_ID,
      name: "Read 10 pages",
      kind: "build",
      identity: "",
      cue_plan: "",
      two_minute_version: "Open the book on the bedside table",
      cadence: "daily",
      color: "iris",
      created_at: at(7, 21),
      adherence: 0.6,
    },
    {
      user_id: DEMO_USER_ID,
      name: "No phone in bed",
      kind: "break",
      identity: "",
      cue_plan: "Phone charges in the kitchen overnight.",
      cadence: "daily",
      color: "clay",
      created_at: at(14, 22),
      adherence: 0.55,
    },
    {
      user_id: DEMO_USER_ID,
      name: "Gym",
      kind: "build",
      identity: "",
      cue_plan: "Gym bag packed the night before.",
      cadence: "custom",
      custom_days: [1, 3, 5],
      color: "act",
      created_at: at(10, 18),
      adherence: 0.8,
    },
  ];
  let habitRows = 0;
  let logRows = 0;
  for (const h of habits) {
    const { adherence, ...habit } = h;
    const habitId = await insertReturningId("habits", habit);
    habitRows++;
    const startDay = Math.round((new Date(habit.created_at) - new Date(at(0, 0))) / 86_400_000);
    const logs = [];
    for (let d = Math.max(0, startDay); d < DAYS; d++) {
      const date = new Date(at(d, 12));
      if (
        habit.cadence === "custom" &&
        !habit.custom_days.includes(((date.getDay() + 6) % 7) + 1)
      ) {
        continue;
      }
      if (rng() < adherence) {
        logs.push({
          user_id: DEMO_USER_ID,
          habit_id: habitId,
          logged_on: date.toISOString().slice(0, 10),
          note: chance(0.06) ? "Nearly skipped, glad I didn't." : "",
        });
      }
    }
    logRows += await insert("habit_logs", logs);
  }
  counts.habits = habitRows;
  counts.habit_logs = logRows;
}

// ------------------------------------------------------------------ gratitude
{
  await wipe("gratitude_entries");
  const items = [
    "Coffee on the balcony before anyone was awake",
    "M. sent a photo of the dog in a raincoat",
    "The bus was on time",
    "Finished the hard part of the project",
    "Rain smell after the hot week",
    "Mum's voice on the phone",
    "The first tomato from the pot on the terrace",
    "A stranger held the elevator",
    "Cool side of the pillow",
    "An old song that still works",
  ];
  const rows = [];
  for (let d = 1; d < DAYS; d += between(2, 4)) {
    const level = chance(0.6) ? 1 : chance(0.7) ? 2 : 3;
    const loggedAt = at(d, between(20, 22), between(0, 59));
    const row = {
      user_id: DEMO_USER_ID,
      level,
      item_1: pick(items),
      item_2: pick(items),
      item_3: chance(0.8) ? pick(items) : "",
      note: chance(0.25) ? "Writing these down actually changes the evening." : "",
      starred: chance(0.15),
      logged_at: loggedAt,
      logged_offset_minutes: offsetMinutesFor(loggedAt),
      created_at: loggedAt,
    };
    if (level >= 2) {
      row.good_moment = "Lunch outside with the team, nobody looked at a phone.";
      row.miss_if_gone = "The evening walks with N.";
      row.hidden_good = "The commute — it is the only time I read.";
    }
    if (level === 3) {
      row.life_item_1 = "Healthy parents";
      row.life_item_2 = "Work that mostly feels useful";
      row.life_item_3 = "The sea an hour away";
    }
    rows.push(row);
  }
  counts.gratitude_entries = await insert("gratitude_entries", rows);
}

// ----------------------------------------------------------------- CBT and ACT
// The teardown contract for the CBT and ACT surfaces: one declared list, wiped
// in full before this section inserts anything, so a re-run replaces the demo
// account's content rather than stacking a second copy on top of it.
//
// PARENTS AND STANDALONE TABLES ONLY. The chain children — milestones,
// exposure_items, exposure_sessions, task_steps, challenge_plans and
// act_action_steps — are deliberately absent, because every foreign key among
// these tables declares `on delete cascade` and deleting the parent reclaims
// them.
//
// That rests on two separate links, proven separately. THE KEYS CASCADE is held
// against the live catalogue by the guard in
// test/integration/db-functions.integration.test.ts, so a migration that adds a
// non-cascading child fails there rather than silently orphaning rows here.
// THE DELETE REACHES THOSE KEYS is the other half: `wipe()` goes through the
// encrypted view, not the `_data` base table the keys sit on, so the cascade
// only fires because the view's INSTEAD OF trigger deletes from `_data` first.
// That was verified live on #1182; the guard does NOT cover it.
//
// Each slice adds the parents and standalone tables it seeds. The first four
// are standalone — the CBT thinking spine has no chains (#1281). The seven that
// follow are the structured work (#1282), and four of them head a chain:
// `goals` -> milestones, `procrastination_tasks` -> task_steps,
// `exposure_hierarchies` -> exposure_items -> exposure_sessions, and
// `recovery_plans` -> challenge_plans.
const CBT_ACT_WIPE_TABLES = [
  "thought_records",
  "core_beliefs",
  "activity_logs",
  "self_care_logs",
  "goals",
  "values_profile",
  "worry_entries",
  "anger_logs",
  "procrastination_tasks",
  "exposure_hierarchies",
  "recovery_plans",
  "act_defusion_logs",
  "act_expansion_logs",
  "act_urge_surf_logs",
  "act_connection_logs",
  "act_observing_self_sessions",
  "act_choice_points",
];

for (const table of CBT_ACT_WIPE_TABLES) {
  await wipe(table);
}

// ------------------------------------------------- CBT: the thinking spine
// Thought records, core beliefs, behavioural-activation activities and the
// self-care log (#1281).
//
// ONE LIFE, not a bag of fillers: this continues the person the rest of the
// seed already describes — work-based social-evaluative anxiety, avoidance as
// the maintaining behaviour, core belief "I'll be found out." THE RATINGS CARRY
// THE ARC AND THE PROSE DOES NOT: distress falls across the window with one
// setback around the two-thirds mark, where the rows also cluster, because a
// struggling stretch is when someone logs more.
//
// The content ceiling (#1180) is distress about performance, standing and
// relationships — never about living. Every distressing row keeps its answering
// field filled, and every row is ROLE-ONLY: no names, no identifiable third
// parties, no diagnostic self-labels.
//
// Demo's ten thought records used to live in `supabase/seed.sql`. They moved
// here in the same change that added the rest of this section, so one file owns
// them (#1281, ruled on #1211). Bob's five stayed behind: they are load-bearing
// for the export tests.

// The current CBT phase start, as a day index into the rolling window (#1178).
// The rows below are generated to SATISFY it — one activity completed after it,
// none today — so `behavioural` reads partially complete with today's practice
// still open. #1282 writes the anchor to `user_preferences` and asserts the
// derived programme state back against these rows.
const CBT_PHASE_STARTED_DAY = 76;

// The setback: the one difficult stretch, two thirds through the window, where
// the ratings stop improving and the rows cluster because a struggling stretch
// is when someone logs more.
//
// Declared once. Three surfaces read it — the thought records cluster inside it
// by hand, the activity mood lift flattens across it, the self-care stride
// tightens through it — and three hand-copied ranges drift apart the first time
// one of them is nudged.
const SETBACK_FROM_DAY = 53;
const SETBACK_TO_DAY = 64;
const inSetback = (dayIndex) => dayIndex >= SETBACK_FROM_DAY && dayIndex <= SETBACK_TO_DAY;

/**
 * How far along the improvement arc day `dayIndex` sits: 0 at the start of the
 * window, 1 today — except through the setback, where it drops back to roughly
 * where it stood three weeks earlier.
 *
 * The three rated series in the structured work ride this: worry probability
 * estimates, anger arousal levels and exposure session distress. Each maps it
 * onto its own scale, but they have to bend in the SAME place — three
 * hand-rolled curves drift apart the first time one of them is nudged, and the
 * setback stops reading as one bad stretch in one life and starts reading as
 * noise. Nothing in either module charts a series (#1174), so this is legible
 * only by reading numbers down a list, which is exactly why it has to be clean.
 */
function improvement(dayIndex) {
  const effective = inSetback(dayIndex) ? SETBACK_FROM_DAY - 18 : dayIndex;
  return Math.max(0, Math.min(1, effective / (DAYS - 1)));
}

const nat = (text, beliefRating, isHotThought = false) => ({ text, beliefRating, isHotThought });

// The enum-valued columns whose variants all have to render at least once. Each
// list mirrors the CHECK constraint on the matching `_data` table, and the
// matching TypeScript union the app reads it through:
//
//   goals.status                 20260514_cbt_phase1.sql      src/features/goals/types.ts
//   procrastination_tasks.status 20260516000000_cbt_phase4.sql
//                                                    src/features/procrastination/types.ts
//   worry_entries.worry_category 20260515_cbt_phase3.sql      src/features/worry/types.ts
//
// ⚠️ Mirrored, not read from the live constraints. The parent spec (#1273)
// asked for the variants to be read off the database so the list cannot rot
// when an enum gains a variant; doing that needs an RPC exposing the CHECK
// bodies, which no migration in this repo provides and which is nobody's ticket
// yet. Until one exists, this catches the failure that actually happens — a
// variant losing its only row — and a NEW variant still has to be added here by
// hand. Adding it is what makes the check fail until something renders it.
const GOAL_STATUSES = ["active", "completed", "paused", "abandoned"];
const TASK_STATUSES = ["active", "completed", "abandoned"];
const WORRY_CATEGORIES = ["hypothetical", "real_problem"];

/**
 * Fail unless every declared variant appears at least once among `rows`.
 *
 * The failure this prevents is a status badge or a category label that never
 * renders on the demo account, which is invisible until someone opens the one
 * screen that would have shown it. Reads the rows rather than the loop that
 * built them, so deleting the last row carrying a variant trips it.
 */
function requireEveryVariant(column, variants, rows, field = "status") {
  const seen = new Set(rows.map((row) => row[field]));
  const missing = variants.filter((variant) => !seen.has(variant));
  if (missing.length > 0) {
    throw new Error(
      `No seeded row uses ${column} = ${missing.join(" or ")}, so that variant never renders.`,
    );
  }
}

// -------------------------------------------------------- thought records
{
  // Every day index is explicit rather than strided. Five of these rows exist
  // for a SHAPE the screens branch on — archived, multi-NAT, a very long
  // situation, an empty outcome note, and one carrying no expanded detail at
  // all — and a stride cannot place those. The four rows clustered between
  // SETBACK_FROM_DAY and SETBACK_TO_DAY are the setback.
  //
  // ☠️ The history screen filters to `record.dayKey === selectedDate`: it is a
  // PER-DAY view, not a list of everything. Without a record dated today it
  // opens on its empty state however many rows exist, so the last row here is
  // deliberately today's.
  //
  // ☠️ The archived row renders NOWHERE. `listThoughtRecords` filters
  // `archived_at is null` and there is no archived view and no unarchive flow,
  // so it is seeded for the paths that must EXCLUDE it — the list, the lifetime
  // count, Home's "last written" row — and because the export carries it.
  //
  // "presentation" and "rest day" appear verbatim below. They are the sentinel
  // phrases the export leak test reads, carried over from the rows that used to
  // live in seed.sql; that test now asserts they are present here as well as
  // absent from bob's export, so rewording one of these two situations fails it
  // loudly instead of quietly voiding the check (#1281, ruled on #1211).
  const longSituation =
    "The scope on my piece of the release moved again on Thursday, and by Friday " +
    "morning I had three half-finished branches and no clear answer to give in the " +
    "stand-up. I spent most of the day rewriting the same paragraph of the handover " +
    "note instead of asking whether the deadline could move, because asking felt " +
    "like announcing that I could not manage it. By the time I did ask, it was late " +
    "enough that the question itself looked like a problem. I notice I do this with " +
    "anything that involves saying I need something: I would rather absorb it " +
    "quietly and lose the whole day to the absorbing than spend two minutes on the " +
    "conversation that would end it.";

  // Named fields, not a positional tuple: with fourteen values a row, two
  // adjacent intensity numbers and two adjacent evidence arrays are one slip
  // apart, and a mis-slotted row is silent.
  const records = [
    {
      day: 3,
      hour: 8,
      minute: 20,
      situation: "The team channel went quiet for two hours right after I posted my status update.",
      nats: [nat("They read it and decided I am not pulling my weight.", 85, true)],
      emotions: ["anxious", "ashamed"],
      distortions: ["mind-reading", "personalization"],
      evidenceFor: ["Nobody replied while I sat there watching."],
      evidenceAgainst: [
        "The channel is quiet most mornings.",
        "Two people picked it up in the afternoon.",
      ],
      balancedThought:
        "A quiet channel is a quiet channel. I am reading a verdict into silence that nobody delivered.",
      // Before only: the intensity block still renders, but with no shift to
      // report — the one branch a fully-rated record never shows.
      before: 84,
      after: null,
      outcomeNotes: "Closed the tab and started the next task instead of refreshing it.",
    },
    {
      day: 9,
      hour: 21,
      minute: 10,
      situation:
        "Rehearsed the client presentation four times tonight and still felt sick about tomorrow.",
      nats: [nat("They will work out that I am not up to this.", 88, true)],
      emotions: ["anxious", "fearful", "overwhelmed"],
      distortions: ["fortune-telling", "catastrophizing"],
      evidenceFor: ["I lost my place once in the run-through."],
      evidenceAgainst: [
        "I have delivered this material before.",
        "The slides are checked and the numbers hold.",
      ],
      balancedThought:
        "Nervous is not the same as unprepared. I know this material and the rehearsal showed it.",
      before: 88,
      after: 79,
      // Empty outcome note: the detail screen drops the outcome card entirely.
      outcomeNotes: "",
    },
    {
      day: 16,
      hour: 12,
      minute: 40,
      situation: "A senior colleague asked a question in the group review that I could not answer.",
      // Multi-NAT: three thoughts, one of them hot, so the detail screen's
      // sort-and-badge layout has something to sort.
      nats: [
        nat("Everyone in the room revised their opinion of me downwards.", 80, true),
        nat("I should have known that without being asked.", 72),
        nat("Next time they will not bother asking me at all.", 58),
      ],
      emotions: ["ashamed", "anxious", "frustrated"],
      distortions: ["mind-reading", "should-statements"],
      evidenceFor: ["I went blank and said I would follow up."],
      evidenceAgainst: [
        "Following up is the normal answer to a question nobody prepared for.",
        "Two people asked me for that follow-up by name.",
      ],
      balancedThought:
        "Not knowing one thing in a meeting is ordinary. Saying I would check is what a competent person does.",
      before: 86,
      after: 72,
      outcomeNotes: "Sent the answer the same afternoon and it closed the thread.",
    },
    {
      day: 23,
      hour: 19,
      minute: 5,
      situation: longSituation,
      nats: [nat("Asking for more time proves I cannot handle the workload.", 78, true)],
      emotions: ["anxious", "overwhelmed", "guilty"],
      distortions: ["all-or-nothing", "labeling"],
      evidenceFor: ["I did lose most of a working day to it."],
      evidenceAgainst: [
        "Scope moved twice, and that is not something I caused.",
        "The two people I have seen ask for time are the two I rate most highly.",
      ],
      balancedThought:
        "Asking for time is information the plan needs, not a confession. The cost of not asking was the whole day.",
      before: 83,
      after: 68,
      outcomeNotes: "Asked for the extra two days. It was granted in one line.",
    },
    {
      day: 30,
      hour: 7,
      minute: 50,
      situation: "Saw that my name was left off the invite for the planning session.",
      nats: [nat("They left me out because I am not needed on this any more.", 74, true)],
      // No emotions, no distortions, no evidence, no intensities and no
      // outcome: a rushed capture, and the only row that exercises the detail
      // screen's "not filled" branches and its collapsed expanded-detail card.
      emotions: [],
      distortions: [],
      evidenceFor: [],
      evidenceAgainst: [],
      balancedThought:
        "An invite list is admin, not a verdict. If I want to be on it, I can say so.",
      before: null,
      after: null,
      outcomeNotes: "",
    },
    {
      day: 37,
      hour: 13,
      minute: 15,
      situation: "Compared my quarter against a colleague's while updating the tracker.",
      nats: [nat("Everyone else is producing more than me and it shows.", 76, true)],
      emotions: ["frustrated", "sad"],
      distortions: ["comparing", "discounting-the-positive"],
      evidenceFor: ["Their row on the tracker is longer than mine."],
      evidenceAgainst: [
        "Their work is broken into smaller items than mine.",
        "Two of my items took a month each and count as one line.",
      ],
      balancedThought:
        "A tracker counts rows, not effort. Reading it as a ranking is my addition, not the tracker's.",
      before: 79,
      after: 61,
      outcomeNotes:
        "Wrote down what I actually shipped this quarter. It was more than I had been counting.",
    },
    {
      day: 41,
      hour: 20,
      minute: 0,
      situation:
        "Second-guessed the wording of a three-line message for twenty minutes before sending it.",
      nats: [nat("They will read the tone as pushy and think less of me.", 66, true)],
      emotions: ["anxious"],
      distortions: ["mind-reading", "perfectionistic-thinking"],
      evidenceFor: ["I rewrote it four times."],
      evidenceAgainst: [
        "Nobody has ever mentioned my tone.",
        "The reply came back friendly and immediate.",
      ],
      balancedThought:
        "Three lines cannot carry that much meaning. Twenty minutes of editing bought nothing.",
      before: 70,
      after: 58,
      outcomeNotes: "Sent it. Got a one-word friendly reply.",
      // The archived row.
      archivedDay: 44,
    },
    {
      day: 44,
      hour: 9,
      minute: 30,
      situation: "Was asked to take the notes in a meeting where I had expected to present.",
      nats: [nat("They moved me off it because they do not trust me with the room.", 72, true)],
      emotions: ["ashamed", "irritated", "angry"],
      distortions: ["mind-reading", "blaming"],
      evidenceFor: ["The change was made without telling me."],
      evidenceAgainst: [
        "The agenda lost twenty minutes overnight.",
        "I am still presenting the same work next week.",
      ],
      balancedThought:
        "A cut agenda is a cut agenda. I can ask what happened rather than decide what it meant.",
      before: 74,
      after: 55,
      outcomeNotes: "Asked directly. The agenda had been cut for time, not for me.",
    },
    {
      day: 50,
      hour: 18,
      minute: 40,
      situation: "Turned down an invitation to speak at the internal show-and-tell.",
      nats: [nat("They will work out that I am not up to this.", 70, true)],
      emotions: ["anxious", "guilty"],
      distortions: ["fortune-telling", "emotional-reasoning"],
      evidenceFor: ["I felt sick when I read the invitation."],
      evidenceAgainst: [
        "Feeling sick is not evidence about the talk.",
        "The last thing I presented went fine.",
      ],
      balancedThought:
        "Saying no because I am frightened is the avoidance keeping this going. The fear is not a forecast.",
      before: 72,
      after: 52,
      outcomeNotes: "Asked to be put on the list for the next one instead.",
    },
    {
      day: 55,
      hour: 22,
      minute: 30,
      situation: "A restructure summary went out and my team's line was left blank.",
      nats: [nat("This is how they let people go without saying it.", 84, true)],
      emotions: ["anxious", "fearful", "hopeless"],
      distortions: ["catastrophizing", "fortune-telling"],
      evidenceFor: ["The line really was blank."],
      evidenceAgainst: [
        "Three other teams' lines were blank too.",
        "Nothing has changed about my work this week.",
      ],
      balancedThought:
        "A blank line in a draft summary is a blank line. I am writing the ending myself and then reacting to it.",
      before: 87,
      after: 80,
      outcomeNotes:
        "Listed what is confirmed in writing and what I am filling in myself. Most of it was the second.",
    },
    {
      day: 57,
      hour: 7,
      minute: 40,
      situation: "Read my own status update back and could not tell whether it sounded thin.",
      nats: [nat("They will work out that I am not up to this.", 82, true)],
      emotions: ["anxious", "numb"],
      distortions: ["emotional-reasoning", "perfectionistic-thinking"],
      evidenceFor: ["It is shorter than last week's."],
      evidenceAgainst: [
        "Last week covered two weeks of work.",
        "Nobody has ever commented on the length.",
      ],
      balancedThought:
        "I cannot read my own update the way a stranger would, and a fifth rewrite will not change that.",
      before: 85,
      after: 78,
      outcomeNotes: "Posted it unchanged.",
    },
    {
      day: 59,
      hour: 21,
      minute: 20,
      situation: "Cancelled on a friend at short notice for the third time this month.",
      nats: [nat("I am letting everyone down in every direction at once.", 80, true)],
      emotions: ["guilty", "ashamed", "lonely"],
      distortions: ["overgeneralization", "labeling"],
      evidenceFor: ["Three cancellations is three cancellations."],
      evidenceAgainst: [
        "They rearranged easily both previous times.",
        "I have not cancelled on anything at work.",
      ],
      balancedThought:
        "A hard month is not a character. Three cancellations is a stretch of weeks, not who I am.",
      before: 82,
      after: 70,
      outcomeNotes: "Told them the honest reason instead of inventing a better one.",
    },
    {
      day: 62,
      hour: 12,
      minute: 0,
      situation: "Handed over a piece of work knowing one corner of it was rushed.",
      nats: [nat("The rushed corner is the only part anyone will look at.", 76, true)],
      emotions: ["anxious", "frustrated"],
      distortions: ["discounting-the-positive", "fortune-telling"],
      evidenceFor: ["The corner really is rough."],
      evidenceAgainst: [
        "The rest took three weeks and holds up.",
        "Handovers are read for the whole, not audited.",
      ],
      balancedThought:
        "One rough corner sits inside three weeks of work that is sound. Both are true at once.",
      before: 80,
      after: 64,
      outcomeNotes: "Flagged the rushed corner myself in the handover note.",
    },
    {
      day: 68,
      hour: 8,
      minute: 15,
      situation: "Volunteered to run the retro and immediately wanted to take it back.",
      nats: [nat("Putting myself forward is how I get exposed.", 68, true)],
      emotions: ["anxious", "hopeful"],
      distortions: ["fortune-telling", "control-fallacy"],
      evidenceFor: ["I could not sleep properly the night after offering."],
      evidenceAgainst: [
        "Running a retro is facilitation, not performance.",
        "I have sat in twenty of them.",
      ],
      balancedThought:
        "Wanting to take it back is the avoidance arriving on time. I can want that and still run it.",
      before: 70,
      after: 44,
      outcomeNotes: "Ran it. It was fine and it finished early.",
    },
    {
      day: 74,
      hour: 19,
      minute: 45,
      situation: "Got a correction on a shared document from someone more senior.",
      nats: [nat("A correction from them means I am being watched.", 60, true)],
      emotions: ["anxious", "irritated"],
      distortions: ["mind-reading", "fairness-fallacy"],
      evidenceFor: ["They went into the document specifically to change my section."],
      evidenceAgainst: [
        "They corrected two other sections in the same pass.",
        "The correction was one word.",
      ],
      balancedThought:
        "Editing a shared document is what a shared document is for. Being read is not being watched.",
      before: 66,
      after: 40,
      outcomeNotes: "Took the correction, said thanks, moved on.",
    },
    {
      day: 78,
      hour: 9,
      minute: 10,
      situation: "Asked a question in a large meeting that I would have swallowed a month ago.",
      nats: [nat("The question will land as though I have not been following.", 55, true)],
      emotions: ["anxious", "proud"],
      distortions: ["mind-reading", "reward-fallacy"],
      evidenceFor: ["My voice was unsteady for the first sentence."],
      evidenceAgainst: [
        "Two people said afterwards they had wanted to ask the same thing.",
        "Nobody reacted to the unsteady sentence.",
      ],
      balancedThought:
        "Asking is the practice. Doing it badly and doing it are not the same measure.",
      before: 58,
      after: 32,
      outcomeNotes: "Stayed for the rest of the meeting instead of going quiet.",
    },
    {
      day: 83,
      hour: 20,
      minute: 30,
      situation: "Took a rest day and spent the whole afternoon doing nothing useful.",
      nats: [nat("A rest day only counts if I have earned it.", 52, true)],
      emotions: ["guilty", "relaxed"],
      distortions: ["should-statements", "change-fallacy"],
      evidenceFor: ["I finished the afternoon with nothing to show."],
      evidenceAgainst: [
        "Rest is in the plan on purpose.",
        "The week before it I worked two evenings.",
      ],
      balancedThought:
        "A rest day is not a payment against a debt. It is part of how the rest of the week works.",
      before: 55,
      after: 28,
      outcomeNotes: "Stayed on the balcony until it got dark.",
    },
    {
      day: DAYS - 1,
      hour: 9,
      minute: 5,
      situation: "Checked first thing whether anyone had replied to yesterday's proposal.",
      nats: [nat("No reply by now means it has already been dismissed.", 48, true)],
      emotions: ["anxious", "hopeful"],
      distortions: ["fortune-telling", "mind-reading"],
      evidenceFor: ["It has been eighteen hours."],
      evidenceAgainst: [
        "It went out at six in the evening.",
        "The last two proposals were answered within the week.",
      ],
      balancedThought:
        "Eighteen hours across one night is not a silence. I am reading a decision into a normal gap.",
      before: 52,
      after: 30,
      outcomeNotes: "Left the tab closed and got on with the morning.",
    },
  ];

  const rows = records.map((record) => {
    const createdAt = at(record.day, record.hour, record.minute);
    return {
      user_id: DEMO_USER_ID,
      situation: record.situation,
      nats: record.nats,
      emotions: record.emotions,
      distortions: record.distortions,
      evidence_for: record.evidenceFor,
      evidence_against: record.evidenceAgainst,
      balanced_thought: record.balancedThought,
      emotion_intensity_before: record.before,
      emotion_intensity_after: record.after,
      outcome_notes: record.outcomeNotes,
      // Absent on all but one row, which is the point: `archivedDay` names the
      // single archived record rather than trailing a null through eighteen.
      archived_at: record.archivedDay === undefined ? null : at(record.archivedDay, 21, 0),
      created_at: createdAt,
      // Never null: a null offset resolves the record to the VIEWER's local
      // day instead of the one it was written on, silently and without error.
      created_offset_minutes: offsetMinutesFor(createdAt),
      // The history list orders by `updated_at` and stamps each card with it,
      // so a row left to default would jump to the top under today's date.
      updated_at: createdAt,
    };
  });
  counts.thought_records = await insert("thought_records", rows);
}

// ------------------------------------------------------------ core beliefs
{
  // Three rather than two: the CBT home screen surfaces belief-review
  // suggestions only once at least three beliefs exist.
  const rows = [
    {
      day: 20,
      reviewInDays: 4, // due inside a week, so the review suggestion has a target
      belief_statement: "I'll be found out.",
      triggering_situations: [
        "Being asked something in front of a group",
        "Showing work that is not finished",
        "A quiet reply to something I sent",
      ],
      evidence_for: ["I have gone blank in a meeting.", "I avoid volunteering for visible work."],
      evidence_against: [
        "I have held the same role for four years.",
        "The work I handed over is still in use.",
        "The people who would notice keep asking me for more.",
      ],
      alternative_belief:
        "I am competent and still learning, and both can be true in the same meeting.",
      original_belief_strength: 85,
      alternative_belief_strength: 45,
      reinforcement_plan:
        "When the thought arrives, write down what was actually said rather than what it meant.",
    },
    {
      day: 34,
      reviewInDays: 21,
      belief_statement: "If I need help, I am not competent.",
      triggering_situations: ["Being stuck for more than an hour", "Asking for more time"],
      evidence_for: ["I put off asking until it was late."],
      evidence_against: [
        "Everyone I respect asks for help constantly.",
        "The one time I asked early, it took ten minutes.",
      ],
      alternative_belief: "Asking early is what competent people do with the time it saves.",
      original_belief_strength: 70,
      alternative_belief_strength: 55,
      reinforcement_plan:
        "Set a one-hour limit before asking, and treat the limit as the decision.",
    },
    {
      day: 57,
      reviewInDays: 45,
      belief_statement: "Getting it wrong once means I cannot be trusted with it.",
      triggering_situations: ["A correction on my work", "Missing a detail in a review"],
      evidence_for: ["A correction still lands like a verdict."],
      evidence_against: ["Nothing has ever been taken off me after a correction."],
      alternative_belief:
        "Being corrected is how the work gets better, and it happens to everyone here.",
      original_belief_strength: 62,
      // Deliberately weak: an alternative under 30 is the other condition the
      // review suggestion looks for, so the two branches are both covered.
      alternative_belief_strength: 24,
      reinforcement_plan: "Note what happened after the correction, not just that it happened.",
    },
  ].map(({ day, reviewInDays, ...belief }) => {
    const createdAt = at(day, 20, 15);
    return {
      user_id: DEMO_USER_ID,
      ...belief,
      next_review_date: dayKeyAt(DAYS - 1 + reviewInDays),
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
  counts.core_beliefs = await insert("core_beliefs", rows);
}

// --------------------------------------------------------------- activities
{
  // Behavioural activation. The completed history is strided; the open rows are
  // explicit, because they are what the screen's three sections branch on —
  // "Today" takes anything scheduled today or overdue and still open, so both
  // shapes are seeded, and "Upcoming" takes only plans dated after today.
  //
  // ☠️ `mood_before`/`mood_after` are 1-5 here, NOT the 1-10 the surface
  // inventory recorded: the CHECK on `activity_logs_data` says 1-5.
  const definitions = [
    ["Swim at the harbour pool", "pleasure", "physical"],
    ["Clear the inbox backlog", "mastery", "achievement"],
    ["Call a friend for no reason", "pleasure", "connection"],
    ["Finish the shelf in the kitchen", "mastery", "achievement"],
    ["Walk the long way home", "pleasure", "physical"],
    ["Cook something I have never made", "pleasure", "enjoyment"],
    ["Read on the balcony for an hour", "pleasure", "enjoyment"],
    ["Sort the paperwork drawer", "mastery", "achievement"],
    ["Coffee with a colleague, no agenda", "pleasure", "connection"],
    ["Run the coast path", "mastery", "physical"],
    ["Sit in on the design critique", "mastery", "connection"],
    ["Batch-cook for the week", "mastery", "enjoyment"],
  ];
  const activityNotes = [
    "Nearly talked myself out of it on the way.",
    "Easier once it had started.",
    "Booked it the night before so it was harder to drop.",
    "",
    "",
  ];

  const rows = [];
  const completedDays = [];
  let definitionIndex = 0;
  const nextDefinition = () => definitions[definitionIndex++ % definitions.length];

  /** Scheduled earlier the same day, then done. */
  const completed = (day, hour, lift) => {
    const [activityName, category, paceCategory] = nextDefinition();
    const scheduledAt = at(day, Math.max(6, hour - 2), 0);
    const completedAt = at(day, hour, between(0, 50));
    const withMood = chance(0.8);
    const moodBefore = between(2, 3);
    completedDays.push(day);
    return {
      user_id: DEMO_USER_ID,
      activity_name: activityName,
      category,
      pace_category: paceCategory,
      scheduled_at: scheduledAt,
      scheduled_offset_minutes: offsetMinutesFor(scheduledAt),
      completed_at: completedAt,
      completed_offset_minutes: offsetMinutesFor(completedAt),
      mood_before: withMood ? moodBefore : null,
      mood_after: withMood ? Math.min(5, moodBefore + lift) : null,
      notes: pick(activityNotes),
      created_at: scheduledAt,
    };
  };

  /**
   * Planned and still open. The completion offset stays null on purpose: an
   * offset with no instant beside it describes nothing, and the screen reads the
   * missing `completed_at` as "not done yet". The offset that matters on an open
   * row is the SCHEDULED one, and that is always written.
   */
  const planned = (scheduledAt) => {
    const [activityName, category, paceCategory] = nextDefinition();
    return {
      user_id: DEMO_USER_ID,
      activity_name: activityName,
      category,
      pace_category: paceCategory,
      scheduled_at: scheduledAt,
      scheduled_offset_minutes: offsetMinutesFor(scheduledAt),
      completed_at: null,
      completed_offset_minutes: null,
      mood_before: between(2, 3),
      mood_after: null,
      notes: "",
      created_at: at(DAYS - 3, 20, 0),
    };
  };

  // The lift grows across the window and flattens through the setback, so the
  // list reads as progress rather than noise.
  for (let d = 12; d < DAYS - 3; d += between(3, 6)) {
    const setback = inSetback(d);
    const lift = setback
      ? between(0, 1)
      : d < 40
        ? between(0, 1)
        : d < 66
          ? between(1, 2)
          : between(2, 3);
    rows.push(completed(d, between(9, 19), lift));
  }
  // Placed rather than left to the stride, because a programme signal rides on
  // each: `behavioural`'s "complete one activity" milestone reads done only if
  // something was completed at or after the phase start.
  rows.push(completed(CBT_PHASE_STARTED_DAY + 3, 18, 2));
  rows.push(completed(DAYS - 4, 8, 3));

  // Overdue and today, both still open — the screen files both under "Today".
  rows.push(planned(at(DAYS - 2, 18, 30)));
  rows.push(planned(at(DAYS - 1, 7, 30)));
  rows.push(planned(at(DAYS - 1, 19, 0)));
  // Genuinely after today, the only way "Upcoming" renders.
  rows.push(planned(atFuture(1, 18, 30)));
  rows.push(planned(atFuture(2, 9, 0)));
  rows.push(planned(atFuture(4, 11, 0)));

  // Asserted here rather than left to reading the loop above: both of these are
  // invisible until someone opens the programme card, and either one silently
  // flipping is exactly the failure this dataset exists to prevent (#1178).
  if (completedDays.includes(DAYS - 1)) {
    throw new Error(
      "An activity is completed today, so the CBT programme's daily practice would read done. " +
        "It must stay open.",
    );
  }
  if (!completedDays.some((day) => day >= CBT_PHASE_STARTED_DAY)) {
    throw new Error(
      "No activity is completed at or after the current CBT phase start, so that phase's " +
        "'complete one activity' milestone would read open.",
    );
  }

  counts.activity_logs = await insert("activity_logs", rows);
}

// ---------------------------------------------------------------- self-care
{
  // One row per day, capped by `unique (user_id, log_date)`. Strided rather
  // than daily so the log has gaps, tightened through the setback, and always
  // including today — ☠️ the self-care screen is a FORM for the selected date,
  // not a list, so without today's row it opens blank on a fully seeded
  // account.
  const exerciseTypes = ["Swim", "Walk", "Run", "Cycling", "Stretching", "Weights"];
  const socialNotes = [
    "Long call in the evening.",
    "Lunch outside with two people from the team.",
    "Sat with a neighbour on the terrace.",
    "A message thread that turned into a proper conversation.",
  ];
  const meaningfulActivities = [
    "Finished the chapter I keep restarting.",
    "Cooked properly instead of standing at the counter.",
    "Went into the sea.",
    "Cleared the balcony.",
    "Wrote for twenty minutes.",
    "Fixed the thing that has been annoying me for a month.",
  ];
  // The self-compassion card (#1283) asks what you would say to a friend in the
  // same situation, so every one of these is the KIND REPLY and never the
  // criticism it answers - the field is not built to hold the criticism.
  const selfCompassionNotes = [
    "You had a hard week and you still showed up for the parts that mattered.",
    "You would not hold this against anyone else. Give yourself the same reading.",
    "One rushed piece of work is not the measure of the month.",
    "Tired is a reason, not an excuse you have to justify.",
    "You asked for what you needed today. That was the difficult bit.",
  ];

  const days = new Set();
  for (let d = 4; d < DAYS; d += inSetback(d) ? between(1, 2) : between(2, 4)) {
    days.add(d);
  }
  days.add(DAYS - 1);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d) => {
      // Both values have to appear across the recent rows or the CBT home
      // screen's exercise/mood comparison has nothing to compare.
      const exerciseDone = chance(0.55);
      const socialConnectionMade = chance(0.6);
      // All three states the self-compassion card can hold: untouched, noticed
      // with nothing written, and noticed with a reply. Ticking it and writing
      // nothing is a complete entry by design, so it has to appear.
      const selfCriticismNoticed = chance(0.45);
      const createdAt = at(d, 21, 30);
      return {
        user_id: DEMO_USER_ID,
        // A calendar day, not an instant: the screen looks this up by the day
        // key it is showing.
        log_date: dayKeyAt(d),
        exercise_done: exerciseDone,
        exercise_minutes: exerciseDone ? between(20, 60) : null,
        exercise_type: exerciseDone ? pick(exerciseTypes) : "",
        meals_structured: between(2, 5),
        emotional_eating: chance(0.25),
        social_connection_made: socialConnectionMade,
        social_notes: socialConnectionMade ? pick(socialNotes) : "",
        meaningful_activity: chance(0.7) ? pick(meaningfulActivities) : "",
        self_criticism_noticed: selfCriticismNoticed,
        self_compassion_note: selfCriticismNoticed && chance(0.75) ? pick(selfCompassionNotes) : "",
        created_at: createdAt,
      };
    });
  counts.self_care_logs = await insert("self_care_logs", rows);
}

// --------------------------------------------- CBT: the structured work
// Goals and their milestones, the values profile, worry entries, anger logs,
// procrastination tasks and their steps, the exposure hierarchies with their
// items and sessions, and the recovery plan with its challenge plans (#1282).
//
// Same life as the thinking spine above, same content ceiling: distress about
// performance, standing and relationships, role-only, never about living, and
// every distressing row keeps its answering field filled.
//
// VARIANT COVERAGE IS THE FLOOR, not volume (#1181). Every enum-valued column
// below shows every variant at least once — all four goal statuses, all three
// task statuses, both worry categories — because a status badge or category
// label that never renders is exactly the kind of thing that breaks unnoticed.
//
// FOUR FOREIGN-KEY CHAINS are threaded here, each by inserting the parent and
// selecting its id back (`insertReturningId`), the same shape the habits block
// above uses.

// ------------------------------------------------------------------- goals
{
  // `completedDay: null` is an open milestone. Every status the goals screen
  // branches on appears: `active` fills the main list, and `completed`,
  // `paused` and `abandoned` are what the "Past goals" section renders — a
  // section that stays invisible on an account with only active goals.
  const goals = [
    {
      title: "Speak up once in every team meeting",
      description:
        "Not a speech. One question, one opinion, one 'can we come back to that' — anything " +
        "that puts my voice in the room before the meeting ends.",
      life_domain: "work",
      goal_type: "doMore",
      status: "active",
      createdDay: 9,
      targetDay: DAYS + 30,
      milestones: [
        ["Ask one clarifying question in a meeting", 20, 18],
        ["Say one opinion out loud without rehearsing it first", 38, 41],
        ["Volunteer to run one agenda item", 62, null],
        ["Present a piece of work to the wider group", DAYS + 24, null],
      ],
    },
    {
      title: "Be in bed before midnight on work nights",
      description:
        "The 2am spiral costs me the whole next day, and the next day is where the work is. " +
        "Lights out before midnight, Sunday to Thursday.",
      life_domain: "health",
      goal_type: "improveQuality",
      status: "active",
      createdDay: 16,
      targetDay: DAYS + 14,
      milestones: [
        ["Phone charges in the kitchen, not by the bed", 24, 25],
        ["No work email after nine", 44, null],
        ["Three work nights in a row before midnight", 70, null],
      ],
    },
    {
      title: "Finish the evening course I keep deferring",
      description:
        "Eight sessions. I have started it twice and dropped it twice, both times in the week " +
        "after a bad review.",
      life_domain: "personalGrowth",
      goal_type: "doMore",
      status: "completed",
      createdDay: 12,
      targetDay: 70,
      milestones: [
        ["Enrol and pay, so dropping out costs something", 18, 17],
        ["Get through the first four sessions", 40, 43],
        ["Hand in the final piece", 68, 66],
      ],
    },
    {
      title: "Swim at the harbour pool twice a week",
      description:
        "Paused, not dropped: the pool is closed for repairs until the spring. It goes back on " +
        "the list the week it reopens.",
      life_domain: "leisure",
      goal_type: "doMore",
      status: "paused",
      createdDay: 20,
      targetDay: DAYS + 40,
      milestones: [
        ["Buy a ten-swim pass", 26, 27],
        ["Two swims in the same week", 48, null],
      ],
    },
    {
      title: "Host something at home every month",
      description:
        "Dropped this one on purpose. It was a should rather than a want, and leaving it on the " +
        "list was its own small weight.",
      life_domain: "relationships",
      goal_type: "improveRelationship",
      status: "abandoned",
      createdDay: 6,
      targetDay: 60,
      milestones: [["Pick a date and tell one person", 14, null]],
    },
    {
      title: "Cut the late-night scrolling",
      description:
        "Not down to zero. Just not the hour between eleven and midnight, which is the hour it " +
        "costs the most.",
      life_domain: "other",
      goal_type: "doLess",
      status: "active",
      createdDay: 34,
      targetDay: DAYS + 8,
      milestones: [
        ["Move the apps off the home screen", 38, 39],
        ["Charge the phone outside the bedroom on work nights", 56, null],
      ],
    },
  ];

  let goalRows = 0;
  let milestoneRows = 0;
  for (const goal of goals) {
    const { createdDay, targetDay, milestones, ...fields } = goal;
    const createdAt = at(createdDay, 20, 15);
    const goalId = await insertReturningId("goals", {
      user_id: DEMO_USER_ID,
      ...fields,
      // A calendar day, not an instant — and built through `dayKeyAt`, never by
      // slicing an ISO string, which files evening rows on the wrong day west
      // of Greenwich.
      target_date: dayKeyAt(targetDay),
      created_at: createdAt,
      updated_at: createdAt,
    });
    goalRows++;

    milestoneRows += await insert(
      "milestones",
      milestones.map(([description, milestoneTargetDay, completedDay]) => {
        const milestoneCreatedAt = at(createdDay, 20, 30);
        const completedAt = completedDay === null ? null : at(completedDay, between(9, 20), 0);
        return {
          user_id: DEMO_USER_ID,
          goal_id: goalId,
          description,
          target_date: dayKeyAt(milestoneTargetDay),
          completed_at: completedAt,
          created_at: milestoneCreatedAt,
          updated_at: completedAt ?? milestoneCreatedAt,
        };
      }),
    );
  }
  requireEveryVariant("goals.status", GOAL_STATUSES, goals);
  counts.goals = goalRows;
  counts.milestones = milestoneRows;
}

// ---------------------------------------------------------------- values
{
  // ☠️ ONE ROW. `values_profile` is a per-user singleton — the `life_domain`
  // column was dropped, the table carries a personal-values JSON column, and
  // the base table's `unique (user_id)` is resolved by the view's insert
  // trigger as a merge. A second insert would silently overwrite the first
  // rather than adding to it.
  //
  // Seven values sit at tier 1 and six of them fill the priority list to its
  // cap, so the screen renders BOTH branches that only appear at the cap: the
  // "maximum priorities reached" note, and a tier-1 value still sitting outside
  // a full list.
  //
  // ☠️ `updated_at` cannot be backdated through this view: the insert trigger
  // hard-sets `timezone('utc', now())` with no coalesce. Inert here — the
  // milestone that reads it, `clarifyValues`, belongs to phase 0 and the
  // seeded account is on phase 3 — but a re-phasing would make a seeded values
  // profile satisfy that milestone no matter what date it claims.
  const tier = (keys, value) => keys.map((key) => ({ key, tier: value }));
  const highlyImportant = [
    "courageous",
    "authentic",
    "self-aware",
    "honesty",
    "caring",
    "industrious",
    "curious",
  ];
  const createdAt = at(10, 20, 45);
  const valuesRows = await insert("values_profile", [
    {
      user_id: DEMO_USER_ID,
      personal_values: [
        ...tier(highlyImportant, 1),
        ...tier(["encouraging", "flexible", "open-minded", "patient", "fitness", "gratitude"], 2),
        ...tier(["conforming", "orderly", "safe", "humility"], 3),
      ],
      // Tier-1 only, in the order they were ranked. `curious` is deliberately
      // left out: it keeps one candidate outside a full list.
      priority_values: highlyImportant.slice(0, 6),
      created_at: createdAt,
    },
  ]);
  // Taken from the insert rather than written as a literal 1: the end-of-run
  // "wiped but not re-seeded" gate reads these counts, and a hardcoded number
  // beside a deleted insert makes that gate assert itself.
  counts.values_profile = valuesRows;
}

// ----------------------------------------------------------------- worry
{
  // ☠️ The worry screen is a PER-DAY view — it filters to
  // `toLocalDateKey(entry.createdAt) === selectedDate` — so however many
  // entries exist, it opens EMPTY unless something is dated today. The last two
  // rows below are today's, one of each category, so both the hypothetical and
  // the real-problem card render on the screen as it first opens.
  //
  // Probability estimates ride the shared improvement arc: high early, falling
  // across the window, and back up through the setback.
  // Named fields rather than positional tuples: the two evidence lists and the
  // action steps are three same-typed arrays in a row, and swapping the
  // evidence for a worry with the evidence against it would invert the entry
  // while every check here still passed.
  //
  // `actionSteps` belongs to a real problem — something that can be
  // problem-solved — and stays empty on a hypothetical, which is the actual CBT
  // distinction between the two categories rather than a gap. Both categories
  // always carry a coping statement, because a distressing row without its
  // answering field is not one this seed will write.
  const entries = [
    {
      day: 4,
      category: "hypothetical",
      statement: "If the reorg goes through, I'm the one they cut.",
      coping:
        "I can't audit a rumour. I can keep the work visible and let the announcement be the " +
        "announcement.",
      evidenceFor: ["Two teams were merged last year.", "Nobody has said anything either way."],
      evidenceAgainst: [
        "My last three pieces of work shipped.",
        "The rumour has come round twice and nothing followed.",
      ],
      actionSteps: [],
      resolved: true,
    },
    {
      day: 11,
      category: "real_problem",
      statement: "The handover doc is half-written and it is due Friday.",
      coping: "Half-written is not unwritten.",
      evidenceFor: ["Two sections are still bullet points."],
      evidenceAgainst: ["The hard section is already done.", "Friday is four working days away."],
      actionSteps: [
        "Block ninety minutes first thing tomorrow.",
        "Send the draft even if the last section stays in bullets.",
        "Ask for a read-through by Thursday.",
      ],
      resolved: true,
    },
    {
      day: 19,
      category: "hypothetical",
      statement: "If I ask for help they'll work out I have been struggling all quarter.",
      coping:
        "Asking is what people who are on top of their work do. It is the not-asking that reads " +
        "as struggling.",
      evidenceFor: ["I have not asked for anything in months."],
      evidenceAgainst: ["Everyone else asks, constantly, and nobody thinks less of them."],
      actionSteps: [],
      resolved: true,
    },
    {
      day: 26,
      category: "real_problem",
      statement: "I owe two people replies from last week.",
      coping: "Late is recoverable. Silent is what turns it into a thing.",
      evidenceFor: ["Both have been waiting six days."],
      evidenceAgainst: ["Neither has chased.", "Both replies are five minutes of work."],
      actionSteps: [
        "Reply to both before lunch, badly if necessary.",
        "Say sorry once, not three times.",
      ],
      resolved: true,
    },
    {
      day: 33,
      category: "hypothetical",
      statement: "The quiet in the review meant they were being polite.",
      coping: "Quiet is quiet. I am reading a whole verdict into an absence of words.",
      evidenceFor: ["Nobody said much at the end."],
      evidenceAgainst: [
        "The written notes afterwards were specific and positive.",
        "That meeting always runs short.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: 41,
      category: "real_problem",
      statement: "The bill for the flat repairs lands before payday.",
      coping: "This one is arithmetic, not catastrophe.",
      evidenceFor: ["The bill is due on the 28th and payday is the 1st."],
      evidenceAgainst: ["There is enough in savings to bridge three days."],
      actionSteps: [
        "Move the standing order back by a week.",
        "Ask whether they take payment on delivery.",
      ],
      resolved: true,
    },
    {
      day: 48,
      category: "hypothetical",
      statement: "If I take the leave I have booked, the work piles up and it shows.",
      coping:
        "The work piles up whether I am there or not. Leave is not the thing that makes it " +
        "visible.",
      evidenceFor: ["Nobody is covering my queue."],
      evidenceAgainst: [
        "The queue survived the last two weeks I was off.",
        "The leave was approved by the person who owns the queue.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: 55,
      category: "hypothetical",
      statement: "They have stopped asking me to the planning calls because I have slipped.",
      coping:
        "I was not on the last two invites. That is a fact about two invites, not about my " +
        "standing.",
      evidenceFor: ["Two invites in a row went out without me."],
      evidenceAgainst: [
        "Both were scoping calls for a project I am not on.",
        "I was asked to the one that mattered.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: 58,
      category: "real_problem",
      statement: "I said yes to a piece of work I do not have room for.",
      coping:
        "Saying so now is a small awkward conversation. Saying so in three weeks is a big one.",
      evidenceFor: ["My next two weeks are already full."],
      evidenceAgainst: [
        "It was scoped before the other thing landed, so the reason is real and checkable.",
      ],
      actionSteps: [
        "Say today that the dates no longer work.",
        "Offer the two weeks after, or offer to hand it on.",
      ],
      resolved: true,
    },
    {
      day: 61,
      category: "hypothetical",
      statement: "One bad fortnight and the whole year gets read as a bad year.",
      coping: "Nobody is holding a running average of me. I am the only one keeping that score.",
      evidenceFor: ["The last two weeks have been thin."],
      evidenceAgainst: [
        "Nine months of the year were not thin.",
        "Nobody has said a word about the last two weeks.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: 68,
      category: "real_problem",
      statement: "The talk I agreed to give is in three weeks and I have written nothing.",
      coping: "Three weeks is enough if it starts being three weeks and not three days.",
      evidenceFor: ["There is no outline yet."],
      evidenceAgainst: [
        "I have given this talk in pieces a dozen times.",
        "Three weeks is six writing sessions.",
      ],
      actionSteps: ["Outline it on Sunday, badly.", "Book two hours a week in the calendar now."],
      resolved: false,
    },
    {
      day: 74,
      category: "hypothetical",
      statement: "If I get the presentation wrong, that is what they will remember.",
      coping:
        "People remember whether the thing was useful. I am the only one who will remember the " +
        "wobble.",
      evidenceFor: ["It is the biggest room I have presented to."],
      evidenceAgainst: [
        "I have never once remembered anyone else's wobble.",
        "The material is the part they came for.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: 80,
      category: "real_problem",
      statement: "The course deadline and the release land in the same week.",
      coping:
        "Two hard things in one week is a scheduling problem, and scheduling problems have " +
        "answers.",
      evidenceFor: ["Both are fixed dates."],
      evidenceAgainst: [
        "The course piece can be finished a week early.",
        "The release week is quiet after Tuesday.",
      ],
      actionSteps: [
        "Finish the course piece by the weekend before.",
        "Block Wednesday afternoon for the release.",
      ],
      resolved: false,
    },
    {
      day: 86,
      category: "hypothetical",
      statement: "The new starter is faster than me and everyone can see it.",
      coping: "Fast at week three is fast at the easy part. Nobody is running a comparison but me.",
      evidenceFor: ["They cleared the intro queue in two days."],
      evidenceAgainst: [
        "That queue is the part I do in my sleep.",
        "Speed on the easy work is not the job.",
      ],
      actionSteps: [],
      resolved: false,
    },
    {
      day: DAYS - 1,
      category: "real_problem",
      statement: "I have agreed to two things this week that overlap.",
      coping: "One of them can move. I just have to be the one who says so.",
      evidenceFor: ["Both are booked for Thursday afternoon."],
      evidenceAgainst: ["One of the two has no fixed date at all."],
      actionSteps: ["Move the flexible one to next week before the end of today."],
      resolved: false,
    },
    {
      day: DAYS - 1,
      category: "hypothetical",
      statement: "If I am the one who raises the problem, it becomes my problem.",
      coping: "It is already everyone's problem. Naming it is not the same as owning it.",
      evidenceFor: ["Nobody else has mentioned it."],
      evidenceAgainst: [
        "The last two things I raised were picked up by the people who owned them.",
      ],
      actionSteps: [],
      resolved: false,
    },
  ];

  const rows = entries.map((entry) => {
    const createdAt = at(entry.day, between(8, 21), between(0, 59));
    const estimate = Math.round(85 - 55 * improvement(entry.day)) + between(-6, 6);
    return {
      user_id: DEMO_USER_ID,
      worry_statement: entry.statement,
      worry_category: entry.category,
      probability_estimate: Math.max(0, Math.min(100, estimate)),
      evidence_for: entry.evidenceFor,
      evidence_against: entry.evidenceAgainst,
      coping_statement: entry.coping,
      action_steps: entry.actionSteps,
      resolved: entry.resolved,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  requireEveryVariant("worry_entries.worry_category", WORRY_CATEGORIES, rows, "worry_category");
  counts.worry_entries = await insert("worry_entries", rows);
}

// ----------------------------------------------------------------- anger
{
  // ☠️ The anger screen is a PER-DAY view too, and it has a second branch a
  // single row cannot reach: at three or more logs on the selected day it puts
  // a count summary above the list. Three of the rows below are today's, so the
  // screen opens on both the list AND the summary.
  //
  // Arousal falls across the window and climbs again through the setback;
  // outcome ratings move the other way. One outcome is deliberately null —
  // rating the aftermath is optional, and the detail screen has a branch for a
  // log that was never rated.
  // Named fields rather than positional tuples: five of these are same-typed
  // strings sitting next to each other, and swapping the urge with the
  // behaviour, or the consequence with the reappraisal, would invert what the
  // row says about the person while every check here still passed.
  const logs = [
    {
      day: 7,
      trigger: "Talked over twice in the same meeting.",
      interpretation: "They think what I have to say is filler.",
      urge: "Say nothing for the rest of the hour and let them notice.",
      chose: "Went quiet and stayed quiet.",
      consequence: "Left angrier than I went in, and nobody noticed.",
      timeOut: false,
      alternative: "The agenda was overrunning and everyone was cutting everyone off.",
    },
    {
      day: 15,
      trigger: "A decision I had spent a week on was reversed in a two-line message.",
      interpretation: "A week of my work is worth two lines to them.",
      urge: "Reply immediately, at length, with receipts.",
      chose: "Drafted the reply and did not send it.",
      consequence: "Slept on it and asked one question the next morning instead.",
      timeOut: true,
      alternative:
        "The message was two lines because they were between meetings, not because the work " +
        "was worth two lines.",
    },
    {
      day: 23,
      trigger: "Someone repeated my point back to the room and it landed this time.",
      interpretation: "It only counts when they say it.",
      urge: "Say 'I literally just said that.'",
      chose: "Said nothing and stewed.",
      consequence: "Spent the rest of the meeting rehearsing what I should have said.",
      timeOut: false,
      alternative:
        "The room was still catching up on the point; the second telling had the room's " +
        "attention, not better content.",
      // The one log with no outcome rating. Rating the aftermath is optional in
      // the form, so the branch that renders a log without one has to be
      // reachable — and marking the row is honest in a way that testing the
      // loop index was not.
      unrated: true,
    },
    {
      day: 31,
      trigger: "Chased for something I had already sent.",
      interpretation: "They do not read anything I send.",
      urge: "Forward the original with the timestamp visible.",
      chose: "Forwarded it, then added a line saying no problem.",
      consequence: "Fine, and over in a minute.",
      timeOut: false,
      alternative: "Their inbox is a mess and it has nothing to do with me.",
    },
    {
      day: 39,
      trigger: "The plan changed on the day, again.",
      interpretation: "Nothing I schedule is safe.",
      urge: "Point out this is the third time.",
      chose: "Took ten minutes outside before responding.",
      consequence:
        "Came back and asked what had moved, which turned out to be a genuinely good reason.",
      timeOut: true,
      alternative: "The change came from outside the team and nobody chose it.",
    },
    {
      day: 47,
      trigger: "Cut off mid-sentence on a call.",
      interpretation: "I am not worth waiting for.",
      urge: "Talk over the top of them.",
      chose: "Waited, then finished the sentence.",
      consequence: "The point landed and the call moved on.",
      timeOut: false,
      alternative: "The lag on the call was two seconds and we both kept starting at once.",
    },
    {
      day: 56,
      trigger: "My name was not on the invite for the thing I built.",
      interpretation: "They have written me out of it.",
      urge: "Ask, pointedly, who put the list together.",
      chose: "Sent a flat one-liner asking to be added.",
      consequence: "Added within the minute, with an apology.",
      timeOut: false,
      alternative: "The list was copied from an old thread that predates my part of it.",
    },
    {
      day: 60,
      trigger: "A piece of feedback landed as a list with no first line.",
      interpretation: "There was nothing worth putting in a first line.",
      urge: "Reply asking whether any of it was any good.",
      chose: "Read it twice, then closed the laptop for an hour.",
      consequence:
        "Came back and found four of the seven points were things I already planned to change.",
      timeOut: true,
      alternative: "They write every review as a list. There is never a first line, for anyone.",
    },
    {
      day: 64,
      trigger: "Interrupted at home while trying to finish something late.",
      interpretation: "Nobody takes what I am doing seriously.",
      urge: "Snap, and go back to the screen.",
      chose: "Snapped, then came back ten minutes later and said so.",
      consequence: "Sorted, but the ten minutes cost more than the interruption did.",
      timeOut: true,
      alternative:
        "It was a question that took four seconds, and I had been at the screen for five hours.",
    },
    {
      day: 71,
      trigger: "The scope grew on the day of the handover.",
      interpretation: "They will keep adding until I break.",
      urge: "Accept it and work the weekend.",
      chose: "Said what would fit and what would not, in writing.",
      consequence: "Half of it moved to the next cycle without any argument at all.",
      timeOut: false,
      alternative:
        "Nobody had a list of what was already in scope. Writing it down was the whole fix.",
    },
    {
      day: 79,
      trigger: "A question in the review that sounded like an accusation.",
      interpretation: "They have decided the answer already.",
      urge: "Get defensive and over-explain.",
      chose: "Asked what was behind the question before answering it.",
      consequence: "It was a genuine question, and the answer took one line.",
      timeOut: false,
      alternative: "Short questions sound sharp in a quiet room.",
    },
    {
      day: DAYS - 1,
      trigger: "Third message before nine asking where something is.",
      interpretation: "They think I am the problem here.",
      urge: "Reply with exactly how long the thing actually takes.",
      chose: "Answered the question and put the deadline in the reply.",
      consequence: "No further messages.",
      timeOut: false,
      alternative: "They are being chased by someone else and passing it straight down.",
    },
    {
      day: DAYS - 1,
      trigger: "A change to the afternoon's plan with no notice.",
      interpretation: "My time is the flexible kind.",
      urge: "Say yes and be quietly furious.",
      chose: "Said the afternoon was booked and offered tomorrow.",
      consequence: "Tomorrow was fine.",
      timeOut: false,
      alternative: "They did not know the afternoon was booked, because I had not said so.",
    },
    {
      day: DAYS - 1,
      trigger: "Read a message as sarcastic and lost twenty minutes to it.",
      interpretation: "That was a dig.",
      urge: "Screenshot it and show someone so they agree it was a dig.",
      chose: "Left it alone and did something else for twenty minutes.",
      consequence: "Reread it in the evening and could not find the dig anywhere in it.",
      timeOut: true,
      alternative: "There is no tone in a one-line message. I supplied the tone.",
    },
  ];

  const rows = logs.map((log) => {
    const createdAt = at(log.day, between(9, 21), between(0, 59));
    const arousal = Math.round(9 - 5 * improvement(log.day)) + between(-1, 1);
    const outcome = Math.round(3 + 5 * improvement(log.day)) + between(-1, 1);
    return {
      user_id: DEMO_USER_ID,
      trigger_text: log.trigger,
      interpretation: log.interpretation,
      arousal_level: Math.max(1, Math.min(10, arousal)),
      urge: log.urge,
      behavior_chosen: log.chose,
      consequence: log.consequence,
      time_out_taken: log.timeOut,
      alternative_interpretation: log.alternative,
      outcome_rating: log.unrated ? null : Math.max(1, Math.min(10, outcome)),
      notes: "",
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  // Read off the BUILT ROWS, not off a flag the loop set: the flag version
  // asked whether a hardcoded index had been visited, which a fixed-length
  // literal array answers yes to no matter what the rows say. Both branches of
  // the detail screen have to be reachable, so neither all-rated nor
  // none-rated is a usable dataset.
  const unrated = rows.filter((row) => row.outcome_rating === null).length;
  if (unrated === 0 || unrated === rows.length) {
    throw new Error(
      `${unrated === 0 ? "Every" : "No"} anger log carries an outcome rating, so the detail ` +
        "screen renders only one of its two branches.",
    );
  }
  counts.anger_logs = await insert("anger_logs", rows);
}

// ------------------------------------------------------- procrastination
{
  // All three task statuses: `active` fills the main list, `completed` and
  // `abandoned` are what the "Past" section renders.
  const tasks = [
    {
      task_description: "Write the handover doc",
      avoidance_reason: "It means admitting how much of it only lives in my head.",
      fear_thought: "Writing it down shows how thin the actual system is.",
      challenged_thought: "The gaps are the reason to write it, not the reason not to.",
      reward: "A proper lunch away from the desk.",
      status: "completed",
      createdDay: 18,
      deadlineDay: 30,
      steps: [
        ["List the sections without writing any of them", 15, 19],
        ["Write the two sections I already know cold", 60, 21],
        ["Write the section I have been avoiding", 90, 26],
        ["Send it for one read-through", 10, 29],
      ],
    },
    {
      task_description: "Book the dentist",
      avoidance_reason: "Six months of not booking it makes the call itself embarrassing.",
      fear_thought: "They will ask why I left it this long.",
      challenged_thought: "They book people who left it longer, every single day.",
      reward: "Cross it off the list that has carried it since spring.",
      status: "active",
      createdDay: 44,
      deadlineDay: null,
      steps: [
        ["Find the number", 5, 45],
        ["Make the call before lunch", 10, null],
        ["Put the appointment in the calendar", 2, null],
      ],
    },
    {
      task_description: "Draft the talk",
      avoidance_reason: "Starting it makes it real, and unstarted it is still perfect.",
      fear_thought: "Whatever I write first will be obviously thin.",
      challenged_thought:
        "The first draft is supposed to be thin. That is what a first draft is for.",
      reward: "An afternoon off the week it is done.",
      status: "active",
      createdDay: 57,
      deadlineDay: DAYS + 12,
      steps: [
        ["Write the one sentence the talk is about", 10, 59],
        ["Outline five sections, badly", 45, null],
        ["Draft the opening", 60, null],
        ["Read it out loud once, alone", 30, null],
      ],
    },
    {
      task_description: "Rebuild the personal site",
      avoidance_reason:
        "Nobody is asking for it, so every hour on it feels like it needs justifying.",
      fear_thought: "If I put it up and nothing happens, that says something.",
      challenged_thought: "Nothing happening is the normal outcome and it says nothing at all.",
      reward: "",
      status: "abandoned",
      createdDay: 29,
      deadlineDay: null,
      steps: [
        ["Decide what the site is even for", 30, 31],
        ["Pick a template and stop researching templates", 45, null],
      ],
    },
    {
      task_description: "Sort the paperwork drawer before the tax deadline",
      avoidance_reason: "The drawer is a year of small avoided decisions in one place.",
      fear_thought: "There is something in there I should have dealt with months ago.",
      challenged_thought: "Whatever is in there gets worse by staying in there.",
      reward: "The drawer closes properly again.",
      status: "active",
      createdDay: 81,
      deadlineDay: DAYS + 26,
      steps: [
        ["Empty the drawer onto the table", 10, 82],
        ["Three piles: keep, act, bin", 30, 85],
        ["Deal with the act pile", 90, null],
      ],
    },
  ];

  let taskRows = 0;
  let stepRows = 0;
  for (const task of tasks) {
    const { createdDay, deadlineDay, steps, ...fields } = task;
    const createdAt = at(createdDay, 21, 0);
    const taskId = await insertReturningId("procrastination_tasks", {
      user_id: DEMO_USER_ID,
      ...fields,
      deadline: deadlineDay === null ? null : dayKeyAt(deadlineDay),
      created_at: createdAt,
      updated_at: createdAt,
    });
    taskRows++;

    stepRows += await insert(
      "task_steps",
      steps.map(([description, estimatedMinutes, completedDay]) => {
        const completedAt = completedDay === null ? null : at(completedDay, between(9, 20), 0);
        return {
          user_id: DEMO_USER_ID,
          task_id: taskId,
          description,
          estimated_minutes: estimatedMinutes,
          completed_at: completedAt,
          created_at: createdAt,
          updated_at: completedAt ?? createdAt,
        };
      }),
    );
  }
  requireEveryVariant("procrastination_tasks.status", TASK_STATUSES, tasks);
  counts.procrastination_tasks = taskRows;
  counts.task_steps = stepRows;
}

// -------------------------------------------------------------- exposure
{
  // ☠️ BOTH HIERARCHIES ARE CREATED BEFORE THE CURRENT PHASE BEGAN, and none
  // after. `behavioural`'s second milestone, `exposureLadder`, counts
  // hierarchies created at or after the phase start — so a ladder built inside
  // the current phase would tick that milestone, both milestones would be done,
  // and the phase would read complete rather than partially complete. The
  // assertion at the end of this section checks it rather than trusting the
  // day indices below to stay put.
  //
  // Items are laddered across the distress range and the sessions climb them:
  // pre-session distress falls both as the ladder is climbed and across the
  // window, and the setback is a cluster of repeat attempts at rungs that were
  // already cleared — going back down a step is what a bad fortnight looks
  // like, and a struggling stretch is when someone logs more.
  const hierarchies = [
    {
      title: "Being seen not knowing something",
      anxiety_type: "Social and performance",
      createdDay: 30,
      items: [
        ["Ask a colleague to repeat something I missed", 20, 34],
        ["Say 'I don't know' in a meeting of three or four", 30, 38],
        ["Ask a question in a meeting of more than six", 40, 45],
        ["Send a draft before it is finished", 50, 52],
        ["Disagree out loud with something I think is wrong", 60, 70],
        ["Run one agenda item in the weekly", 70, 79],
        ["Present to the wider group", 80, null],
        ["Say 'I got that wrong' in front of the whole team", 90, null],
      ],
      // [itemIndex, day] — the climb, then the setback cluster back down it.
      sessions: [
        [0, 33],
        [0, 34],
        [1, 37],
        [1, 38],
        [2, 43],
        [2, 45],
        [3, 50],
        [3, 52],
        [3, 55],
        [2, 57],
        [4, 59],
        [3, 62],
        [4, 63],
        [4, 70],
        [5, 77],
        [5, 79],
        [6, 84],
      ],
    },
    {
      title: "Calls I keep putting off",
      anxiety_type: "Everyday avoidance",
      createdDay: 58,
      items: [
        ["Call to reschedule an appointment", 25, 62],
        ["Call the landlord about the repairs", 40, 71],
        ["Call back the number I have been ignoring", 55, null],
        ["Make the call I have rehearsed six times", 70, null],
      ],
      sessions: [
        [0, 61],
        [0, 62],
        [1, 69],
        [1, 71],
        [2, 83],
      ],
    },
  ];

  const sessionNotes = [
    "Wanted to leave for the first few minutes and then forgot to.",
    "Worse in the ten minutes before than at any point during.",
    "Nothing happened. Which is the point, and still surprising.",
    "",
    "",
  ];
  const safetyBehaviours = [
    "Wrote the sentence out first and read it.",
    "Sat near the door.",
    "Kept it short so there was no room for a follow-up question.",
  ];

  let hierarchyRows = 0;
  let itemRows = 0;
  let sessionRows = 0;
  const hierarchyCreatedDays = [];
  for (const hierarchy of hierarchies) {
    const { createdDay, items, sessions, ...fields } = hierarchy;
    const createdAt = at(createdDay, 20, 0);
    hierarchyCreatedDays.push(createdDay);
    const hierarchyId = await insertReturningId("exposure_hierarchies", {
      user_id: DEMO_USER_ID,
      ...fields,
      created_at: createdAt,
      updated_at: createdAt,
    });
    hierarchyRows++;

    const itemIds = [];
    const itemSuds = [];
    for (const [description, sudsRating, completedDay] of items) {
      const completedAt = completedDay === null ? null : at(completedDay, between(10, 19), 0);
      itemIds.push(
        await insertReturningId("exposure_items", {
          user_id: DEMO_USER_ID,
          hierarchy_id: hierarchyId,
          description,
          suds_rating: sudsRating,
          completed_at: completedAt,
          created_at: createdAt,
          updated_at: completedAt ?? createdAt,
        }),
      );
      itemSuds.push(sudsRating);
      itemRows++;
    }

    sessionRows += await insert(
      "exposure_sessions",
      sessions.map(([itemIndex, day]) => {
        const progress = improvement(day);
        const pre = Math.max(
          0,
          Math.min(100, itemSuds[itemIndex] - Math.round(18 * progress) + between(-4, 4)),
        );
        // Habituation within the session, as a PROPORTION of where the session
        // started rather than a fixed subtraction: the same fixed drop that
        // reads as habituation on a 70 rung takes a 20 rung to zero, and a
        // post-session zero does not read as "it settled", it reads as "nothing
        // happened". The proportion deepens across the window, which is the
        // ladder being climbed rather than merely repeated.
        const post = Math.max(2, Math.round(pre * (0.68 - 0.26 * progress)) - between(0, 3));
        // Safety behaviours drop away as the ladder is climbed: early sessions
        // lean on them, later ones do not. Both branches of the detail card.
        const usedSafetyBehaviour = progress < 0.5 && chance(0.7);
        const completedAt = at(day, between(10, 19), between(0, 59));
        return {
          user_id: DEMO_USER_ID,
          exposure_item_id: itemIds[itemIndex],
          pre_suds: pre,
          post_suds: post,
          duration_minutes: between(10, 45),
          safety_behaviors_used: usedSafetyBehaviour,
          safety_behavior_description: usedSafetyBehaviour ? pick(safetyBehaviours) : "",
          notes: pick(sessionNotes),
          completed_at: completedAt,
          created_at: completedAt,
        };
      }),
    );
  }

  // Checked here as well as in the programme assertion below, because this is
  // where the number that breaks it lives: nudging a `createdDay` past the
  // phase start is a one-character edit with no visible symptom until someone
  // opens the programme card and finds the phase reading complete.
  const insideCurrentPhase = hierarchyCreatedDays.filter((day) => day >= CBT_PHASE_STARTED_DAY);
  if (insideCurrentPhase.length > 0) {
    throw new Error(
      `Exposure hierarchies are created on day ${insideCurrentPhase.join(", ")}, at or after the ` +
        `current CBT phase start (day ${CBT_PHASE_STARTED_DAY}), so that phase's ladder ` +
        "milestone would read done. It must stay open.",
    );
  }

  counts.exposure_hierarchies = hierarchyRows;
  counts.exposure_items = itemRows;
  counts.exposure_sessions = sessionRows;
}

// -------------------------------------------------------------- recovery
{
  // A per-user singleton, so one row — and the integration notes cover all
  // eleven strategy keys. `resolveActiveStrategyKeys` infers which keys get a
  // notes field from which record sources have data, and by this point in the
  // seed nearly all of them do; a note for every key means no field on the
  // screen renders blank whichever way that inference lands.
  const createdAt = at(70, 21, 0);
  const updatedAt = at(85, 21, 30);
  const recoveryPlanId = await insertReturningId("recovery_plans", {
    user_id: DEMO_USER_ID,
    recovery_keys: [
      "Catching the thought before the avoidance, not after it.",
      "Saying the awkward thing early rather than perfectly.",
      "Sleep first. Everything is worse on five hours.",
      "One person told, every time it gets heavy.",
    ],
    personal_slogan: "Being found out was never the risk. Not showing up was.",
    strategy_integration_notes: {
      goals: "One goal at a time, and a milestone small enough to do on a bad day.",
      activities: "Book it the night before, so the morning does not get a vote.",
      thoughts: "A thought record on any day that ends with me replaying a conversation.",
      values: "When two options both look fine, pick the one the top six would pick.",
      beliefs: "Reread the alternative belief on the days the old one sounds like a fact.",
      exposure: "Back down a rung is not off the ladder. Repeat the rung and carry on.",
      worry: "Hypothetical or real problem, decided first. The answer is different for each.",
      mindfulness: "Ten minutes before the hard meeting, not after it.",
      tasks: "First step small enough to be embarrassing, or it does not get started.",
      anger: "Ten minutes and a walk before any reply I would want to reread.",
      selfCare: "The three that hold everything else up: sleep, moving, one conversation.",
    },
    maintenance_commitments: [
      "One meeting a week where I say the first thing, not the safest thing.",
      "The swim, or the walk, whichever the week allows.",
      "A check-in with someone outside work every fortnight.",
      "Reread this page whenever a fortnight starts going the wrong way.",
    ],
    created_at: createdAt,
    updated_at: updatedAt,
  });
  // `insertReturningId` throws unless exactly one row came back, so the id
  // existing IS the count; see the note beside `counts.values_profile`.
  counts.recovery_plans = recoveryPlanId ? 1 : 0;

  counts.challenge_plans = await insert(
    "challenge_plans",
    [
      [
        "A review lands badly.",
        [
          "Read it twice, then close the laptop for an hour.",
          "Separate what is about the work from what I am adding about me.",
          "Pick the two points I already agreed with and start there.",
        ],
      ],
      [
        "Reorg rumours start again.",
        [
          "Write down what is actually known, which is usually almost nothing.",
          "Keep the work visible instead of trying to read the room.",
          "Say it out loud to one person rather than running it at 2am.",
        ],
      ],
      [
        "A fortnight where nothing I make seems to land.",
        [
          "Log more, not less. The record is what makes a fortnight a fortnight.",
          "Go back a rung on the ladder rather than off it.",
          "Check the sleep before believing the conclusions.",
        ],
      ],
    ].map(([challengeDescription, copingSteps]) => ({
      user_id: DEMO_USER_ID,
      recovery_plan_id: recoveryPlanId,
      challenge_description: challengeDescription,
      coping_steps: copingSteps,
      created_at: createdAt,
      updated_at: updatedAt,
    })),
  );
}

// ------------------------------------------------- CBT programme anchor
// The anchor is the INPUT: it is written here, and the rows above and in the
// thinking spine were generated to satisfy it (#1178). CBT sits in
// `behavioural`, index 3 of 5, PARTIALLY complete — one activity completed
// inside the phase ticks `activityOnce`, no hierarchy created inside it leaves
// `exposureLadder` open, and nothing completed today leaves the daily practice
// open, which is the one row a reviewer can exercise themselves.
//
// Pre-phase history stays: the earlier phases' rows are still there, they
// simply sit before the current phase's start, which is what feeds the four
// stat chips (they count from `started_at`, not from the phase start).
const CBT_PROGRAM_STARTED_DAY = 8;

// The five phase keys in order, mirroring CBT_PROGRAM in
// src/features/cbt/program-definition.ts. Mirrored rather than imported: this
// script is plain Node and that module is TypeScript behind a path alias.
//
// The index is derived from the KEY rather than written as a bare 3, because
// the index on its own means nothing — each phase has its own milestones and
// its own daily practice, and the checks further down are `behavioural`'s
// specifically. Anchoring by name is what lets the assertion notice that the
// two have come apart.
const CBT_PHASE_KEYS = ["assessment", "formulation", "thinking", "behavioural", "resilience"];
const CBT_PROGRAM_PHASE_KEY = "behavioural";
const CBT_PROGRAM_PHASE_INDEX = CBT_PHASE_KEYS.indexOf(CBT_PROGRAM_PHASE_KEY);
{
  const { error } = await admin
    .from("user_preferences")
    .update({
      cbt_program_started_at: at(CBT_PROGRAM_STARTED_DAY, 9, 0),
      cbt_program_phase_index: CBT_PROGRAM_PHASE_INDEX,
      cbt_program_phase_started_at: at(CBT_PHASE_STARTED_DAY, 9, 0),
      // Null keeps the programme in progress. A completion date would graduate
      // it and the phase card would stop rendering altogether.
      cbt_program_completed_at: null,
      // Cleared rather than left alone so a re-run reproduces the same picture:
      // this column is set by a tap in the app, and a reviewer who dismissed the
      // prompt would otherwise keep a dismissed prompt across every later seed.
      cbt_program_prompt_dismissed_at: null,
    })
    .eq("user_id", DEMO_USER_ID);
  if (error) throw new Error(`cbt program anchor: ${error.message}`);
}

// ☠️ `cbt_program_phase_index` is STORED, not derived, while every milestone
// derives from the rows. Nothing in the app recomputes the index or rejects one
// that contradicts its own rows — out-of-range values are silently clamped, not
// refused — so a seeded index can sit there disagreeing with the data behind it
// and the only symptom is a programme card that reads wrong.
//
// So derive it back OUT of the database and check the two agree. Read back
// rather than reusing the arrays above: that also proves the rows survived the
// encrypted views with the timestamps they were given, which is the other way
// this can silently go wrong.
{
  const { data: prefs, error: prefsError } = await admin
    .from("user_preferences")
    .select(
      "cbt_program_started_at, cbt_program_phase_index, cbt_program_phase_started_at, " +
        "cbt_program_completed_at",
    )
    .eq("user_id", DEMO_USER_ID)
    .single();
  if (prefsError) throw new Error(`cbt program read-back: ${prefsError.message}`);

  const { data: activities, error: activityError } = await admin
    .from("activity_logs")
    .select("completed_at, completed_offset_minutes")
    .eq("user_id", DEMO_USER_ID)
    .not("completed_at", "is", null);
  if (activityError)
    throw new Error(`cbt program read-back (activities): ${activityError.message}`);

  const { data: ladders, error: ladderError } = await admin
    .from("exposure_hierarchies")
    .select("created_at")
    .eq("user_id", DEMO_USER_ID);
  if (ladderError) throw new Error(`cbt program read-back (exposure): ${ladderError.message}`);

  // Milestones count from the phase start, falling back to the programme start
  // exactly as `deriveCbtProgram` and `program_widget_task_status` both do.
  const phaseStart = new Date(
    prefs.cbt_program_phase_started_at ?? prefs.cbt_program_started_at,
  ).getTime();

  /**
   * The civil day an instant was captured on, from the pair the row stores —
   * the same shift `public.occurrence_day_key` applies. A null offset falls back
   * to the seeding machine's local day, which is where the RPC's `coalesce` and
   * the client's `toLocalDateKey` both put such a row.
   */
  const capturedDayKey = (instant, offsetMinutes) =>
    offsetMinutes == null
      ? localDayKey(new Date(instant))
      : new Date(new Date(instant).getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);

  // What the seeded rows have to make each of the anchored phase's legs read.
  // Keyed by PHASE, and only the seeded phase is declared: every phase has
  // different milestones and a different daily practice, so moving the anchor
  // to another phase means choosing afresh which signals the rows now satisfy.
  // An undeclared phase fails here rather than quietly checking `behavioural`'s
  // legs against a `resilience` anchor and passing.
  //
  // Milestones and daily practice are declared SEPARATELY because "partially
  // complete" is a claim about the milestones alone — the daily practice is not
  // part of a phase's completion, and a check that had to name the daily leg to
  // exclude it would stop excluding it the moment a phase called that leg
  // something else.
  const phaseExpectations = {
    behavioural: {
      milestones: { activityOnce: true, exposureLadder: false },
      dailyPractice: { activityDaily: false },
    },
  };

  const anchoredPhaseKey = CBT_PHASE_KEYS[prefs.cbt_program_phase_index];
  const phaseExpectation = phaseExpectations[anchoredPhaseKey];
  if (!phaseExpectation) {
    throw new Error(
      `The anchored CBT phase index ${prefs.cbt_program_phase_index} is ` +
        `'${anchoredPhaseKey ?? "out of range"}', which this script declares no expectations ` +
        `for — it seeds '${CBT_PROGRAM_PHASE_KEY}'. Re-phasing the account means re-choosing ` +
        "which milestones and which daily practice the rows have to satisfy, because no two " +
        "phases share them.",
    );
  }

  const today = dayKeyAt(DAYS - 1);
  const derived = {
    started: prefs.cbt_program_started_at !== null,
    graduated: prefs.cbt_program_completed_at !== null,
    // `behavioural`'s two milestones and its daily practice, in the same shape
    // src/features/cbt/program-definition.ts evaluates them.
    activityOnce: activities.some((a) => new Date(a.completed_at).getTime() >= phaseStart),
    exposureLadder: ladders.some((l) => new Date(l.created_at).getTime() >= phaseStart),
    activityDaily: activities.some(
      (a) => capturedDayKey(a.completed_at, a.completed_offset_minutes) === today,
    ),
  };
  const expected = {
    started: true,
    graduated: false,
    ...phaseExpectation.milestones,
    ...phaseExpectation.dailyPractice,
  };

  const disagreements = Object.keys(expected)
    .filter((key) => derived[key] !== expected[key])
    .map((key) => `${key}: anchored ${expected[key]}, derived ${derived[key]}`);
  if (disagreements.length > 0) {
    throw new Error(
      `The seeded CBT programme anchor ('${anchoredPhaseKey}') and the rows behind it ` +
        `disagree — ${disagreements.join("; ")}. The anchor is the input and the rows are ` +
        "generated to satisfy it, so whichever moved, they have to move together.",
    );
  }

  // PARTIALLY complete: a claim about the phase rather than about any one leg,
  // and read off the milestones only, which is what phase completion is made
  // of. Every milestone done is a phase that reads finished, and the
  // expectations above would all still hold if a future edit ticked the open
  // one — this is the check that notices.
  if (Object.values(phaseExpectation.milestones).every(Boolean)) {
    throw new Error(
      `Every milestone of '${anchoredPhaseKey}' is expected done, so the phase would read ` +
        "complete rather than partially complete.",
    );
  }
  if (Object.values(phaseExpectation.dailyPractice).some(Boolean)) {
    throw new Error(
      `Today's practice for '${anchoredPhaseKey}' is expected done. It is deliberately left ` +
        "open — it is the one row a reviewer can exercise on the demo account themselves.",
    );
  }
}

// --------------------------------------------------- ACT: the practice logs
// The six ACT surfaces a person practises ON — defusion, expansion, urge
// surfing, connection, observing self and choice points (#1284) — as opposed to
// the values and committed-action work that follows in #1286.
//
// Same life as the CBT sections above and the same content ceiling: distress
// about performance, standing and relationships, ROLE-ONLY, never about living,
// and every distressing row keeps its answering field filled. The hooks are the
// same ones the rest of the seed already describes — put on the spot in the
// stand-up, the reorg rumours, the review that went badly — met with a
// different move.
//
// VARIANT COVERAGE IS THE POINT OF THIS SLICE (#1181). These tables carry the
// largest set of CHECK-constrained technique columns in the app, and a technique
// card that never renders is exactly the failure this dataset exists to prevent.
// All seven defusion techniques, all six thought categories, all three expansion
// techniques, both discomfort types, all five connection techniques INCLUDING
// `dropAnchor`, and all three observing techniques each get at least one row,
// and `requireEveryVariant` reads that back off the rows rather than off the
// loop that built them.

// The enum-valued columns on this slice's tables. Each list mirrors the CHECK
// constraint on the matching `_data` table and the TypeScript union the app
// reads it through, in src/features/act/types.ts:
//
//   act_defusion_logs.technique_used            DEFUSION_TECHNIQUES
//   act_defusion_logs.thought_category          THOUGHT_CATEGORIES
//   act_expansion_logs.technique_used           EXPANSION_TECHNIQUES
//   act_expansion_logs.discomfort_type          DiscomfortType
//   act_connection_logs.technique               CONNECTION_TECHNIQUES
//   act_observing_self_sessions.technique_used  OBSERVING_TECHNIQUES
//
// ⚠️ Mirrored, not read from the live constraints — the same gap the CBT lists
// above carry, and for the same reason: reading CHECK bodies back needs an RPC
// no migration in this repo provides. ☠️ Two of these have already drifted from
// the migration that CREATED them and are only correct as of a later one —
// `act_connection_logs.technique` gained `dropAnchor` and `bodyScan` in
// 20260550, and `act_observing_self_sessions.technique_used` renamed
// `observingFromBoard` to `skyAndWeather` in 20260557. Read the newest migration
// that touches a column, never the one that introduced it.
const DEFUSION_TECHNIQUES = [
  "havingTheThoughtThat",
  "musicalThoughts",
  "namingTheStory",
  "thankingYourMind",
  "sillyVoices",
  "televisionScreen",
  "subtitles",
];
const THOUGHT_CATEGORIES = [
  "selfJudgment",
  "worry",
  "pastRegret",
  "prediction",
  "ruleStatement",
  "other",
];
const EXPANSION_TECHNIQUES = ["fourStepExpansion", "acceptanceSelfTalk", "acceptanceImagery"];
const DISCOMFORT_TYPES = ["clean", "dirty"];
const CONNECTION_TECHNIQUES = [
  "noticeFiveThings",
  "mindfulActivity",
  "tenDeepBreaths",
  "dropAnchor",
  "bodyScan",
];
const OBSERVING_TECHNIQUES = ["tenDeepBreaths", "skyAndWeather", "bodyAwareness"];

// ☠️ NONE of these six tables carries an occurrence-offset column, so nothing
// records which clock a row was captured on. Every consumer — the five per-day
// list screens, `didOnDate` in the ACT programme, and the server twin
// `program_widget_task_status` — buckets the instant through the VIEWER's
// current timezone instead. Two consequences, and both shape the placement
// below.
//
// FIRST: every row goes in a 10:00-12:00 UTC BAND, via `atUtc` rather than
// `at`. A band centred on 11:00 UTC keeps its intended civil day for 92 of the
// 101 real-world quarter-hour offsets at the 10:00 edge and 97 at the 11:59
// edge; the evening bands the tools blocks use would hold for as few as 64.
// Supported range is UTC-11 through UTC+12:45 — UTC+13 and UTC+14 are knowingly
// unsupported for exact day placement, which is a choice this comment records
// rather than a bug.
//
// SECOND: two BOUNDARY MARGINS, which are the only things a drift can actually
// break. Maximum drift is one day, so a two-day margin survives it even outside
// the supported band:
//   - the last defusion row sits two days before today, so "nothing unhooked
//     today" cannot flip; and
//   - the last expansion and urge-surf rows sit two days before the phase
//     start, so "nothing since the phase began" cannot flip.
// Together they keep `openUp`'s make-room milestone legitimately open and its
// daily practice open, which is #1178's ruling and the one row a reviewer can
// exercise on the demo account themselves.
const ACT_BAND_START_HOUR = 10;
const ACT_BAND_END_HOUR = 12;
const ACT_BAND_MINUTES = (ACT_BAND_END_HOUR - ACT_BAND_START_HOUR) * 60;

// The current ACT phase start, as a day index into the rolling window (#1178):
// `openUp`, index 2 of 4, a couple of days behind CBT's phase start rather than
// on the same day, because one person taking up two programmes on the same
// afternoon is the tell of generated data. The rows below are generated to
// SATISFY it — defusion rows well inside it so `unhookOnce` reads done, and no
// expansion or urge-surf row after it so `makeRoomOnce` stays open.
//
// ⚠️ Kept LATE on purpose. Everything expansion and urge surfing are allowed to
// hold stops two days before this day, so the stretch between it and today is
// one those two surfaces cannot fill — and it is exactly as long as the phase is
// old. A phase start early in the window would leave them looking abandoned for
// a third of it. The gap is the STORY here (they entered `openUp`, unhooked, and
// have not made room yet), so it is kept as short as the ruling allows rather
// than removed.
//
// ☠️ #1286 writes the anchor to `user_preferences` and asserts the derived
// programme state back against these rows, exactly as #1282 did for CBT. It must
// anchor FROM THIS CONSTANT rather than declare its own: nothing in this slice
// persists the anchor, so a second, different day chosen there would move the
// phase out from under the margins below without anything failing.
const ACT_PHASE_STARTED_DAY = 78;

// The instants the future-clamp pulled out of the band, by epoch millisecond.
//
// Only ever TODAY's rows, and only on a run that starts before the band closes:
// `atUtc` clamps a future instant back to just-passed, which is the same trade
// every other block in this script makes for today's rows. Recorded rather than
// waved through so the band check below can excuse exactly these and nothing
// else.
const clampedOutOfBand = new Set();

/** A timestamp `minutesIntoBand` into the 10:00-12:00 UTC band on day `dayIndex`. */
function inBand(dayIndex, minutesIntoBand) {
  if (
    !Number.isInteger(minutesIntoBand) ||
    minutesIntoBand < 0 ||
    minutesIntoBand >= ACT_BAND_MINUTES
  ) {
    throw new Error(
      `inBand() takes 0-${ACT_BAND_MINUTES - 1} minutes into the band, got ${minutesIntoBand}.`,
    );
  }
  const iso = atUtc(dayIndex, ACT_BAND_START_HOUR, minutesIntoBand);
  if (new Date(iso).getUTCHours() < ACT_BAND_START_HOUR) {
    clampedOutOfBand.add(new Date(iso).getTime());
  }
  return iso;
}

/**
 * Anywhere inside the band on day `dayIndex` — what almost every row here wants.
 *
 * Urge surfing is the one caller that does not use it, because its completion
 * lands up to twenty minutes after its start and both have to stay in the band.
 */
function somewhereInBand(dayIndex) {
  return inBand(dayIndex, between(0, ACT_BAND_MINUTES - 1));
}

/**
 * The UTC instant the band OPENS on day `dayIndex`, in epoch millis.
 *
 * The margin checks compare band edge to band edge rather than counting 48
 * hours back from `now`: every row sits somewhere inside a two-hour band, so a
 * fixed-hours comparison rejects a correctly placed row whenever the run starts
 * earlier in the day than the row it is measuring. Unclamped on purpose — these
 * are boundaries to measure against, not timestamps to store.
 */
function bandOpensAt(dayIndex) {
  const d = dayAt(dayIndex);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), ACT_BAND_START_HOUR, 0, 0, 0);
}

/** The UTC instant the band CLOSES on day `dayIndex`, in epoch millis. */
function bandClosesAt(dayIndex) {
  const d = dayAt(dayIndex);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), ACT_BAND_END_HOUR, 0, 0, 0);
}

// ☠️ ALL FIVE ACT LIST SCREENS ARE PER-DAY VIEWS, and `useSelectedDate()` is
// hardcoded to `currentDateKey()` with no setter anywhere in the app — so they
// can only ever show TODAY. A row on any other day is unreachable through the
// UI, which is why connection, observing self and choice points each get a row
// dated today below. (Urge surfing is the exception that proves it: it has no
// list route at all, only an inline recent strip, and that strip is not
// day-filtered.)
//
// Defusion and expansion CANNOT have a row today. Both feed `openUp`'s daily
// practice, which #1178 rules deliberately open, so their list screens open on
// their empty state even on a fully seeded account. That is a genuine conflict
// inside #1284's own acceptance criteria — "all six screens render seeded
// content" against the two boundary margins — and the margins win, because they
// are the constraint with a reason and an owner ruling behind them. Raised on
// the issue: it wants a product decision about the per-day views, not a quieter
// seed.
const ACT_TODAY = DAYS - 1;

// ------------------------------------------------------------- defusion
{
  // The fused thought has to belong to the category filed against it, so the
  // pools are keyed by category rather than drawn from one bag — a `pastRegret`
  // row carrying a prediction reads fine in a list and wrong the moment anyone
  // opens it.
  const fusedThoughts = {
    selfJudgment: [
      "I'm the least capable person on that call.",
      "I only got here because nobody looked closely.",
      "I sound like someone doing an impression of knowing.",
    ],
    worry: [
      "If this slips it lands on me, and everyone will see whose it was.",
      "The reorg rumours mean my name is on a list somewhere.",
      "Someone is going to ask the one question I can't answer.",
    ],
    pastRegret: [
      "I should have said something in that review and I sat there.",
      "I let the wrong version go out and I still think about it.",
      "I went quiet after the stand-up instead of clearing it up.",
    ],
    prediction: [
      "Tomorrow's demo is going to come apart in front of everyone.",
      "They'll read the summary and see how thin it is.",
      "I'll freeze again the moment it's my turn.",
    ],
    ruleStatement: [
      "I have to have the answer ready before anyone asks for it.",
      "I should never need something explained twice.",
      "I must not be the one who slows the room down.",
    ],
    other: [
      "Everyone can tell how hard I'm working to look calm.",
      "The room went quiet because of something I did.",
      "There's a version of me who finds this easy and it isn't this one.",
    ],
  };

  // The defused version is the ANSWERING FIELD every distressing row has to keep
  // filled (#1180), and it is technique-shaped: the whole point of the seven is
  // that they do the same job differently.
  const defusedVersions = {
    havingTheThoughtThat:
      "I'm having the thought that this goes badly. Said that way it sits still.",
    musicalThoughts: "Sang it to the birthday tune on the walk in. Same words, no weight left.",
    namingTheStory: "There it is — the “I'll be found out” story, running again.",
    thankingYourMind: "Thanks, mind. You're trying to keep me safe. I can take this bit from here.",
    sillyVoices: "Ran it in a cartoon voice until I heard how much of it was auditioning.",
    televisionScreen: "Put it on a screen across the room and let it scroll past me.",
    subtitles: "Read it as a subtitle along the bottom and kept watching the picture.",
  };

  // Empty is a complete row — the form does not require a note — so the pool
  // carries one, which is the only way that shape ever renders.
  const notes = [
    "Did it in the ten minutes before the call rather than picking it apart after.",
    "Easier standing on the balcony than sitting at the desk with it.",
    "Took two goes. The second one landed.",
    "Wrote it down first. Saying it out loud was too much today.",
    "Went back into the meeting instead of drafting a message about the meeting.",
    "",
    "",
  ];

  // A stride, not a count (#1181): roughly twice a week, tightening through the
  // setback because a struggling stretch is when someone logs more, and running
  // right up to the margin so the dataset does not peter out into what reads as
  // an abandoned account.
  //
  // ☠️ The last row must land on or before ACT_TODAY - 2, and one has to land
  // well inside the current phase. A stride cannot be trusted to hit either, so
  // both days are added explicitly and both are asserted after the insert.
  const lastDefusionDay = ACT_TODAY - 2;
  const days = new Set();
  for (let d = 6; d <= lastDefusionDay; d += inSetback(d) ? between(1, 2) : between(3, 6)) {
    days.add(d);
  }
  days.add(ACT_PHASE_STARTED_DAY + 2);
  days.add(lastDefusionDay);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d, i) => {
      // Cycled rather than picked, so coverage holds at any row count: seven
      // techniques against six categories are coprime, so the pairing keeps
      // moving for 42 rows before it repeats itself.
      const technique = DEFUSION_TECHNIQUES[i % DEFUSION_TECHNIQUES.length];
      const category = THOUGHT_CATEGORIES[i % THOUGHT_CATEGORIES.length];
      const arc = improvement(d);
      // Fusion falls as the skill comes in, and the drop is a PROPORTION of
      // where the row started: a fixed subtraction takes a mild row to zero and
      // reads as a bug the first time it does.
      const before = Math.max(20, Math.min(100, Math.round(88 - 24 * arc) + between(-6, 6)));
      const after = Math.max(5, Math.round(before * (0.74 - 0.2 * arc)));
      const createdAt = somewhereInBand(d);
      return {
        user_id: DEMO_USER_ID,
        fused_thought: pick(fusedThoughts[category]),
        thought_category: category,
        fusion_level_before: before,
        technique_used: technique,
        defused_version: defusedVersions[technique],
        fusion_level_after: after,
        notes: pick(notes),
        created_at: createdAt,
        updated_at: createdAt,
      };
    });

  counts.act_defusion_logs = await insert("act_defusion_logs", rows);
}

// ------------------------------------------------------------ expansion
{
  const emotions = [
    "Dread",
    "Shame",
    "Anxiety",
    "Frustration",
    "Restlessness",
    "Flatness",
    "Embarrassment",
  ];
  const bodySensations = [
    "Tight band across the chest.",
    "Stomach dropping, like missing a stair.",
    "Jaw locked without noticing.",
    "Hands cold and buzzing.",
    "Throat narrowing when it was my turn.",
    "Shoulders up somewhere near my ears.",
  ];
  const notes = [
    "Sat with it for four minutes on the balcony instead of finding something to do.",
    "Breathed around it rather than into it. That was the difference.",
    "It moved. Not away — just around, which was enough to carry on.",
    "Named it out loud once. Felt daft, worked anyway.",
    "Made room for it and answered the message anyway.",
    "",
  ];

  // ☠️ Every row on or before ACT_PHASE_STARTED_DAY - 2, so `makeRoomOnce` stays
  // open however the viewer's clock is set. The setback sits inside that window,
  // so the cluster still lands where the rest of the seed bends.
  const lastExpansionDay = ACT_PHASE_STARTED_DAY - 2;
  const days = new Set();
  for (let d = 4; d <= lastExpansionDay; d += inSetback(d) ? between(1, 2) : between(3, 6)) {
    days.add(d);
  }
  days.add(lastExpansionDay);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d, i) => {
      const technique = EXPANSION_TECHNIQUES[i % EXPANSION_TECHNIQUES.length];
      const arc = improvement(d);
      const before = Math.max(20, Math.min(100, Math.round(82 - 20 * arc) + between(-6, 6)));
      // One row where the intensity does NOT come down. The detail screen has a
      // whole branch for that — `noIntensityDrop` — and sitting with something
      // that stays put is the honest half of this practice, not a failure of it.
      const stuck = i === 2;
      const after = stuck
        ? Math.min(100, before + between(0, 4))
        : Math.max(8, Math.round(before * (0.78 - 0.18 * arc)));
      // The struggle switch is a three-state field: on, off, and never asked.
      // ☠️ The detail screen renders `discomfort_type` only INSIDE the switch
      // block, so a row with a null switch draws no discomfort type however it
      // is filled — which is why the null row leaves the type null too rather
      // than carrying a variant nothing will ever render.
      const switchAsked = i !== 5;
      const createdAt = somewhereInBand(d);
      return {
        user_id: DEMO_USER_ID,
        emotion: emotions[i % emotions.length],
        body_sensation: pick(bodySensations),
        intensity_before: before,
        struggle_switch_on: switchAsked ? arc < 0.5 || chance(0.35) : null,
        discomfort_type: switchAsked ? DISCOMFORT_TYPES[i % DISCOMFORT_TYPES.length] : null,
        technique_used: technique,
        intensity_after: after,
        notes: pick(notes),
        created_at: createdAt,
        updated_at: createdAt,
      };
    });

  counts.act_expansion_logs = await insert("act_expansion_logs", rows);
}

// ------------------------------------------------------------ urge surf
{
  // The urge here is the AVOIDANCE urge the rest of the seed already names as
  // the maintaining behaviour — the pull to get out of the room — rather than
  // anything that would read as a substance narrative (#1180).
  const urges = [
    "Send the “shall we do this async?” message and skip the meeting.",
    "Rewrite the update a sixth time before posting it.",
    "Open the laptop at 2am to check nobody replied badly.",
    "Move the one-to-one again.",
    "Reply to the feedback straight away with a defence.",
    "Leave the terrace mid-conversation and go back to the desk.",
    "Take the meeting off my calendar and hope it isn't noticed.",
    "Say I'll follow up in writing so I don't have to answer now.",
  ];
  const triggers = [
    "Calendar invite landed with no agenda on it.",
    "Reorg rumours in the group chat again.",
    "A one-word reply on a thread I'd worked hard on.",
    "Asked to present at short notice.",
    "Silence after I finished speaking.",
    "Someone else's name on the piece I thought was mine.",
  ];
  const surfingNotes = [
    "Rode it for about eight minutes on the balcony. It peaked and came down on its own.",
    "Counted it up and counted it down. Never got as high as it felt at the start.",
    "Stayed in the chair. The urge got bored before I did.",
    "Watched it like weather rather than an instruction.",
    "It came back twice. Smaller each time.",
  ];

  // ☠️ Same margin as expansion — `makeRoomOnce` counts expansion AND urge-surf
  // rows since the phase start, so a single late urge-surf row closes the
  // milestone on its own.
  //
  // ⚠️ This feature has NO list route: it surfaces only as the inline recent
  // strip on the urge-surf screen itself, at `useUrgeSurfLogs(userId, 5)`. Only
  // the newest five are ever visible, so the stride only has to clear five — but
  // it clears it comfortably rather than exactly, because a dataset sized to the
  // current limit breaks on the day the limit moves.
  const lastUrgeDay = ACT_PHASE_STARTED_DAY - 2;
  const days = new Set();
  for (let d = 7; d <= lastUrgeDay; d += inSetback(d) ? between(2, 3) : between(5, 9)) {
    days.add(d);
  }
  days.add(lastUrgeDay);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d, i) => {
      const arc = improvement(d);
      // Capped short of the band's end so the completion, which lands 8-20
      // minutes later, stays inside the band too.
      const createdAt = inBand(d, between(0, ACT_BAND_MINUTES - 25));
      const completedAt = new Date(
        new Date(createdAt).getTime() + between(8, 20) * 60_000,
      ).toISOString();
      return {
        user_id: DEMO_USER_ID,
        urge_description: urges[i % urges.length],
        trigger: pick(triggers),
        peak_intensity: Math.max(25, Math.min(100, Math.round(84 - 22 * arc) + between(-7, 7))),
        surfing_notes: pick(surfingNotes),
        // Acting on it is where this starts, and it thins out rather than
        // stopping dead — the early rows are mostly a description of the
        // avoidance, the later ones of riding it out.
        urge_acted_on: chance(0.55 - 0.45 * arc),
        completed_at: completedAt,
        created_at: createdAt,
        updated_at: createdAt,
      };
    });
  counts.act_urge_surf_logs = await insert("act_urge_surf_logs", rows);
}

// ----------------------------------------------------------- connection
{
  const activityContexts = [
    "Washing up after dinner.",
    "Walking down to the tram.",
    "Waiting for the call to start.",
    "On the terrace before anyone else was up.",
    "In the sea, early, before the beach filled up.",
    "Standing in the queue at the bakery.",
    "Folding washing on the balcony.",
  ];
  // Blank is a complete row, and the detail screen FALLS BACK to the technique
  // name for its heading when it is — a branch nothing renders unless a blank
  // row exists.
  const noticings = [
    "Warm water, the weight of the plate, the noise off the street below.",
    "Five things I could see, four I could hear, the rail cold under my hand.",
    "Salt, the drag of the water, my own breathing louder than I expected.",
    "The chair under me. Feet on the floor. The room, still there.",
    "Bread, coffee, someone laughing two people ahead in the queue.",
    "",
  ];
  const notes = [
    "Two minutes was enough to stop the spin.",
    "Did it before the meeting rather than after it went badly.",
    "Kept drifting off and coming back. Coming back is the exercise.",
    "N. was there and didn't need it explaining.",
    "Anchored, then went back in and asked my question.",
    "",
  ];

  const buildRow = (d, i) => {
    const arc = improvement(d);
    const createdAt = somewhereInBand(d);
    return {
      user_id: DEMO_USER_ID,
      technique: CONNECTION_TECHNIQUES[i % CONNECTION_TECHNIQUES.length],
      activity_context: pick(activityContexts),
      notices_from_senses: pick(noticings),
      duration_minutes: between(2, 15),
      mood_after: Math.max(1, Math.min(10, Math.round(5 + 2.5 * arc) + between(-1, 1))),
      notes: pick(notes),
      created_at: createdAt,
      updated_at: createdAt,
    };
  };

  // No margin here — nothing in the CURRENT phase reads connection logs, so
  // these run right up to and including today. `dropAnchorDaily` and
  // `bePresentDaily` belong to `foundation` and `bePresent`, and only the
  // current phase ever renders.
  const days = new Set();
  for (let d = 3; d < ACT_TODAY; d += inSetback(d) ? between(1, 2) : between(2, 5)) {
    days.add(d);
  }

  const rows = [...days].sort((a, b) => a - b).map(buildRow);

  // TODAY, twice. The reason is the LIST SCREEN, which shows only today: a
  // single row opens it on one entry, a thinner picture than this account has
  // and one that reads as a surface barely used.
  //
  // Two of a KIND rather than two of anything, because `dropAnchor` is a subset
  // of connection rather than a separate table and the app splits the table on
  // it in two places — `getLatestConnectionLogAt` filters by technique for
  // Home's drop-anchor row, and the `foundation` and `bePresent` daily legs
  // partition it between `technique = 'dropAnchor'` and everything else.
  // ⚠️ Those two legs do NOT render at the seeded phase, which is `openUp`, so
  // this is not what keeps them open today — it is what keeps the picture honest
  // if the account is ever re-phased, and it is what puts drop-anchor in front of
  // a reviewer at all.
  rows.push(
    { ...buildRow(ACT_TODAY, rows.length), technique: "dropAnchor" },
    { ...buildRow(ACT_TODAY, rows.length + 1), technique: "mindfulActivity" },
  );

  counts.act_connection_logs = await insert("act_connection_logs", rows);
}

// ------------------------------------------------------- observing self
{
  const observations = [
    "The thoughts kept arriving. The part of me watching them didn't change size.",
    "Ten breaths and the dread was still there, but I was bigger than the room again.",
    "Storm over the top, sky underneath it, unbothered.",
    "Noticed my hands before I noticed the story about my hands.",
    "The “I'll be found out” line went past like weather rather than news.",
    "",
  ];
  const notes = [
    "Easier lying down than sitting.",
    "Set a timer so I'd stop checking how long was left.",
    "Did it on the balcony at first light.",
    "Harder on a bad day, which is presumably the point.",
    "",
  ];

  // Runs to today: `observeSelfOnce` is a `bePresent` milestone and the account
  // sits in `openUp`, so nothing in the current phase reads these.
  const days = new Set();
  for (let d = 5; d < ACT_TODAY; d += inSetback(d) ? between(2, 3) : between(4, 8)) {
    days.add(d);
  }
  days.add(ACT_TODAY);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d, i) => {
      const arc = improvement(d);
      const createdAt = somewhereInBand(d);
      return {
        user_id: DEMO_USER_ID,
        technique_used: OBSERVING_TECHNIQUES[i % OBSERVING_TECHNIQUES.length],
        what_was_observed: pick(observations),
        duration_minutes: between(3, 20),
        mood_after: Math.max(1, Math.min(10, Math.round(5 + 2.5 * arc) + between(-1, 1))),
        notes: pick(notes),
        created_at: createdAt,
        updated_at: createdAt,
      };
    });

  counts.act_observing_self_sessions = await insert("act_observing_self_sessions", rows);
}

// -------------------------------------------------------- choice points
{
  // Hook, away move, toward move — the three columns the worksheet asks for, and
  // the away move is never left as the last word: every one of these carries the
  // toward move that answers it.
  const worksheets = [
    {
      hooks: ["Put on the spot in the stand-up", "“I'll be found out”"],
      awayMoves: ["Went quiet", "Avoided the follow-up questions afterwards"],
      towardMoves: ["Asked for a minute to think", "Gave the honest half-answer"],
      notes: "The half-answer was fine. Nobody wanted the whole thing on the spot.",
    },
    {
      hooks: ["Reorg rumours back in the group chat"],
      awayMoves: ["Refreshed the thread all afternoon", "Rewrote a message I never sent"],
      towardMoves: ["Closed the tab and finished the work in front of me"],
      notes: "Nothing I did to the thread changed the thread.",
    },
    {
      hooks: ["Feedback on the summary"],
      awayMoves: ["Started a defence in my head before I'd finished reading it"],
      towardMoves: ["Read it twice", "Asked which part they meant"],
      notes: "It was one paragraph, not the whole document.",
    },
    {
      hooks: ["Asked to present at short notice"],
      awayMoves: ["Looked for a reason to hand it over"],
      towardMoves: ["Said yes and blocked an hour to prepare"],
      notes: "",
    },
    {
      hooks: ["Quiet evening at home after a hard day"],
      awayMoves: ["Went back to the laptop rather than sit with it"],
      towardMoves: ["Stayed on the balcony with N.", "Said what the day had actually been like"],
      notes: "Saying it out loud took less time than the evening I'd have spent not saying it.",
    },
    {
      // Empty hooks: the list screen and the detail screen both branch on
      // whether there are any, and a worksheet started from the moves rather
      // than the hook is a complete one.
      hooks: [],
      awayMoves: ["Skipped the retro"],
      towardMoves: ["Went to the next one and put my thing on the board first"],
      notes: "",
    },
  ];

  // Sparser than the practice logs on purpose: a choice-point worksheet is a
  // sit-down piece of work rather than something done in the gaps of a day.
  const days = new Set();
  for (let d = 9; d < ACT_TODAY; d += inSetback(d) ? between(3, 5) : between(8, 14)) {
    days.add(d);
  }
  days.add(ACT_TODAY);

  const rows = [...days]
    .sort((a, b) => a - b)
    .map((d, i) => {
      const worksheet = worksheets[i % worksheets.length];
      const createdAt = somewhereInBand(d);
      return {
        user_id: DEMO_USER_ID,
        hooks: worksheet.hooks,
        away_moves: worksheet.awayMoves,
        toward_moves: worksheet.towardMoves,
        notes: worksheet.notes,
        created_at: createdAt,
        updated_at: createdAt,
      };
    });
  counts.act_choice_points = await insert("act_choice_points", rows);
}

// -------------------------------- ACT band and boundary margins, read back
// Read back OUT of the database rather than checked against the arrays above:
// that also proves the rows survived the encrypted views carrying the timestamps
// they were given, which is the other way this can silently go wrong. Everything
// here is about WHEN, because when is the only thing these tables cannot record
// for themselves.
{
  const bandTables = [
    "act_defusion_logs",
    "act_expansion_logs",
    "act_urge_surf_logs",
    "act_connection_logs",
    "act_observing_self_sessions",
    "act_choice_points",
  ];

  /** Every `created_at` the demo account holds in `table`, as epoch millis. */
  async function createdAtMillis(table) {
    const { data, error } = await admin
      .from(table)
      .select("created_at")
      .eq("user_id", DEMO_USER_ID);
    if (error) throw new Error(`act band read-back (${table}): ${error.message}`);
    if (data.length === 0) throw new Error(`act band read-back (${table}): no rows came back.`);
    return data.map((row) => new Date(row.created_at).getTime());
  }

  const seeded = {};
  for (const table of bandTables) seeded[table] = await createdAtMillis(table);

  // VARIANT COVERAGE, off the rows the database returns rather than the arrays
  // that built them. The enum columns are plaintext pass-throughs on the `_data`
  // tables, so they come back readable — and reading them back is what makes
  // this cover the encrypted views too: a variant that a write trigger's
  // `coalesce` default quietly replaced looks correct in memory and wrong here,
  // which is the whole reason the band check below reads back as well.
  const variantChecks = [
    ["act_defusion_logs", "technique_used", DEFUSION_TECHNIQUES],
    ["act_defusion_logs", "thought_category", THOUGHT_CATEGORIES],
    ["act_expansion_logs", "technique_used", EXPANSION_TECHNIQUES],
    ["act_expansion_logs", "discomfort_type", DISCOMFORT_TYPES],
    ["act_connection_logs", "technique", CONNECTION_TECHNIQUES],
    ["act_observing_self_sessions", "technique_used", OBSERVING_TECHNIQUES],
  ];
  for (const [table, column, variants] of variantChecks) {
    const { data, error } = await admin.from(table).select(column).eq("user_id", DEMO_USER_ID);
    if (error) throw new Error(`act variant read-back (${table}.${column}): ${error.message}`);
    requireEveryVariant(`${table}.${column}`, variants, data, column);
  }

  const strays = [];
  for (const table of bandTables) {
    for (const millis of seeded[table]) {
      if (clampedOutOfBand.has(millis)) continue;
      const hour = new Date(millis).getUTCHours();
      if (hour < ACT_BAND_START_HOUR || hour >= ACT_BAND_END_HOUR) {
        strays.push(`${table} at ${new Date(millis).toISOString()}`);
      }
    }
  }
  if (strays.length > 0) {
    throw new Error(
      `${strays.length} ACT row(s) sit outside the ${ACT_BAND_START_HOUR}:00-` +
        `${ACT_BAND_END_HOUR}:00 UTC band — ${strays.slice(0, 3).join("; ")}. These tables store ` +
        "no captured offset, so a row outside the band changes civil day for viewers the band " +
        "was chosen to cover. Place it with `inBand`, not `at`.",
    );
  }

  // The two margins, each measured band edge to band edge. A row is late if it
  // reaches PAST the close of the band on its deadline day, which is a two-day
  // gap however early in the day the seed happens to run.
  const makeRoomOnce =
    "`makeRoomOnce`, which counts expansion and urge-surf rows since the phase start";
  // ☠️ The deadline days here are RESTATED rather than shared with the loops that
  // built the rows, and that is the point: a check reading the same constant the
  // generator read moves with it, so nudging the generator would nudge the
  // deadline and the check would pass on any placement at all. Two independent
  // statements of the same rule is what gives this something to disagree with.
  const margins = [
    {
      table: "act_defusion_logs",
      latestAllowedDay: ACT_TODAY - 2,
      breaks:
        "“nothing unhooked today” — `openUp`'s daily practice would read done on a " +
        "viewer clock a day behind the seeding machine's",
    },
    {
      table: "act_expansion_logs",
      latestAllowedDay: ACT_PHASE_STARTED_DAY - 2,
      breaks: makeRoomOnce,
    },
    {
      table: "act_urge_surf_logs",
      latestAllowedDay: ACT_PHASE_STARTED_DAY - 2,
      breaks: makeRoomOnce,
    },
  ];

  for (const margin of margins) {
    const latest = Math.max(...seeded[margin.table]);
    const deadline = bandClosesAt(margin.latestAllowedDay);
    if (latest > deadline) {
      throw new Error(
        `The newest ${margin.table} row is ${new Date(latest).toISOString()}, past the ` +
          `${new Date(deadline).toISOString()} boundary this slice keeps two days clear. ` +
          `A timezone drift of one day would then flip ${margin.breaks}.`,
      );
    }
  }

  // The other side of the same ruling: `unhookOnce` is DONE, so a defusion row
  // has to sit comfortably INSIDE the phase. Two days clear of the phase start
  // for the same reason the deadlines are — #1286 writes that anchor off the
  // machine's local clock while these rows are pinned to UTC, so the two can sit
  // up to a day apart before anything is actually wrong.
  const insidePhase = seeded.act_defusion_logs.filter(
    (millis) => millis >= bandOpensAt(ACT_PHASE_STARTED_DAY + 2),
  );
  if (insidePhase.length === 0) {
    throw new Error(
      "No defusion row lands inside the current ACT phase, so `unhookOnce` would read undone. " +
        "#1178 rules `openUp` PARTIALLY complete: unhooked once, room not yet made.",
    );
  }
}

// ---------------------------------------------------------------------- done
// Wiping a table without refilling it is how the demo account quietly loses a
// surface forever: the rows go, nothing replaces them, and the only symptom is
// an empty screen nobody happens to open. Every table this run cleared must end
// it with rows.
//
// Checked BEFORE the summary prints, so a failed run never opens with a line
// claiming the account was seeded.
const wipedButEmpty = CBT_ACT_WIPE_TABLES.filter((table) => !counts[table]);
if (wipedButEmpty.length > 0) {
  console.error("Insert counts for this run:");
  for (const [table, n] of Object.entries(counts)) console.error(`  ${table}: ${n}`);
  throw new Error(
    `Wiped but not re-seeded: ${wipedButEmpty.join(", ")}. ` +
      "Every table in CBT_ACT_WIPE_TABLES must end the run with a non-zero insert count.",
  );
}

console.log("Seeded demo@test.local:");
for (const [table, n] of Object.entries(counts)) console.log(`  ${table}: ${n}`);

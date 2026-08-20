// Seed the LOCAL demo account (demo@test.local) with ~3 months of realistic
// data across the eight tools and the CBT module, so redesigned surfaces can be
// reviewed with real density: paging, heatmap depth, distribution spread, week
// history, and every technique, status and category variant rendered at least
// once.
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
  const d = dayAt(dayIndex);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, "0")}`;
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
 * Unused today: it lands with the groundwork (#1280) and its first callers are
 * the CBT and ACT content slices that follow.
 */
// eslint-disable-next-line no-unused-vars -- see the note above
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
    const { data, error } = await admin.from("habits").insert(habit).select("id").single();
    if (error) throw new Error(`habits: ${error.message}`);
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
          habit_id: data.id,
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
// Each slice adds the parents and standalone tables it seeds. All four below
// are standalone — the CBT thinking spine has no chains (#1281).
const CBT_ACT_WIPE_TABLES = ["thought_records", "core_beliefs", "activity_logs", "self_care_logs"];

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

const nat = (text, beliefRating, isHotThought = false) => ({ text, beliefRating, isHotThought });

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

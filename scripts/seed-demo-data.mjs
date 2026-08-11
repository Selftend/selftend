// Seed the LOCAL demo account (demo@test.local) with ~3 months of realistic
// data across all eight tools, so redesigned surfaces can be reviewed with
// real density: paging, heatmap depth, distribution spread, week history.
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

// Timezone: Bulgaria in summer (EEST, UTC+3). All captured-frame offsets use it.
const OFFSET_MINUTES = 180;

// The seeded window: ~3 months ending today. `new Date()` is fine here — the
// script runs in plain Node, and the dataset should always end "today".
const DAYS = 89;
const end = new Date();
end.setHours(12, 0, 0, 0);

/** Local-civil-day at index i (0 = oldest), at local hour/minute. */
function at(dayIndex, hour, minute = 0) {
  const d = new Date(end);
  d.setDate(d.getDate() - (DAYS - 1 - dayIndex));
  // The Date is built in this machine's local time; treat it as EEST wall time.
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
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
        logged_offset_minutes: OFFSET_MINUTES,
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
      occurred_offset_minutes: OFFSET_MINUTES,
      created_at: occurredAt,
    });
    day += between(2, 5);
  }
  counts.journal_entries = await insert("journal_entries", rows);
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
    ["Evening wind-down", 16, 10], // matches the custom exercise below
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
      completed_offset_minutes: OFFSET_MINUTES,
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
      completed_offset_minutes: OFFSET_MINUTES,
      created_at: completedAt,
    });
  }
  counts.mindfulness_sessions = await insert("mindfulness_sessions", rows);
}

// ------------------------------------------------- breathing custom exercise
{
  await wipe("breathing_exercises");
  counts.breathing_exercises = await insert("breathing_exercises", [
    {
      user_id: DEMO_USER_ID,
      name: "Evening wind-down",
      inhale_seconds: 4,
      hold_in_seconds: 4,
      exhale_seconds: 6,
      hold_out_seconds: 2,
      cycles: 10,
      color: "think",
    },
  ]);
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
      completed_offset_minutes: OFFSET_MINUTES,
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
      sleepWindow = JSON.stringify({
        startedAt: started.toISOString(),
        startedOffsetMinutes: OFFSET_MINUTES,
        endedAt: ended.toISOString(),
        endedOffsetMinutes: OFFSET_MINUTES,
      });
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
      logged_offset_minutes: OFFSET_MINUTES,
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
      logged_offset_minutes: OFFSET_MINUTES,
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

// ---------------------------------------------------------------------- done
console.log("Seeded demo@test.local:");
for (const [table, n] of Object.entries(counts)) console.log(`  ${table}: ${n}`);

// Seed the LOCAL demo account (demo@test.local) with ~3 months of realistic
// data across the eight tools, the CBT module, the ACT module and the routines
// built from both, so redesigned surfaces can be reviewed with real density:
// paging, heatmap depth, distribution spread, week history, and every technique,
// status and category variant rendered at least once.
//
// EVERY WORD OF THE CONTENT BELOW IS FABRICATED. It describes one invented
// person consistently — that is what makes the screens readable — but no real
// person, employer, event or relationship is recorded here, and nothing in it is
// clinical material. It is also local-only and never reaches public media: the
// store and marketing pipelines all run against the production demo account.
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
//
// WHAT THIS CANNOT REACH (the permanent gaps, also in supabase/README.md):
// - The thought-record intro card. `selftend:cbt:thoughtRecordIntroDismissed`
//   is AsyncStorage plus zustand, device-local by design; no server-side seed
//   can dismiss it.
// - The routine reminder permission prompt. It fires inside
//   `ensureReminderChannel` at the moment a reminder is enabled, and seeding is
//   exactly what bypasses that call, so no fixture can ever produce it. The
//   reminder section itself is NOT a gap: it already renders in the editor for
//   any routine that is not `on-demand`, time field and all.
// - Home's routines row reading "Nothing scheduled today". It needs every
//   routine unscheduled today, which is mutually exclusive with this script's
//   own guard that some scheduled routine always has an open step — the guard
//   that keeps the floating progress button visible. The button wins.
// - A `custom` cadence, deliberately never seeded, so `schedule.customDays` and
//   its Bulgarian weekday join render nowhere. Days nobody chose is a lie a
//   reviewer finds the moment they open the editor (#1524); tests cover the
//   strings instead.
// - `schedule.weekdays` on the routines list. The one `weekdays` routine is
//   complete every day by construction, and that label only renders on an
//   off-day card that is also quiet, so it may go unseen on any given weekend.
//   The `weekdays` cadence is seeded for the strip's not-scheduled cell, which it
//   delivers every day of the week.
// - UTC+13 and UTC+14. The ACT tables carry no captured-offset column, so their
//   rows are pinned to a UTC band that resolves to the intended civil day from
//   −11 through +12 and can slip a day further east.

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

/**
 * The civil day an instant was captured on, read off the PAIR a row stores —
 * the same shift the client's `entryDayKey` and the server's
 * `public.occurrence_day_key` both apply.
 *
 * A null offset falls back to the seeding machine's local day, which is exactly
 * where the RPC's `coalesce` and the client's `toLocalDateKey` put such a row.
 * Declared once and shared: two copies of this rule can disagree about a day
 * without either one looking wrong, and every check that reads a row back out
 * of the database resolves its day through here.
 */
function capturedDayKey(instant, offsetMinutes) {
  return offsetMinutes == null
    ? localDayKey(new Date(instant))
    : new Date(new Date(instant).getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
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
// `selected_concerns` and `enabled_modules` are the onboarding answers demo's Home
// layout below is DERIVED from, and they move with it (#1352). Neither steers
// anything live today — `START_HERE_TARGETS` has no consumer outside `concerns.ts`,
// and `enabled_modules` is only ever written, never read as a gate — so both are
// seeded as documentation-in-data: without them the fourteen ids are a list nobody
// can explain, which is the state the decision refused. `widgets_seeded` is the same
// character: only the RPC writes it and nothing live reads it, but it is what a real
// wizard run leaves behind.
//
// `app_onboarding_completed_via` / `_at` are deliberately NOT touched. Demo already
// reads as a completed-onboarding account and they are part of no decision here.
//
// ☠️ `reminder_consent` is seeded TRUE here, and the false this upsert used to
// write is the defect #1525 named (#1271). Consent is a hard DELIVERY gate —
// `send-web-reminders/index.ts` continues on a falsy one, and `enableTargetPatch`
// always writes consent beside the enabled column so no surface can arm a
// reminder without it — while `supabase/seed.sql` gives demo an armed CBT
// reminder at 20:00 Europe/Sofia. A false here therefore produced a state NO USER
// PATH CAN PRODUCE: the Reminders screen drew the row as armed and the server
// could never send it. The old `reminder_consent_updated_at` beside it made it
// worse, because false + a non-null timestamp is the DECLINED shape, which
// permanently withholds the one-time contextual reminder prompt on every tool —
// and declined has no positive rendering, so it cost a surface and bought
// nothing.
//
// WRITTEN rather than merely left alone. #1525 framed the fix as deleting two
// lines, and on a full `npm run db:reset` that is enough: seed.sql sets consent
// true first and an upsert only touches the columns it names. But `db:seed:demo`
// is a standing command that runs against whatever the account has drifted to,
// and a reviewer who declines a prompt in the app would leave a row this script
// could then neither repair nor explain — it would simply fail the consent guard
// at the end of the file. Every other preference here is written for the same
// reason. `reminder_consent_updated_at` is deliberately NOT written: seed.sql's
// relative timestamp is realistic and a true consent does not depend on it.
//
// Consent is a PERMISSION, not a nudge. The quiet-by-default guardrail bites on
// the per-tool enabled flags, and every target other than CBT stays off.
{
  const { error } = await admin.from("user_preferences").upsert(
    {
      user_id: DEMO_USER_ID,
      app_onboarding_completed: true,
      policy_version_accepted: policyVersion,
      reminder_consent: true,
      email_verified: true,
      emotions_seeded: true,
      enabled_modules: ["cbt", "act"],
      selected_concerns: ["anxious-thoughts", "low-mood", "sleep"],
      widgets_seeded: true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`user_preferences: ${error.message}`);
  counts.user_preferences = 1;
}

// ------------------------------------------------------------------ Home layout
// The fourteen widget ids demo's dashboard carries (#1352). Two halves, and both
// are DERIVABLE rather than hand-maintained — that is the point of the split:
//
// - Positions 0-8 are mechanically what `buildWidgetRecommendations` emits for the
//   answers seeded just above: `['anxious-thoughts', 'low-mood', 'sleep']` IN THAT
//   PICKED ORDER (`resolveConcernWidgetIds` iterates SELECTION order, not
//   `CONCERN_KEYS` order) plus modules `['cbt', 'act']`, with `mood-checkin`
//   hardcoded first by the wizard.
// - Positions 9-13 are the `/arrange` tail, appended in `WIDGET_META` declaration
//   order. It reads as "things she added later", which is what a real history looks
//   like. `cbt-open-record`, `act-drop-anchor` and `grounding-log` are ids the
//   registry treats as default-or-shared that NO onboarding run can ever produce, so
//   without demo they are reviewable nowhere; `self-care` is the one CBT tool row
//   that is not a record-keeping row, so the tool tier shows more than one row shape.
//
// ☠️ `routines-today` is `status: "available"`, and specs #37/#50 keep it out of every
// auto-seeding surface. Carrying it here does not contradict that — it exercises it.
// The available-not-default decision governs what the PRODUCT offers unasked; it says
// nothing about what a FIXTURE'S HISTORY contains, and `available` means "reachable
// only by deliberate choice", which is precisely the user demo stands in for. Seeding
// it into onboarding's auto-seed path would be the contradiction. Without it #1271's
// routines have no Home surface at all.
//
// ☠️ The list stops at fourteen for a mechanical reason, not a taste one: `/arrange`'s
// add row is every registry id demo does NOT own, so a demo owning all 25 empties the
// surface it exists to be reviewed on. Eleven chips left, asserted below.
const DEMO_WIDGET_IDS = [
  "cbt-programme",
  "act-programme",
  "mood-checkin",
  "breathing-suggested",
  "journal-week",
  "gratitude-latest",
  "habits-today",
  "sleep-latest",
  "meditation-pick",
  "self-care",
  "cbt-open-record",
  "act-drop-anchor",
  "grounding-log",
  "routines-today",
];

{
  // ☠️ `apply_widget_recommendations` is unusable from here: it is `security invoker`
  // and reads `auth.uid()`, which is null under the service-role client. Direct
  // inserts, and 0-BASED positions — the RPC assigns `min(ordinality)::integer - 1`,
  // so anything else fails to reproduce a real wizard run.
  await wipe("widget_preferences");
  counts.widget_preferences = await insert(
    "widget_preferences",
    DEMO_WIDGET_IDS.map((widgetId, position) => ({
      user_id: DEMO_USER_ID,
      widget_id: widgetId,
      position,
    })),
  );
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
// `recovery_plans` -> challenge_plans. The six after those are ACT's practice
// logs (#1284), all standalone. The four after those are ACT's structured work
// (#1286): `act_committed_actions` heads the fifth chain, to act_action_steps.
// `routines` is last and heads the sixth, to routine_steps (#1290) — it belongs
// to this section rather than to the tools above it because both of the demo
// account's routines are composed of CBT and ACT practices.
//
// ☠️ `act_action_steps` and `routine_steps` are children and are deliberately
// NOT here — each is reclaimed when its parent goes. Adding one would look like
// a tightening and would in fact be the first child wipe in the list, breaking
// the contract the paragraph above states.
const DEMO_SEED_WIPE_TABLES = [
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
  "act_value_entries",
  "act_bulls_eye_snapshots",
  "act_committed_actions",
  "act_program_state",
  "routines",
];

for (const table of DEMO_SEED_WIPE_TABLES) {
  await wipe(table);
}

// ------------------------------------ the routine strips: PLACED, never added
// Four routines close this section (#1290, #1271), composed of CBT, ACT and
// shared-tool practices. Each one's seven-day strip lights a day only when EVERY
// step was done on it, and the strip ignores cadence entirely, so the only way to
// light a day is to have every step's row already dated it.
//
// ☠️ PLACED, NEVER ADDED. The per-surface row counts are fixed (#1181) and this
// slice may not raise any of them, so nothing below writes an extra row: the CBT
// and ACT blocks read which recent days the tools seed ALREADY covered and move
// their own newest rows onto those days. The eight tools blocks are untouched.
//
// Read back OUT of the database rather than re-derived: their `rows` arrays are
// block-scoped, and a second copy of a stride is a restatement of the generator
// rather than an observation of it — it would agree with itself after any nudge.
const ROUTINE_STRIP_DAYS = 7;

/** The strip's day indices, oldest first — the last seven, today included. */
const stripWindow = () =>
  Array.from({ length: ROUTINE_STRIP_DAYS }, (_, i) => DAYS - ROUTINE_STRIP_DAYS + i);

const DAY_INDEX_BY_KEY = new Map(Array.from({ length: DAYS }, (_, i) => [dayKeyAt(i), i]));

/**
 * Where a step's completions live: the table, the timestamp the owning screen
 * dates the row by, the captured-offset column beside it where the table has
 * one, and the column that must be null for the row to count at all.
 *
 * ☠️ The pairs are the APP's, not the schema's: a thought record with
 * `archived_at` set is excluded by `listThoughtRecords` and so cannot complete a
 * step, however well dated it is. Getting one wrong makes every check below
 * agree with a screen that shows something else.
 *
 * Only the tools the four seeded routines actually step through are listed. A new
 * step id needs its entry here, and the read-back below fails loudly rather than
 * skipping a tool it cannot resolve.
 */
const ROUTINE_STEP_SOURCES = {
  mood: { table: "mood_logs", timestamp: "logged_at", offset: "logged_offset_minutes" },
  sleep: { table: "sleep_logs", timestamp: "logged_at", offset: "logged_offset_minutes" },
  meditation: {
    table: "meditation_sessions",
    timestamp: "completed_at",
    offset: "completed_offset_minutes",
  },
  cbt: {
    table: "thought_records",
    timestamp: "created_at",
    offset: "created_offset_minutes",
    requireNull: "archived_at",
  },
  // ☠️ COMPLETION ONLY, and that is why the timestamp is `completed_at` rather
  // than `scheduled_at`: `stepDoneOnDate` counts an activity through
  // `completedDayKey`, so a planned-but-open row files under no day at all. A
  // null `completed_at` makes `seededDayKey` return null and the row is skipped,
  // which is exactly the app's rule — swapping in `scheduled_at` would count the
  // three open rows this seed pins today and derive a step the screen shows open.
  activities: {
    table: "activity_logs",
    timestamp: "completed_at",
    offset: "completed_offset_minutes",
  },
  connection: { table: "act_connection_logs", timestamp: "created_at" },
  choicePoint: { table: "act_choice_points", timestamp: "created_at" },
  defusion: { table: "act_defusion_logs", timestamp: "created_at" },
  expansion: { table: "act_expansion_logs", timestamp: "created_at" },
};

/** The civil day a seeded row files under, through the shared `capturedDayKey`. */
function seededDayKey(row, source) {
  const iso = row[source.timestamp];
  if (!iso) return null;
  return capturedDayKey(iso, source.offset ? row[source.offset] : null);
}

/** Which day indices `source` already carries a countable row on. */
async function seededDayIndexes(source) {
  const columns = [source.timestamp, source.offset, source.requireNull].filter(Boolean).join(",");
  const { data, error } = await admin
    .from(source.table)
    .select(columns)
    .eq("user_id", DEMO_USER_ID);
  if (error) throw new Error(`read ${source.table}: ${error.message}`);

  const days = new Set();
  for (const row of data) {
    if (source.requireNull && row[source.requireNull] !== null) continue;
    const index = DAY_INDEX_BY_KEY.get(seededDayKey(row, source));
    if (index !== undefined) days.add(index);
  }
  return days;
}

/**
 * The days inside the strip window, BEFORE today, that every one of `stepIds`
 * already covers — oldest first.
 *
 * Oldest first on purpose: the lit days then sit at the far end of the strip
 * rather than running up to today, which is what a streak looks like and what
 * this feature refuses to draw.
 */
async function daysAlreadyCoveredBy(stepIds) {
  const sets = [];
  for (const stepId of stepIds) sets.push(await seededDayIndexes(ROUTINE_STEP_SOURCES[stepId]));
  return stripWindow()
    .filter((day) => day < DAYS - 1)
    .filter((day) => sets.every((set) => set.has(day)));
}

/** The lit days this slice claims, or a loud failure naming what moved. */
function requireLitDays(days, wanted, routine, steps) {
  if (days.length < wanted) {
    throw new Error(
      `Only ${days.length} of the last ${ROUTINE_STRIP_DAYS} days already carry ${steps}, ` +
        `so "${routine}" cannot light ${wanted} strip days without a row this slice is not ` +
        "allowed to add. The tools seed's stride moved under it (#1290).",
    );
  }
  return days.slice(0, wanted);
}

// "Morning reset" is mood, meditation and a thought record. Mood and meditation
// are the tools seed's own rows, so the thought records go where those two
// already agree — two days, out of the three that qualify.
//
// ⚠️ #1290 SPECIFIED GRATITUDE HERE AND IT CANNOT BE. Mood and gratitude
// co-occur on only two days of the strip window, and one of them is today; a
// routine holding both can therefore light at most ONE day that is not today,
// against a target of two to three. Today's must not be lit either, because
// #1290 wants this routine reading "in progress" — and mood, gratitude and
// today's thought record (which #1281 pins so the per-day history opens on
// something) are all present today, which derives as COMPLETE. Meditation is
// the nearest tool that is absent today by the tools seed's own stride and
// present with mood on three window days, so it takes gratitude's place.
const MORNING_RESET_LIT_DAYS = requireLitDays(
  await daysAlreadyCoveredBy(["mood", "meditation"]),
  2,
  "Morning reset",
  "both a mood log and a meditation session",
);

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
      // The two newest records before today are dated by the routine strip
      // rather than by hand (#1290): they sit on days the tools seed already
      // covers with a mood log and a meditation session, which is what lights
      // "Morning reset" without a nineteenth record being written. Both are
      // still later than day 74 and earlier than today, so the run of days here
      // stays in order.
      day: MORNING_RESET_LIT_DAYS[0],
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
      day: MORNING_RESET_LIT_DAYS[1],
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

// "Back on my feet" is a sleep log and a completed activity. Sleep is a tools
// block and untouchable by this slice, activities is a CBT block that already
// PLACES two of its completions by hand, so the activities rows move onto the
// days sleep already covers rather than the other way round (#1271).
//
// ☠️ Two, not one, and this routine is the reason: unlike "Steadying myself" it
// is deliberately NOT complete today, so it has no today-lit day to make up the
// difference and has to find both inside the pre-today window.
const BACK_ON_MY_FEET_LIT_DAYS = requireLitDays(
  await daysAlreadyCoveredBy(["sleep"]),
  2,
  "Back on my feet",
  "a sleep log",
);

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
  // Placed rather than left to the stride, because two signals ride on them.
  // `behavioural`'s "complete one activity" milestone reads done only if
  // something was completed at or after the phase start — both days below are
  // inside the last week and so comfortably after it — and "Back on my feet"
  // lights a strip day only where a completed activity and a sleep log agree,
  // which a 3-6 day stride cannot be trusted to arrange twice inside a seven-day
  // window. MOVED, NOT ADDED: this is the same pair of placed rows the block
  // always had, re-dated onto the days sleep already covers (#1271).
  rows.push(completed(BACK_ON_MY_FEET_LIT_DAYS[0], 18, 2));
  rows.push(completed(BACK_ON_MY_FEET_LIT_DAYS[1], 8, 3));

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

  // The civil day comes from the module-scope `capturedDayKey`, shared with the
  // routine-strip checks: this block used to carry its own copy of that rule.

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

/**
 * The declared columns of every row the demo account owns in `table`.
 *
 * The ACT checks all READ BACK rather than inspecting the arrays that built the
 * rows, because reading back is what makes them cover the encrypted views: a
 * value a write trigger's `coalesce` default quietly replaced looks correct in
 * memory and wrong here. `label` names the check in the error so a failure says
 * which of them was asking.
 */
async function actRowsFor(table, columns, label) {
  const { data, error } = await admin
    .from(table)
    .select(columns.join(","))
    .eq("user_id", DEMO_USER_ID);
  if (error) throw new Error(`act ${label} read-back (${table}): ${error.message}`);
  if (data.length === 0) throw new Error(`act ${label} read-back (${table}): no rows came back.`);
  return data;
}

/** Every `created_at` the demo account holds in `table`, as epoch millis. */
async function actCreatedMillis(table, label) {
  const rows = await actRowsFor(table, ["created_at"], label);
  return rows.map((row) => new Date(row.created_at).getTime());
}

/**
 * Fail unless every declared variant of each `[table, column, variants]` triple
 * appears among the rows the database returns.
 *
 * The failure this prevents is a technique card, status badge or category label
 * that never renders on the demo account, which is invisible until someone opens
 * the one screen that would have shown it.
 */
async function requireEveryVariantInDb(checks) {
  for (const [table, column, variants] of checks) {
    const rows = await actRowsFor(table, [column], "variant");
    requireEveryVariant(`${table}.${column}`, variants, rows, column);
  }
}

/**
 * Fail unless every declared `[table, columns]` timestamp sits inside the
 * 10:00-12:00 UTC band.
 *
 * These tables store no captured offset, so a row placed with `at()` instead of
 * `inBand()` changes civil day for viewers the band was chosen to cover. Null
 * columns are skipped — several are genuinely optional. The excused instants are
 * today's rows the future-clamp pulled back out of the band; ☠️ they are matched
 * by EPOCH MILLIS rather than by string, because PostgREST returns a different
 * ISO format than the script wrote.
 */
async function requireRowsInBand(entries) {
  const strays = [];
  for (const [table, columns] of entries) {
    for (const row of await actRowsFor(table, columns, "band")) {
      for (const column of columns) {
        if (row[column] === null) continue;
        const millis = new Date(row[column]).getTime();
        if (clampedOutOfBand.has(millis)) continue;
        const hour = new Date(millis).getUTCHours();
        if (hour < ACT_BAND_START_HOUR || hour >= ACT_BAND_END_HOUR) {
          strays.push(`${table}.${column} at ${new Date(millis).toISOString()}`);
        }
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
}

/** The UTC instant the band CLOSES on day `dayIndex`, in epoch millis. */
function bandClosesAt(dayIndex) {
  const d = dayAt(dayIndex);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), ACT_BAND_END_HOUR, 0, 0, 0);
}

// ☠️ THE PER-DAY-VIEW REASON THESE ROWS WERE PLACED HERE IS GONE. It used to be
// that all five ACT list screens filtered to `useSelectedDate()` — hardcoded to
// `currentDateKey()` with no setter anywhere in the app — so a row on any other
// day was unreachable through the UI, and that is why connection, observing
// self and choice points each get a row dated today below. #1515/#1517 made
// every ACT record type's list a flat, newest-first, keyset-paged ARCHIVE, so
// all of the seeded history is now reachable whatever the date, and
// `useSelectedDate()` survives on ACT's WRITE path only.
//
// The placements stay anyway, and now earn their keep differently: today's
// connection and choice-point rows are what make the "Steadying myself" routine
// derive COMPLETE today and light its second strip day, which the LIT_DAYS
// guard at the end of this file enforces. Do not remove them as dead weight —
// re-read the routines block first.
//
// Defusion and expansion still CANNOT have a row today. Both feed `openUp`'s
// daily practice, which #1178 rules deliberately open. That used to cost them a
// whole screen; now it costs only a today-row, so #1284's "all six screens
// render seeded content" criterion is satisfied by the archives.
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
  // ✅ #1517 removed the constraint this stride was sized against. Urge surf used to
  // surface only as an inline five-row strip at `useUrgeSurfLogs(userId, 5)`, with no
  // list route and no `[id]` route, so only the newest five were ever visible. It is now
  // a keyset-paged archive on the same screen, with a detail route — every seeded row is
  // reachable, and so are the four fields (`trigger`, `peakIntensity`, `urgeActedOn`,
  // `surfingNotes`) that no surface used to render.
  //
  // The stride is left as it is: it was deliberately sized to clear the old limit
  // comfortably rather than exactly, so it was never actually pinned to five.
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

  // TODAY, twice.
  //
  // ✅ The original reason is GONE: the list screen showed only today, so a single row
  // opened it on one entry — a thinner picture than this account has, reading as a
  // surface barely used. #1517 dropped that day filter and the screen is now the tool's
  // full archive, so every seeded connection log is visible on arrival and the rows below
  // no longer carry the picture on their own.
  //
  // They stay for the SECOND reason, which never depended on the day filter:
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

// "Steadying myself" is a connection log and a choice-point worksheet. Both are
// this section's own rows, but connection is placed by a stride and choice
// points are sparse enough to place by hand, so the worksheet moves to meet the
// connection log rather than the other way round. One day is enough: today is
// already lit by both surfaces, which makes two (#1290 asks for two to three).
const [STEADYING_LIT_DAY] = requireLitDays(
  await daysAlreadyCoveredBy(["connection"]),
  1,
  "Steadying myself",
  "a connection log",
);

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

  // The newest worksheet before today MOVES onto a day that already carries a
  // connection log (#1290), so "Steadying myself" lights a second strip day
  // without a tenth worksheet being written. Deleted before it is re-added: a
  // Set silently absorbs a collision, and a collision here would drop the count
  // by one — which is a thinner surface, not a placed row.
  const newestBeforeToday = Math.max(...days);
  if (days.has(STEADYING_LIT_DAY)) {
    throw new Error(
      `Day ${STEADYING_LIT_DAY} already carries a choice point, so moving the newest ` +
        "worksheet onto it would lose a row rather than place one (#1290).",
    );
  }
  days.delete(newestBeforeToday);
  days.add(STEADYING_LIT_DAY);
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

  const seeded = {};
  for (const table of bandTables) seeded[table] = await actCreatedMillis(table, "band");

  // VARIANT COVERAGE, off the rows the database returns rather than the arrays
  // that built them. The enum columns are plaintext pass-throughs on the `_data`
  // tables, so they come back readable — and reading them back is what makes
  // this cover the encrypted views too: a variant that a write trigger's
  // `coalesce` default quietly replaced looks correct in memory and wrong here,
  // which is the whole reason the band check below reads back as well.
  await requireEveryVariantInDb([
    ["act_defusion_logs", "technique_used", DEFUSION_TECHNIQUES],
    ["act_defusion_logs", "thought_category", THOUGHT_CATEGORIES],
    ["act_expansion_logs", "technique_used", EXPANSION_TECHNIQUES],
    ["act_expansion_logs", "discomfort_type", DISCOMFORT_TYPES],
    ["act_connection_logs", "technique", CONNECTION_TECHNIQUES],
    ["act_observing_self_sessions", "technique_used", OBSERVING_TECHNIQUES],
  ]);

  await requireRowsInBand(bandTables.map((table) => [table, ["created_at"]]));

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

// ------------------------------- ACT: the values, the bulls-eye and the plans
// The structured half of ACT (#1286) — what this person has decided matters and
// what they have committed to doing about it — as opposed to the six practice
// surfaces above. Four value entries, the bulls-eye check-in history, one
// committed action per life domain with its steps, and the singleton programme
// state row. The ACT programme anchor is written and asserted back here too,
// because the assertion needs these rows to exist before it can say anything.
//
// Same life and the same content ceiling as every section above: distress about
// performance, standing and relationships, ROLE-ONLY, never about living, and
// every distressing field answered by the one beside it. The values are the
// other side of the same anxiety — what the avoidance is costing.

// The four life domains, mirroring ACT_LIFE_DOMAINS in src/features/act/types.ts
// and the CHECK on act_value_entries.life_domain, act_bulls_eye_snapshots.domain
// and act_committed_actions.life_domain. ☠️ The schema caps value entries at
// exactly this many rows — `unique (user_id, life_domain)` over a four-value
// CHECK — so all four are present and there is no room for a fifth.
const ACT_LIFE_DOMAINS = ["work", "leisure", "relationships", "personalGrowth"];

// act_committed_actions.status, mirroring the CHECK in
// 20260540_act_committed_action.sql and the ActionStatus union in
// src/features/act/types.ts. The list screen renders one group per status, so a
// status with no row is a section header nobody ever sees.
//
// ⚠️ Mirrored, not read from the live constraint — the same gap the CBT and ACT
// lists above carry, and for the same reason.
//
// ☠️ act_action_steps has NO status column: a step is an `is_completed` boolean
// plus a nullable `completed_at`, and `toggleActionStep` clears the timestamp
// when a step is reopened, so there is no third step shape to seed. #1286's
// acceptance criterion asking for "all three action-step statuses" is about THIS
// column — the three statuses belong to the parent action, and one action per
// domain across four domains is what makes room for all three.
const ACTION_STATUSES = ["active", "completed", "abandoned"];

// The ACT programme start, as a day index into the rolling window (#1178). A few
// days behind CBT's day 8 rather than the same afternoon — one person taking up
// two programmes on the same day is the tell of generated data. Only the four
// summary stat chips count from this; the milestones count from the phase start.
const ACT_PROGRAM_STARTED_DAY = 11;

// The four ACT phase keys in order, mirroring ACT_PROGRAM in
// src/features/act/program-definition.ts. Mirrored rather than imported: this
// script is plain Node and that module is TypeScript behind a path alias.
//
// The index is derived from the KEY for the same reason CBT's is — each phase
// has its own milestones and its own daily practice, and the checks below are
// `openUp`'s specifically, so anchoring by name is what lets the assertion
// notice that the anchor and the rows have come apart.
const ACT_PHASE_KEYS = ["foundation", "bePresent", "openUp", "doWhatMatters"];
const ACT_PROGRAM_PHASE_KEY = "openUp";
const ACT_PROGRAM_PHASE_INDEX = ACT_PHASE_KEYS.indexOf(ACT_PROGRAM_PHASE_KEY);

// The days the person sat down and re-rated all four domains.
//
// ☠️ THE HISTORY SCREEN RENDERS ONLY THE NEWEST TWELVE ROWS — `slice(0, 12)`
// over a `reviewed_at desc` fetch — and a review is four rows, one per domain.
// So exactly THREE review dates are ever visible, and a trajectory laid down on
// an even stride would put every date that carries the setback off the bottom of
// the screen: the account would read as a steady climb with no bad stretch in
// it. The last three dates are therefore chosen so the visible twelve carry the
// shape on their own — day 52 is the last reading before the setback, day 64 is
// its last day, and today is the recovery. The month between the setback and
// today is the stretch where the reviews stopped, which is what a bad month does
// to a fortnightly habit; the newest row is still today, so this is a gap in the
// middle rather than a tail that peters out.
const ACT_BULLS_EYE_REVIEW_DAYS = [4, 12, 20, 28, 36, 44, 52, 64, DAYS - 1];

// The first review that falls inside the setback, and the last one before it.
// Both the generator and the read-back below need them, and a check that
// recomputed them from its own copy of the review days would move whenever the
// generator moved and agree with itself on any placement at all.
const SETBACK_REVIEW_INDEX = ACT_BULLS_EYE_REVIEW_DAYS.findIndex(inSetback);
if (SETBACK_REVIEW_INDEX < 1) {
  throw new Error(
    "No bulls-eye review falls inside the setback with a review before it to compare against. " +
      "The dip is the one thing the only series UI in either module exists to show.",
  );
}

/**
 * The alignment rating domain `domain` reads on day `dayIndex`, 1-10.
 *
 * Rides the same `improvement(day)` arc as worry probability, anger arousal and
 * exposure distress, so the bulls-eye bends where they bend. Each domain maps it
 * onto its own band: work is the sore spot and stays lowest, relationships
 * recovers furthest. The bands are five points wide because that is what makes
 * the setback's rollback survive rounding to an integer — narrow them and every
 * reading through the bad stretch collapses onto the one before it.
 *
 * Read by the snapshots AND by the value entries, so a value entry's stored
 * alignment is the same arc evaluated on the day that entry was last edited
 * rather than a second hand-picked number that drifts away from the history
 * sitting behind it.
 */
const DOMAIN_ALIGNMENT_BAND = {
  work: [2, 7],
  leisure: [3, 8],
  relationships: [4, 9],
  personalGrowth: [3, 8],
};
function alignmentFor(domain, dayIndex) {
  const [lo, hi] = DOMAIN_ALIGNMENT_BAND[domain];
  return Math.max(1, Math.min(10, Math.round(lo + (hi - lo) * improvement(dayIndex))));
}

// ------------------------------------------------------------- value entries
{
  // Four rows, one per domain, at the schema's cap. Each value names what this
  // person would do if the thought were not running the day, and the barrier
  // field says what stops it — the same avoidance the rest of the seed
  // describes, seen from the side of what it costs.
  //
  // ☠️ `leisure` carries a NULL current_alignment_rating on purpose - and since
  // #1379 that is all it is: a historical row shape, not a branch this data reaches.
  // The check-in now OWNS alignment, so the values row reads the newest snapshot for
  // the domain and falls back to the entry's column only where a domain has NO
  // snapshot at all. Every domain here has snapshots, so the fallback is unexercised
  // by this seed; nothing in it can produce a domain rated in the old form and never
  // checked in, which is the only state that branch is for.
  //
  // Every `updated_at` here sits BEFORE the current ACT phase start. `openUp` is
  // the anchored phase and `doWhatMatters` is the one after it, whose
  // `clarifyValue` milestone counts value entries updated since that phase
  // began — leaving it open means a reviewer who advances the phase lands on a
  // card with open milestones and real content behind them, rather than one
  // already ticked before they got there.
  const entries = [
    {
      life_domain: "work",
      value_statement:
        "Do work I would be willing to explain out loud, and let people see it before it is finished.",
      importance_rating: 9,
      current_actions_note:
        "Rewriting anything I have to present until the last possible minute, then reading it out word for word.",
      desired_actions_note: "Share the rough version early and ask one real question about it.",
      barriers: "Being found out. Every unfinished thing I show feels like the proof.",
      createdDay: 22,
      updatedDay: 74,
    },
    {
      life_domain: "leisure",
      value_statement: "Make room for things with no outcome attached to them.",
      importance_rating: 6,
      current_actions_note: "Weekends spent catching up on everything I avoided during the week.",
      desired_actions_note: "One walk by the sea a week that I have not earned.",
      barriers: "Resting feels like falling further behind.",
      createdDay: 25,
      updatedDay: 57,
    },
    {
      life_domain: "relationships",
      value_statement:
        "Be here with the people at home, rather than still in a meeting that finished hours ago.",
      importance_rating: 9,
      current_actions_note: "Home by seven, still answering messages at nine.",
      desired_actions_note:
        "Put the laptop in the other room while we eat, and ask about their day first.",
      barriers: "Replaying the day's conversations instead of listening to the one in front of me.",
      createdDay: 22,
      updatedDay: 71,
    },
    {
      life_domain: "personalGrowth",
      value_statement: "Learn in the open, at whatever pace it actually takes.",
      importance_rating: 7,
      current_actions_note:
        "Reading up on the things I am behind on privately, so nobody sees me not knowing.",
      desired_actions_note: "Ask the question in the room instead of looking it up afterwards.",
      barriers: "Not knowing, in front of people who might be keeping score.",
      createdDay: 25,
      updatedDay: 76,
    },
  ];

  counts.act_value_entries = await insert(
    "act_value_entries",
    entries.map(({ createdDay, updatedDay, ...fields }) => ({
      user_id: DEMO_USER_ID,
      ...fields,
      // The alignment the arc gives on the day the entry was last edited, not
      // today's. A value entry records what someone thought when they wrote it,
      // and the bulls-eye has moved on since; the check further down holds it to
      // "no better than the latest review", which is the only relationship
      // between the two numbers that can actually be wrong.
      current_alignment_rating:
        fields.life_domain === "leisure" ? null : alignmentFor(fields.life_domain, updatedDay),
      created_at: inBand(createdDay, 40),
      updated_at: somewhereInBand(updatedDay),
    })),
  );
}

// -------------------------------------------------------- bulls-eye snapshots
{
  // The only series UI in either module: nothing in CBT or ACT is charted, so a
  // trajectory is legible only by reading numbers down a list, and this history
  // is the nearest thing to a chart the two modules have. Nine review dates
  // across all four domains, alignment climbing across the window and dropping
  // back through the setback.
  //
  // ☠️ WRITTEN DIRECTLY TO THE TABLE, not through an encrypted view. This is the
  // one table in either module with no `_data` base and no decrypting view: all
  // of its columns are numeric or enum, so there is nothing to encrypt. It is a
  // deliberate exception to the rule every other insert in this section follows,
  // recorded here so a reviewer does not "correct" it into a view that does not
  // exist.
  const rows = ACT_BULLS_EYE_REVIEW_DAYS.flatMap((day) => {
    // One sitting: the screen saves every rated domain from a single Save, so
    // the four rows of a review land within a few minutes of each other rather
    // than scattered across the band.
    const startedAt = between(0, ACT_BAND_MINUTES - ACT_LIFE_DOMAINS.length);
    return ACT_LIFE_DOMAINS.map((domain, index) => {
      const reviewedAt = inBand(day, startedAt + index);
      return {
        user_id: DEMO_USER_ID,
        domain,
        alignment_rating: alignmentFor(domain, day),
        reviewed_at: reviewedAt,
        created_at: reviewedAt,
      };
    });
  });

  counts.act_bulls_eye_snapshots = await insert("act_bulls_eye_snapshots", rows);
}

// ---------------------------------------------- committed actions and steps
{
  // One plan per life domain, which is what makes room for all three statuses on
  // a four-row list: two live commitments, one finished and one let go. The list
  // screen renders a group per status, so a status with no row is a section
  // header that never appears on the demo account.
  //
  // The leisure plan was let go INSIDE the setback and the others were not,
  // which is the same bad stretch the ratings bend around, said a different way.
  // Everything here is dated before the current ACT phase start for the same
  // reason the value entries are: `commitActionOnce` belongs to the phase after
  // the anchored one and is left open.
  //
  // Step order IS list order — the detail screen fetches steps `created_at`
  // ascending — so steps are placed at fixed, increasing minutes into the band
  // rather than scattered through it.
  const actions = [
    {
      life_domain: "work",
      title: "Bring a half-finished draft to the Monday review",
      description:
        "Show the version I would normally hide, and say out loud which part I am unsure about.",
      status: "active",
      obstacles:
        "The urge to polish it first, and the twenty minutes beforehand where I talk myself out of it.",
      targetDay: DAYS - 1 + 12,
      createdDay: 55,
      updatedDay: 74,
      steps: [
        ["Pick the piece I would least want anyone to see", 58],
        ["Write down the one question I actually want answered about it", 60],
        ["Send it the night before, so there is no version of me that withdraws it", null],
        ["Say the unsure part out loud in the room, not in a note afterwards", null],
      ],
    },
    {
      life_domain: "leisure",
      title: "Swim before work on Tuesdays and Thursdays",
      description: "Down to the sea early, twice a week, whatever the water is like.",
      status: "abandoned",
      obstacles: "Setting the alarm the night before, then finding a reason at six.",
      // ☠️ No target date. Both the list and the detail screen branch on it, and
      // this is the only row that takes the missing-date path.
      targetDay: null,
      createdDay: 24,
      updatedDay: 57,
      steps: [
        ["Put the bag by the door the night before", 27],
        ["Go on the first Tuesday, whatever the water is like", null],
        ["Say out loud at home that I am going, so it is not only mine to keep", null],
        ["Swim on a morning I do not feel like it", null],
      ],
    },
    {
      life_domain: "relationships",
      title: "Ask about their day before I unpack mine",
      description: "One real question at dinner, every evening, before the day gets replayed.",
      status: "completed",
      // Empty on purpose: the detail screen hides the obstacles card when this
      // is blank, and a plan that is finished is the plausible row to have
      // stopped filling it in on.
      obstacles: "",
      targetDay: 70,
      createdDay: 30,
      updatedDay: 72,
      steps: [
        ["Ask one question about their day before I unpack mine", 33],
        ["Leave the laptop in the other room while we eat", 37],
        ["Notice when I have stopped listening, and say so", 51],
        ["Say the thing I am worried about instead of going quiet", 69],
      ],
    },
    {
      life_domain: "personalGrowth",
      // Long on purpose: the list truncates a title at two lines and nothing
      // else here is long enough to reach the second one.
      title:
        "Ask the question in the room, at the moment I lose the thread, instead of looking it up afterwards",
      description:
        "When I do not follow something, ask there and then rather than nodding and reading about it that evening.",
      status: "active",
      obstacles:
        "“Everyone else already knows this” — the same thought as always, wearing a different coat.",
      targetDay: DAYS - 1 + 25,
      createdDay: 62,
      updatedDay: 76,
      steps: [
        ["Write down the moment I lost the thread, in the meeting", 65],
        ["Ask about it in the room the next time it happens", 73],
        ["Say “I do not know that one” without softening it", null],
        ["Ask a second question when the first answer does not land", null],
      ],
    },
  ];

  let actionRows = 0;
  let stepRows = 0;
  for (const action of actions) {
    const { steps, targetDay, createdDay, updatedDay, ...fields } = action;
    const actionId = await insertReturningId("act_committed_actions", {
      user_id: DEMO_USER_ID,
      ...fields,
      // A calendar day, not an instant — and built through `dayKeyAt`, never by
      // slicing an ISO string, which files the row on the wrong day west of
      // Greenwich. `dayKeyAt` takes indices past the end of the window, which is
      // how a live plan gets a target date in the future.
      target_date: targetDay === null ? null : dayKeyAt(targetDay),
      created_at: inBand(createdDay, 10),
      updated_at: somewhereInBand(updatedDay),
    });
    actionRows++;

    stepRows += await insert(
      "act_action_steps",
      steps.map(([description, completedDay], index) => {
        const createdAt = inBand(createdDay, 20 + index * 3);
        const completedAt = completedDay === null ? null : somewhereInBand(completedDay);
        return {
          user_id: DEMO_USER_ID,
          action_id: actionId,
          description,
          is_completed: completedAt !== null,
          completed_at: completedAt,
          created_at: createdAt,
          updated_at: completedAt ?? createdAt,
        };
      }),
    );
  }
  counts.act_committed_actions = actionRows;
  counts.act_action_steps = stepRows;
}

// ------------------------------------------------------------ programme state
{
  // A singleton keyed by user, and the one ACT table nothing renders: the
  // repository reads and writes every column and no screen consumes any of them.
  // It is seeded because the GDPR export carries it and the export-completeness
  // gate holds that export to the live schema — an empty row there is a column
  // the export has never been proven to carry for a real account.
  //
  // ☠️ Inserted through the view like everything else, but this view's INSTEAD OF
  // trigger resolves the per-user merge itself (a view cannot be the target of
  // INSERT ... ON CONFLICT). The wipe ahead of it means the run always takes the
  // plain insert path, which is the one that honours a supplied `created_at` —
  // the conflict path stamps `now()` instead.
  //
  // `last_check_in_at` is read back out of the snapshots rather than rebuilt
  // here: the bulls-eye review IS the check-in on this module, and a second date
  // computed alongside it would be a second statement of the same fact, free to
  // drift.
  const { data: latestReview, error: reviewError } = await admin
    .from("act_bulls_eye_snapshots")
    .select("reviewed_at")
    .eq("user_id", DEMO_USER_ID)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();
  if (reviewError) throw new Error(`act program state (latest review): ${reviewError.message}`);

  const onboardedAt = inBand(ACT_PROGRAM_STARTED_DAY, 30);
  counts.act_program_state = await insert("act_program_state", [
    {
      user_id: DEMO_USER_ID,
      // All six: every practice surface above carries rows, so every principle
      // is one this account is actually working with.
      active_principles: [
        "defusion",
        "expansion",
        "connection",
        "observingSelf",
        "values",
        "committedAction",
      ],
      // The same presenting problem the rest of the seed commits to, in this
      // table's vocabulary. `anger` and `grief` are deliberately absent: the
      // anger logs are a tool this person uses rather than a concern they named,
      // and the bereavement is background rather than what they came in for.
      primary_concerns: ["anxiety", "selfCriticism", "procrastination"],
      myths_acknowledged: true,
      onboarding_completed_at: onboardedAt,
      last_check_in_at: latestReview.reviewed_at,
      preferred_check_in_time: "20:30",
      created_at: onboardedAt,
      updated_at: latestReview.reviewed_at,
    },
  ]);
}

// ------------------------------------------------------------- ACT programme
// The anchor is the INPUT: it is written here and the rows above and in the
// practice-logs section were generated to satisfy it (#1178). ACT sits in
// `openUp`, index 2 of 4, PARTIALLY complete — defusion rows well inside the
// phase tick `unhookOnce`, no expansion or urge-surf row since it began leaves
// `makeRoomOnce` open, and nothing at all today leaves the daily practice open,
// which is the one row a reviewer can exercise themselves.
//
// ☠️ ANCHORED FROM `ACT_PHASE_STARTED_DAY`, the constant the practice-logs
// section declares and places its margins against. A second day chosen here
// would move the phase out from under those margins with nothing failing:
// nothing in that section persists an anchor, so its checks and this one would
// simply be measuring two different phases.
{
  const { error } = await admin
    .from("user_preferences")
    .update({
      act_program_started_at: at(ACT_PROGRAM_STARTED_DAY, 9, 0),
      act_program_phase_index: ACT_PROGRAM_PHASE_INDEX,
      act_program_phase_started_at: at(ACT_PHASE_STARTED_DAY, 9, 0),
      // Null keeps the programme in progress. A completion date would graduate
      // it and the phase card would stop rendering altogether.
      act_program_completed_at: null,
      // Cleared rather than left alone so a re-run reproduces the same picture:
      // this column is set by a tap in the app, and a reviewer who dismissed the
      // prompt would otherwise keep a dismissed prompt across every later seed.
      act_program_prompt_dismissed_at: null,
    })
    .eq("user_id", DEMO_USER_ID);
  if (error) throw new Error(`act program anchor: ${error.message}`);
}

// ☠️ `act_program_phase_index` is STORED, not derived, while every milestone
// derives from the rows. Nothing in the app recomputes the index or rejects one
// that contradicts its own rows — out-of-range values are silently clamped, not
// refused — so a seeded index can sit there disagreeing with the data behind it,
// and the only symptom is a programme card that reads wrong.
//
// So derive it back OUT of the database and check the two agree, exactly as the
// CBT block above does. Read back rather than reusing the arrays: that also
// proves the rows survived the encrypted views with the timestamps they were
// given, which is the other way this can silently go wrong.
{
  const { data: prefs, error: prefsError } = await admin
    .from("user_preferences")
    .select(
      "act_program_started_at, act_program_phase_index, act_program_phase_started_at, " +
        "act_program_completed_at",
    )
    .eq("user_id", DEMO_USER_ID)
    .single();
  if (prefsError) throw new Error(`act program read-back: ${prefsError.message}`);

  /** Every `created_at` the demo account holds in `table`, as epoch millis. */
  async function createdMillis(table) {
    const { data, error } = await admin
      .from(table)
      .select("created_at")
      .eq("user_id", DEMO_USER_ID);
    if (error) throw new Error(`act program read-back (${table}): ${error.message}`);
    if (data.length === 0) throw new Error(`act program read-back (${table}): no rows came back.`);
    return data.map((row) => new Date(row.created_at).getTime());
  }

  const defusion = await createdMillis("act_defusion_logs");
  const expansion = await createdMillis("act_expansion_logs");
  const urgeSurf = await createdMillis("act_urge_surf_logs");

  // Milestones count from the phase start, falling back to the programme start
  // exactly as `deriveActProgram` does.
  const phaseStart = new Date(
    prefs.act_program_phase_started_at ?? prefs.act_program_started_at,
  ).getTime();

  // What the seeded rows have to make each of the anchored phase's legs read.
  // Keyed by PHASE, and only the seeded phase is declared: every phase has
  // different milestones and a different daily practice, so moving the anchor to
  // another phase means choosing afresh which signals the rows now satisfy. An
  // undeclared phase fails here rather than quietly checking `openUp`'s legs
  // against a `doWhatMatters` anchor and passing.
  //
  // Milestones and daily practice are declared SEPARATELY because "partially
  // complete" is a claim about the milestones alone — the daily practice is not
  // part of a phase's completion, and a check that had to name the daily leg to
  // exclude it would stop excluding it the moment a phase called that leg
  // something else.
  const phaseExpectations = {
    openUp: {
      milestones: { unhookOnce: true, makeRoomOnce: false },
      dailyPractice: { unhookOrMakeRoomDaily: false },
    },
  };

  // The stored index against the one this script wrote, stated OUTRIGHT rather
  // than left to fall out of the lookup below. It does fall out today — only
  // `openUp` declares expectations, so any other index lands on "no expectations
  // declared" — but that is equality holding by SIDE EFFECT, and it stops
  // holding the moment a second phase is declared, which is exactly the kind of
  // quietly-weakened assertion this block exists to prevent.
  if (prefs.act_program_phase_index !== ACT_PROGRAM_PHASE_INDEX) {
    throw new Error(
      `The database holds ACT phase index ${prefs.act_program_phase_index} but this run wrote ` +
        `${ACT_PROGRAM_PHASE_INDEX} ('${ACT_PROGRAM_PHASE_KEY}'). The anchor did not land.`,
    );
  }

  const anchoredPhaseKey = ACT_PHASE_KEYS[prefs.act_program_phase_index];
  const phaseExpectation = phaseExpectations[anchoredPhaseKey];
  if (!phaseExpectation) {
    throw new Error(
      `The anchored ACT phase index ${prefs.act_program_phase_index} is ` +
        `'${anchoredPhaseKey ?? "out of range"}', which this script declares no expectations ` +
        `for — it seeds '${ACT_PROGRAM_PHASE_KEY}'. Re-phasing the account means re-choosing ` +
        "which milestones and which daily practice the rows have to satisfy, because no two " +
        "phases share them.",
    );
  }

  // ☠️ ACT buckets its daily practice through the VIEWER's clock rather than a
  // captured offset — none of these tables has an offset column — so the day key
  // comes off the local getters here, matching `toLocalDateKey` on the client
  // and the ACT legs of `program_widget_task_status` on the server.
  const today = dayKeyAt(DAYS - 1);
  const onToday = (instants) => instants.some((ms) => localDayKey(new Date(ms)) === today);
  const derived = {
    started: prefs.act_program_started_at !== null,
    graduated: prefs.act_program_completed_at !== null,
    // `openUp`'s two milestones and its daily practice, in the same shape
    // src/features/act/program-definition.ts evaluates them.
    unhookOnce: defusion.some((ms) => ms >= phaseStart),
    makeRoomOnce:
      expansion.some((ms) => ms >= phaseStart) || urgeSurf.some((ms) => ms >= phaseStart),
    unhookOrMakeRoomDaily: onToday([...defusion, ...expansion, ...urgeSurf]),
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
      `The seeded ACT programme anchor ('${anchoredPhaseKey}') and the rows behind it ` +
        `disagree — ${disagreements.join("; ")}. The anchor is the input and the rows are ` +
        "generated to satisfy it, so whichever moved, they have to move together.",
    );
  }

  // PARTIALLY complete: a claim about the phase rather than about any one leg,
  // and read off the milestones only, which is what phase completion is made of.
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

  // ------------------------------------------- the edges of the supported band
  // The two boundary invariants are the only things a timezone drift can
  // actually break, and both are statements about a CIVIL DAY: ACT tables carry
  // no captured offset, so their day is resolved through whatever clock the
  // viewer happens to have. Re-derive both at each edge of the supported band
  // and fail if either flips there. Inert until ACT rows exist, which is why it
  // lands in this slice rather than with the wipe contract that declared it.
  //
  // ☠️ UTC-11:00 through UTC+12:45 is the band the spec supports (#1273); UTC+13
  // and UTC+14 are knowingly outside it and made harmless by the two-day margins
  // rather than by exact placement. Restated as offsets in minutes rather than
  // derived from the placement helpers, so a change to the band the rows are
  // WRITTEN in cannot quietly move the band they are CHECKED against.
  const SUPPORTED_BAND_EDGES = [
    { label: "UTC-11:00", offsetMinutes: -660 },
    { label: "UTC+12:45", offsetMinutes: 765 },
  ];

  /** The civil day an instant falls on for a viewer at `offsetMinutes`. */
  const dayKeyAtOffset = (millis, offsetMinutes) =>
    new Date(millis + offsetMinutes * 60_000).toISOString().slice(0, 10);

  // The UTC day the run falls in, as an inclusive span of instants. ☠️ The
  // daily-practice invariant is checked against BOTH ENDS of it rather than
  // against `Date.now()`: a viewer at a band edge sees their civil day roll over
  // partway through the UTC day, so a single sample answers "would this flip at
  // this exact minute" — which lets a row that flips the leg for the first half
  // of the day pass a seed that happens to run in the afternoon. Two samples
  // make it "would this flip at any point today", which is both the claim worth
  // making and the one that does not depend on when the seed was run.
  const now = new Date();
  const utcDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDayEnd = utcDayStart + 24 * 60 * 60 * 1000 - 1;

  for (const edge of SUPPORTED_BAND_EDGES) {
    const todayThere = new Set([
      dayKeyAtOffset(utcDayStart, edge.offsetMinutes),
      dayKeyAtOffset(utcDayEnd, edge.offsetMinutes),
    ]);
    // All THREE tables the daily leg counts, not just defusion: `openUp`'s
    // practice is "unhooked OR made room", so an expansion or urge-surf row that
    // reached a viewer's today would tick it just as surely. Checking only
    // defusion would be sound today — the phase-start check below is stricter
    // about the other two — but only by leaning on a second check, and that
    // dependency lives nowhere the next reader would find it.
    const practisedToday = [...defusion, ...expansion, ...urgeSurf].filter((ms) =>
      todayThere.has(dayKeyAtOffset(ms, edge.offsetMinutes)),
    );
    if (practisedToday.length > 0) {
      throw new Error(
        `At ${edge.label} ${practisedToday.length} defusion, expansion or urge-surf row(s) fall ` +
          `on ${[...todayThere].join(" or ")}, which that viewer calls today at some point ` +
          "during this UTC day, so `openUp`'s daily practice would read DONE there. It is " +
          "deliberately open, and the last of those rows is meant to sit two days clear of today " +
          "so no viewer clock can reach it.",
      );
    }

    // ☠️ THIS ONE IS A MARGIN GUARD, NOT A LEG THAT CAN FLIP. `makeRoomOnce`
    // compares INSTANTS (`atOrAfter` in program-definition.ts), and an instant
    // comparison is timezone-independent by construction — no viewer clock can
    // move it. Checked at DAY granularity anyway, and so deliberately stricter
    // than the app: the two-day gap is what keeps the milestone safe if that leg
    // is ever day-keyed the way every daily practice already is, and a check
    // that mirrored today's instant comparison would pass right up to the moment
    // that change made it wrong. Mutation-tested: an expansion row one day
    // short of the margin trips it at UTC-11:00.
    const phaseStartThere = dayKeyAtOffset(phaseStart, edge.offsetMinutes);
    const roomMadeSince = [...expansion, ...urgeSurf].filter(
      (ms) => dayKeyAtOffset(ms, edge.offsetMinutes) >= phaseStartThere,
    );
    if (roomMadeSince.length > 0) {
      throw new Error(
        `At ${edge.label} ${roomMadeSince.length} expansion or urge-surf row(s) fall on or after ` +
          `${phaseStartThere}, the phase start there, so \`makeRoomOnce\` would read DONE and ` +
          "`openUp` would read complete rather than partially complete.",
      );
    }
  }
}

// ------------------------------ ACT structured work, read back out of the DB
// Read back rather than checked against the arrays above, for the same reason
// the practice-logs section does it: reading back is what makes these checks
// cover the encrypted views as well as the code that built the rows.
{
  const readBack = (table, columns) => actRowsFor(table, columns, "structured");

  // VARIANT COVERAGE. The three life-domain columns carry the schema's four-value
  // CHECK and the status column its three-value one; a variant with no row is a
  // card or a section header that never renders on the demo account.
  await requireEveryVariantInDb([
    ["act_value_entries", "life_domain", ACT_LIFE_DOMAINS],
    ["act_bulls_eye_snapshots", "domain", ACT_LIFE_DOMAINS],
    ["act_committed_actions", "life_domain", ACT_LIFE_DOMAINS],
    ["act_committed_actions", "status", ACTION_STATUSES],
  ]);

  // ☠️ The schema caps value entries at four — `unique (user_id, life_domain)`
  // over a four-value CHECK — so "all four domains present" and "exactly four
  // rows" are not the same statement: the second is what notices a domain
  // written twice and silently merged away by the view's ON CONFLICT path.
  const valueEntries = await readBack("act_value_entries", [
    "life_domain",
    "current_alignment_rating",
  ]);
  if (valueEntries.length !== ACT_LIFE_DOMAINS.length) {
    throw new Error(
      `${valueEntries.length} value entries came back, not ${ACT_LIFE_DOMAINS.length}. The table ` +
        "is capped at one row per life domain, so a different count means a domain was written " +
        "twice and the view's conflict path merged it away.",
    );
  }

  const snapshots = await readBack("act_bulls_eye_snapshots", [
    "domain",
    "alignment_rating",
    "reviewed_at",
  ]);

  // THE ARC, off the rows the database returns. Two claims, because they fail
  // differently: the history has to CLIMB across the window, and it has to DIP
  // where the setback is. The dip is the fragile one — the setback rolls the
  // shared improvement curve back about three weeks, which on a five-point band
  // is barely more than one rating point, close enough that rounding to an
  // integer can flatten it away and leave a history that only ever rises.
  //
  // Per domain rather than in aggregate: an arc that survives on three domains
  // and collapses on the fourth is exactly what narrowing one band does. The two
  // reviews compared are picked by POSITION in the seeded order, which is what
  // lets this read the ratings back out of the database without having to
  // re-derive a day index from a timestamp the band deliberately shifted.
  for (const domain of ACT_LIFE_DOMAINS) {
    const forDomain = snapshots
      .filter((row) => row.domain === domain)
      .sort((a, b) => new Date(a.reviewed_at) - new Date(b.reviewed_at));
    if (forDomain.length !== ACT_BULLS_EYE_REVIEW_DAYS.length) {
      throw new Error(
        `${forDomain.length} bulls-eye snapshot(s) came back for ${domain}, not ` +
          `${ACT_BULLS_EYE_REVIEW_DAYS.length}. Every review rates every domain, so a domain ` +
          "with fewer rows leaves gaps down the one series UI either module has.",
      );
    }
    const newest = forDomain[forDomain.length - 1];
    const oldest = forDomain[0];
    if (!(newest.alignment_rating > oldest.alignment_rating)) {
      throw new Error(
        `The bulls-eye history for ${domain} ends at ${newest.alignment_rating}/10 having ` +
          `started at ${oldest.alignment_rating}/10, so it does not improve across the window.`,
      );
    }
    const inSetbackReview = forDomain[SETBACK_REVIEW_INDEX];
    const beforeSetback = forDomain[SETBACK_REVIEW_INDEX - 1];
    if (!(inSetbackReview.alignment_rating < beforeSetback.alignment_rating)) {
      throw new Error(
        `The bulls-eye history for ${domain} does not dip at the setback: the review inside it ` +
          `reads ${inSetbackReview.alignment_rating}/10 against ${beforeSetback.alignment_rating}` +
          "/10 the review before. The setback is meant to be visible in the ratings, and on a " +
          "five-point band integer rounding is what flattens it away.",
      );
    }
  }

  // A value entry's stored alignment is the shared arc read on the day that entry
  // was last edited, so it is allowed to sit behind the newest check-in and never
  // ahead of it.
  //
  // ⚠️ This used to guard a live contradiction: the values row PREFERRED the entry's
  // number over the history's, so an entry ahead of the newest review put two
  // disagreeing answers on two surfaces. #1379 settled that - the check-in owns
  // alignment and the row reads its snapshot. The check is kept because the property
  // is still what the seeded arc means, but it now guards the data's coherence rather
  // than a rendering bug.
  for (const entry of valueEntries) {
    if (entry.current_alignment_rating === null) continue;
    const newestForDomain = snapshots
      .filter((row) => row.domain === entry.life_domain)
      .sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))[0];
    if (entry.current_alignment_rating > newestForDomain.alignment_rating) {
      throw new Error(
        `The ${entry.life_domain} value entry claims alignment ` +
          `${entry.current_alignment_rating}/10 while the newest bulls-eye review for that ` +
          `domain says ${newestForDomain.alignment_rating}/10. The entry's number is the arc ` +
          "read on the day it was last edited, so it may sit behind the newest review but " +
          "never ahead of it.",
      );
    }
  }

  // Both step shapes have to render: a ticked step and an open one. The detail
  // screen counts the ticked ones and strikes them through, and an action whose
  // steps are all one way never shows the other.
  const steps = await readBack("act_action_steps", ["is_completed", "completed_at"]);
  if (!steps.some((row) => row.is_completed) || !steps.some((row) => !row.is_completed)) {
    throw new Error(
      "The seeded action steps are all one shape. Both a completed step and an open one have to " +
        "exist, because the detail screen renders them differently.",
    );
  }
  // ☠️ Deliberately none today. `valuesStepDaily` — `doWhatMatters`'s daily
  // practice — is "a step completed on the selected day", so a step ticked today
  // would make the ruling that today's practice stays open quietly stop being
  // true of the phase after the anchored one.
  const todayKey = dayKeyAt(DAYS - 1);
  const completedToday = steps.filter(
    (row) => row.completed_at !== null && localDayKey(new Date(row.completed_at)) === todayKey,
  );
  if (completedToday.length > 0) {
    throw new Error(
      `${completedToday.length} action step(s) were completed today, which ticks ` +
        "`doWhatMatters`'s daily practice. #1178 leaves today's practice open on both " +
        "programmes — it is the one row a reviewer can exercise themselves.",
    );
  }

  // THE BAND, over every timestamp column this slice writes: `reviewed_at` is
  // printed as a date on the history, `completed_at` is compared against the
  // selected day, and the rest are the ones a future check would reach for.
  await requireRowsInBand([
    ["act_bulls_eye_snapshots", ["reviewed_at", "created_at"]],
    ["act_value_entries", ["created_at", "updated_at"]],
    ["act_committed_actions", ["created_at", "updated_at"]],
    ["act_action_steps", ["created_at", "updated_at", "completed_at"]],
    [
      "act_program_state",
      ["created_at", "updated_at", "onboarding_completed_at", "last_check_in_at"],
    ],
  ]);
}

// ------------------------------------------------------------------ routines
// Four routines whose steps are CBT, ACT and shared-tool practices (#1290,
// #1271). Nothing seeded routines before #1290, so the /routines list, Home's
// routines widget, the floating progress button and the continue sheet all
// rendered empty on the demo account while twelve of the twenty steppable tools
// - with a picker group each - sat behind them.
//
// CADENCE VARIETY IS DELIBERATE, and the rationale this comment used to give for
// avoiding it was false. "A weekday cadence would make those surfaces depend on
// which weekday the seed happened to run, breaking determinism" is not what the
// code does: `isScheduledOn` is evaluated at RENDER against `new Date()` (the
// `scheduledToday` field in `use-routines-today.ts`), never at seed time, so
// re-seeding changes nothing about it. "The same picture" is a contract about
// reproducibility across RUNS, not invariance across VIEWING DAYS, and the
// seeded window has been anchored on `new Date()` from the start. A
// weekday-varying routine sits inside that contract (#1524).
//
// What was actually at stake was reviewability, and the product already answers
// it: an off-day card swaps in "Runs weekdays" (#106 - "not expected today",
// never "behind") and Home's row says "Nothing scheduled today". The two `daily`
// routines carry every surface that needs two open scheduled routines, so
// nothing below depends on the weekday either.
//
// WHAT THE TWO NON-`daily` CADENCES BUY, and neither is reachable without them:
//   - `weekdays` -> the strip's THIRD cell state, `strip.dayNotScheduled`
//     (`border-transparent bg-muted/15`, day-strip.tsx), on both the list and the
//     detail screen. Unconditional: a weekdays routine always has a Saturday and
//     a Sunday inside the last seven days, whichever day you look.
//   - `on-demand` -> the resting card's `schedule.onDemand` label, gated on
//     `restingToday` (`routines-home-screen.tsx`). On-demand is the one cadence
//     that is weekday-INDEPENDENT by construction, so this renders every day.
// WARNING: `schedule.weekdays` itself may stay unexercised - it renders only on a
// weekend where that routine is ALSO quiet, and "Steadying myself" is complete
// every day by construction (below). Stated rather than chased.
//
// NO `custom` ROUTINE (#1524). `schedule.customDays` and its Bulgarian weekday
// join stay a known unexercised string: computing `custom_days` from the seeding
// weekday so the screen looks identical every run is exactly the lie a reviewer
// trips over the first time they open the editor and find days nobody chose.
//
// EXACTLY ONE REMINDER, on "Back on my feet" (#1527, placed by #1541). Three
// routines keep reminders off - the editor defaults them off, and a demo account
// shipping default-on notifications sits against the standing guardrail that
// notifications are explicit and quiet by default. The fourth carries one
// because the guardrail is about the NUDGE and this fixture depicts an invented
// person who set one:
//   - NOT "Morning reset": it is the routine `firstOpenRoutineView` selects, and
//     `continue-routine-sheet.tsx` swaps its rich reminder-OFFER card for a bare
//     Close as soon as `reminderEnabled` is true. A reminder there spends the
//     offer for a button.
//   - NOT "Steadying myself": #1527 put it there and #1541 found it renders on
//     ZERO surfaces - neither `routine-detail-screen.tsx` nor
//     `routines-home-screen.tsx` reads `reminderEnabled` (test fixtures only),
//     and a complete routine is never selected by the sheet.
//   - ON "Back on my feet": both sheet branches light on one account for the
//     first time - complete Morning reset for the offer card, switch and
//     complete this one for the bare Close. 08:00 Europe/Sofia matches the
//     account's zone and sits clear of the CBT reminder at 20:00, so the two
//     read as distinct decisions rather than a copy.
// NOT an impossible state, unlike the consent shape #1525 fixed: consent is an
// ACCOUNT column, a push channel is a PER-DEVICE row (`web_push_subscriptions`).
// A reminder set with no subscription on this browser is what every real account
// looks like on a new device, and the editor already saves exactly that whenever
// the master switch is off.
// Seeding can never reach the OS permission prompt - it fires inside
// `ensureReminderChannel` at the moment of enabling, which seeding bypasses. A
// permanent gap for any seed-based fixture, not something a better fixture fixes.
//
// "Steadying myself" derives COMPLETE today BY CONSTRUCTION, not by choice.
// Its steps are `connection` and `choicePoint`, and the ACT block above pins a
// row dated today on each of them. Un-completing this routine means deleting one
// of those, which drops it to ONE lit strip day - below LIT_DAYS_MIN, so the
// guard at the end of this file throws. There is no second pre-today lit day to
// find: row counts are fixed (#1181, PLACED NEVER ADDED), and the choice-point
// block already had to MOVE its newest worksheet to manufacture the one it has.
// Anyone tempted to make this routine `in_progress` (#1541 was) hits that wall.
//
// #1541 gave a SECOND reason - that deleting the row would empty an ACT list
// screen, which was then a per-day view. #1515/#1517 retired that: the ACT lists
// are archives now. The decision survives on the lit-day guard alone.
//
// THE OPEN STEPS ARE CHOSEN SO THEIR ABSENCE IS GUARDED, NOT LUCKY. A routine
// only reads "in progress" or "resting" while some step has no row today, so
// every tool picked to be dark today is one whose darkness something else already
// asserts:
//   - `meditation` - the tools stride, held by this file's own EXPECTED check.
//   - `activities` - the activities block THROWS if anything is completed today,
//     keeping CBT's `behavioural` daily practice open (#1178). Completion-only by
//     the app's rule, so the three open rows pinned today do not count and a
//     reviewer can mark one done and watch the routine complete.
//   - `defusion` + `expansion` - both feed `openUp`'s daily practice, which #1178
//     rules deliberately open, so neither can carry a row dated today on any
//     fully seeded account. Their HISTORY is reachable: #1515/#1517 made the ACT
//     lists archives, so what is absent is the today-row, which is exactly what
//     `restingToday` reads.
// `journal` + `gratitude` do NOT work for the on-demand routine, which is what
// #1524 originally specified: `restingToday = !scheduledToday && doneCount === 0`
// and gratitude IS present today (see the Morning reset note above), so one done
// step is enough to make `restingToday` false and the `schedule.onDemand` label
// the routine exists for would never render.
// And NOT `meditation` on "Back on my feet": one session would complete both it
// and Morning reset at once, collapsing the queue and the chip row in a single
// tap.
const SEEDED_ROUTINES = [
  // Order is oldest first; the list orders by `created_at` descending, so a
  // reviewer reads this array bottom-up: "Steadying myself", "Morning reset",
  // "Back on my feet", "When I need to slow down".
  //
  // BOTH createdDay constraints below are load bearing. "Back on my feet" sits
  // BELOW 26 so `firstOpenRoutineView` reaches Morning reset first (2/3 reads
  // richer than 1/2) and the FAB renders `+1` beside it; the on-demand routine
  // keeps the LOWEST so it still sorts last, where a thing you reach for rather
  // than schedule belongs.
  {
    name: "When I need to slow down",
    createdDay: 8,
    cadence: "on-demand",
    steps: ["defusion", "expansion"],
  },
  {
    name: "Back on my feet",
    createdDay: 19,
    cadence: "daily",
    reminder: { hour: 8, minute: 0, timezone: "Europe/Sofia" },
    steps: ["sleep", "activities"],
  },
  { name: "Morning reset", createdDay: 26, cadence: "daily", steps: ["mood", "meditation", "cbt"] },
  {
    name: "Steadying myself",
    createdDay: 44,
    cadence: "weekdays",
    steps: ["connection", "choicePoint"],
  },
];

{
  const stepRows = [];
  // Counted off the ids the database handed back, never off the array that asked
  // for them: every other `counts.*` here is an insert's own return, and a count
  // restated from the input reports four routines whatever the database did.
  const insertedIds = [];
  for (const routine of SEEDED_ROUTINES) {
    const createdAt = at(routine.createdDay, 7, 45);
    // Through the VIEW with an EXPLICIT user id: `routines` is encrypted
    // (`name_enc` on `routines_data`) and the INSTEAD OF insert trigger falls
    // back to `auth.uid()`, which is null under the service-role client.
    //
    // ☠️ `updated_at` cannot be backdated here — the trigger hard-sets it to
    // now() with no coalesce, the same shape `values_profile` has. Nothing
    // renders a routine's `updated_at`, so this is recorded, not worked around.
    //
    // The reminder columns are written as a SET or not at all: a routine with
    // `reminder_enabled` false keeps its hour, minute and timezone null, which is
    // the shape the editor saves and the shape the reminder sender skips on. An
    // enabled routine carries all three, because a time with no zone beside it
    // fires wherever the server happens to think the account lives.
    routine.id = await insertReturningId("routines", {
      user_id: DEMO_USER_ID,
      name: routine.name,
      reminder_enabled: Boolean(routine.reminder),
      reminder_hour: routine.reminder?.hour ?? null,
      reminder_minute: routine.reminder?.minute ?? null,
      reminder_timezone: routine.reminder?.timezone ?? null,
      cadence: routine.cadence,
      custom_days: [],
      created_at: createdAt,
    });
    if (routine.id) insertedIds.push(routine.id);

    routine.steps.forEach((toolId, position) => {
      stepRows.push({
        routine_id: routine.id,
        user_id: DEMO_USER_ID,
        tool_id: toolId,
        position,
        created_at: createdAt,
        updated_at: createdAt,
      });
    });
  }

  counts.routines = insertedIds.length;
  counts.routine_steps = await insert("routine_steps", stepRows);
}

// ----------------------------- the routine strips, read back out of the DB
// A routine's status is derived, never stored, so the only way to know what a
// reviewer will see is to re-derive it from the rows the database actually
// holds. Everything checked here is RESTATED from #1290 rather than read off the
// placement above: the expectations below share no constant with the code that
// dated the rows, so a nudge to either one has something to disagree with.
//
// ⚠️ What this cannot catch on its own is a wrong day mapping in
// `seededDayKey` — placement and check would then agree with each other and
// disagree with the app. That half is held by the app's own suite, which
// derives the same statuses through `deriveRoutine` from the same columns.
{
  // Restated from #1290 and #1271, step order included: `nextStep` is the FIRST
  // not-done step in routine order, and that is the step the continue sheet opens
  // on and the floating button names. Order is advisory to the derivation and
  // load bearing for what a reviewer is handed.
  //
  // A PER-ROUTINE ALLOWLIST, not a blanket rule (#1271). Cadence, the reminder
  // and the lit-day count are stated one routine at a time, so an UNINTENDED
  // reminder or a cadence that drifts still fails as loudly as it did when every
  // routine had to be `daily` with reminders off - the guard just now knows which
  // three of the four are which.
  //
  // `lit` is the number of days in the seven-day strip window that derive
  // complete. Two to three for a scheduled routine: not zero, which reads as a
  // dead surface, and not seven, which reads as a streak trophy the feature
  // refuses to draw.
  //
  // EXCEPT for the on-demand routine, whose `lit` is ZERO and STRUCTURALLY so.
  // Its steps are `defusion` and `expansion`, and the expansion block pins every
  // one of its rows on or before `ACT_PHASE_STARTED_DAY - 2` so `makeRoomOnce`
  // stays open (#1178) - which is 76, six days before the strip window even
  // opens. Expansion therefore cannot light a window day at all, and no pairing
  // fixes it: `urgeSurf` stops at the same day, and every other steppable tool
  // that is quiet TODAY (which `restingToday` requires) is already spoken for by
  // another routine. THIS IS NOT A DEAD SURFACE: `isScheduledOn` is false on every
  // day for an on-demand routine, so all seven cells render as
  // `strip.dayNotScheduled` - "nothing was expected here" (#106) - and this is the
  // only routine on the account that draws that strip whole. Asserted as exactly
  // zero rather than exempted, so a row drifting into the window still fails.
  const EXPECTED = {
    "Morning reset": {
      today: "in_progress",
      cadence: "daily",
      reminder: false,
      lit: [2, 3],
      steps: ["mood", "meditation", "cbt"],
    },
    "Steadying myself": {
      today: "complete",
      cadence: "weekdays",
      reminder: false,
      lit: [2, 3],
      steps: ["connection", "choicePoint"],
    },
    "Back on my feet": {
      today: "in_progress",
      cadence: "daily",
      reminder: true,
      lit: [2, 3],
      steps: ["sleep", "activities"],
    },
    "When I need to slow down": {
      today: "not_started",
      cadence: "on-demand",
      reminder: false,
      lit: [0, 0],
      steps: ["defusion", "expansion"],
    },
  };

  const { data: seededRoutines, error: routinesError } = await admin
    .from("routines")
    .select(
      "id,name,reminder_enabled,reminder_hour,reminder_minute,reminder_timezone,cadence,custom_days",
    )
    .eq("user_id", DEMO_USER_ID);
  if (routinesError) throw new Error(`read routines: ${routinesError.message}`);

  const { data: seededSteps, error: stepsError } = await admin
    .from("routine_steps")
    .select("routine_id,tool_id,position")
    .eq("user_id", DEMO_USER_ID)
    .order("position", { ascending: true });
  if (stepsError) throw new Error(`read routine_steps: ${stepsError.message}`);

  const names = seededRoutines.map((routine) => routine.name).sort();
  const wanted = Object.keys(EXPECTED).sort();
  if (JSON.stringify(names) !== JSON.stringify(wanted)) {
    throw new Error(
      `The demo account holds routines [${names.join(", ")}], not [${wanted.join(", ")}]. ` +
        "Every check below keys off the names, so it would pass over the wrong routines.",
    );
  }

  // One read per referenced tool, then the derivation `deriveRoutine` performs:
  // a day is complete only when EVERY step landed on it, and an empty routine
  // is never complete.
  const referenced = [...new Set(seededSteps.map((step) => step.tool_id))];
  const dayIndexes = {};
  for (const toolId of referenced) {
    const source = ROUTINE_STEP_SOURCES[toolId];
    if (!source) {
      throw new Error(
        `Step tool "${toolId}" has no entry in ROUTINE_STEP_SOURCES, so its completions ` +
          "cannot be read back and every strip check below would silently skip it.",
      );
    }
    dayIndexes[toolId] = await seededDayIndexes(source);
  }

  const statusOn = (steps, day) => {
    const done = steps.filter((toolId) => dayIndexes[toolId].has(day)).length;
    if (steps.length === 0 || done === 0) return "not_started";
    return done === steps.length ? "complete" : "in_progress";
  };

  let openStepsToday = 0;
  for (const routine of seededRoutines) {
    const steps = seededSteps
      .filter((step) => step.routine_id === routine.id)
      .map((step) => step.tool_id);

    const expected = EXPECTED[routine.name];

    if (routine.cadence !== expected.cadence || routine.custom_days.length > 0) {
      throw new Error(
        `"${routine.name}" came back as cadence ${routine.cadence}` +
          `${routine.custom_days.length > 0 ? ` with custom days [${routine.custom_days}]` : ""}, ` +
          `not ${expected.cadence}. The roster is decided one routine at a time (#1271) and ` +
          "each cadence buys a specific surface - `weekdays` the strip's not-scheduled cell, " +
          "`on-demand` the resting card's schedule label - so a cadence that moves silently " +
          "takes one of them away. No routine is `custom`: that string stays deliberately " +
          "unexercised rather than seeded from the weekday the script happened to run.",
      );
    }

    if (routine.reminder_enabled !== expected.reminder) {
      throw new Error(
        `"${routine.name}" came back with reminders ` +
          `${routine.reminder_enabled ? "ON" : "off"}, not ` +
          `${expected.reminder ? "ON" : "off"}. Exactly one seeded routine carries a reminder ` +
          "(#1527/#1541), and it is not this one by default: an unintended reminder on " +
          '"Morning reset" swaps the continue sheet\'s reminder-offer card for a bare Close, ' +
          "and one on a complete routine renders nowhere at all.",
      );
    }

    // A time is only half a reminder. Written as a set or not at all, checked the
    // same way - an armed routine with a null zone fires wherever the server
    // guesses the account lives, and an off routine holding a stale time is a
    // shape the editor never saves.
    const reminderFields = [
      routine.reminder_hour,
      routine.reminder_minute,
      routine.reminder_timezone,
    ];
    if (
      expected.reminder
        ? reminderFields.some((v) => v === null)
        : reminderFields.some((v) => v !== null)
    ) {
      throw new Error(
        `"${routine.name}" has reminders ${routine.reminder_enabled ? "ON" : "off"} but holds ` +
          `hour ${routine.reminder_hour}, minute ${routine.reminder_minute}, timezone ` +
          `${routine.reminder_timezone}. An enabled reminder needs all three; a disabled one ` +
          "needs none of them.",
      );
    }
    if (JSON.stringify(steps) !== JSON.stringify(expected.steps)) {
      throw new Error(
        `"${routine.name}" came back with steps [${steps.join(", ")}], not ` +
          `[${expected.steps.join(", ")}]. The continue sheet opens on the first not-done ` +
          "step in this order, so the order is what a reviewer is handed, not a detail.",
      );
    }

    const today = statusOn(steps, DAYS - 1);
    if (today !== expected.today) {
      throw new Error(
        `"${routine.name}" derives as ${today} today, not ${expected.today}. ` +
          `Its steps are ${steps.join(", ")}, of which ` +
          `${steps.filter((toolId) => dayIndexes[toolId].has(DAYS - 1)).join(", ") || "none"} ` +
          "landed today.",
      );
    }

    const [litMin, litMax] = expected.lit;
    const lit = stripWindow().filter((day) => statusOn(steps, day) === "complete");
    if (lit.length < litMin || lit.length > litMax) {
      throw new Error(
        `"${routine.name}" lights ${lit.length} of the last ${ROUTINE_STRIP_DAYS} days ` +
          `(${lit.join(", ") || "none"}), outside the ${litMin}-${litMax} this slice keeps for ` +
          "it. For a scheduled routine zero reads as a dead surface and a full strip reads as " +
          "a streak; the on-demand routine is the one that expects zero, because its expansion " +
          "step cannot carry a row inside the window without completing `makeRoomOnce`, and an " +
          "unscheduled day draws quieter than an open one anyway.",
      );
    }

    // COUNTED ONLY FOR SCHEDULED ROUTINES, which is what the FAB itself does
    // (`openScheduledViews` filters by `isScheduledOn`). Without the filter the
    // on-demand routine's two permanently-open steps would keep this above zero
    // for ever, and the check below - whose whole job is to notice that every
    // scheduled routine went complete - could never fail again.
    //
    // `weekdays` is counted here as scheduled whatever today is: this runs at seed
    // time and the FAB decides at render time, so a Saturday reviewer sees one
    // fewer scheduled routine than this counts. That is safe in this direction -
    // the two `daily` routines carry the check on their own - and pinning it to
    // the seeding weekday would make the guard, not the app, the thing that
    // varies.
    if (routine.cadence !== "on-demand") {
      openStepsToday += steps.filter((toolId) => !dayIndexes[toolId].has(DAYS - 1)).length;
    }
  }

  // The floating progress button is visible ONLY while a scheduled routine has
  // an open step today, so "the FAB renders" is this number being above zero —
  // a separate fact from any one routine's status, and the one that goes first
  // if every scheduled routine ever derives complete.
  if (openStepsToday === 0) {
    throw new Error(
      "Every scheduled seeded routine step is done today, so the floating routine-progress " +
        "button and the continue sheet behind it never appear on the demo account.",
    );
  }

  // TWO OPEN SCHEDULED ROUTINES, not one. The continue sheet's switch chip row
  // (`switchable.length > 1`) and the FAB's `+N` queue (`fab.progressQueued`,
  // `fab.moreAfter_one`/`_other`, `sheet.switchLabel`) share the exact same gate,
  // so four i18n keys across two affordances render on this account or on none.
  // Counted the way `openScheduledViews` counts: a routine is open when at least
  // one step has no row today.
  const openScheduled = seededRoutines.filter((routine) => {
    if (routine.cadence === "on-demand") return false;
    const steps = seededSteps
      .filter((step) => step.routine_id === routine.id)
      .map((step) => step.tool_id);
    return steps.some((toolId) => !dayIndexes[toolId].has(DAYS - 1));
  });
  if (openScheduled.length < 2) {
    throw new Error(
      `Only ${openScheduled.length} scheduled routine (${openScheduled.map((r) => r.name).join(", ") || "none"}) ` +
        "has an open step today, so the continue sheet's switch chip row and the FAB's `+N` " +
        "queue both stay hidden and four i18n keys render nowhere on this account.",
    );
  }
}

// ------------------------ the Home layouts, read back out of the DB (#1352)
// Three accounts, one guard, because the three facts are one decision: demo's
// dashboard is full, bob's holds exactly what onboarding would have given him, and
// alice's is empty ON PURPOSE. This script only ever WRITES the demo user, but it is
// the last thing `npm run db:reset` runs, so it is the only place that can fail
// loudly about all three on a freshly reset stack — `supabase/seed.sql` is a plain
// data file with no way to assert anything.
//
// Checked as IDS IN POSITION ORDER, never as a count. The failure this exists to
// catch is a silently dropped or mistyped id: `widget_preferences.widget_id` is bare
// TEXT with no FK and no check, and the dashboard filters on `widgetId in
// WIDGET_META`, so a typo inserts fine, renders nothing, and reads as a missing Home
// row that gets blamed on the screen being reviewed.
{
  // Must match supabase/seed.sql. Read-only here; nothing below writes them.
  const ALICE_USER_ID = "00000000-0000-0000-0000-000000000001";
  const BOB_USER_ID = "00000000-0000-0000-0000-000000000002";
  // Restated from #1352, not read off seed.sql, so the two have something to
  // disagree about.
  const BOB_WIDGET_IDS = ["cbt-programme", "mood-checkin", "breathing-suggested", "journal-week"];

  const readLayout = async (userId, label) => {
    const { data, error } = await admin
      .from("widget_preferences")
      .select("widget_id,position")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (error) throw new Error(`${label} widget_preferences read-back: ${error.message}`);
    return data;
  };

  const expectLayout = (rows, expected, label) => {
    const ids = rows.map((row) => row.widget_id);
    if (JSON.stringify(ids) !== JSON.stringify(expected)) {
      throw new Error(
        `${label}'s Home layout reads [${ids.join(", ")}], not [${expected.join(", ")}]. ` +
          "An id that is not in WIDGET_META inserts fine and renders nothing, so a typo " +
          "here surfaces as a Home row the reviewer thinks the screen dropped.",
      );
    }
    // 0-based and contiguous, the way `apply_widget_recommendations` assigns them.
    const positions = rows.map((row) => row.position);
    const wanted = expected.map((_, index) => index);
    if (JSON.stringify(positions) !== JSON.stringify(wanted)) {
      throw new Error(
        `${label}'s widget positions are [${positions.join(", ")}], not a contiguous ` +
          `0-based [${wanted.join(", ")}]. That is not a layout a real wizard run produces.`,
      );
    }
  };

  expectLayout(await readLayout(DEMO_USER_ID, "demo"), DEMO_WIDGET_IDS, "demo");
  // ⚠️ bob's rows come from seed.sql and this script never writes them, so this leg
  // can only fail on a stack whose seed.sql did not run or was undone. Anything that
  // clears a seed user's `widget_preferences` wholesale strips a layout nothing short
  // of `npm run db:reset` restores — which is why the integration suite's cleanup is
  // scoped to its own `test-widget-*` ids rather than deleting by user.
  expectLayout(await readLayout(BOB_USER_ID, "bob"), BOB_WIDGET_IDS, "bob");

  const aliceLayout = await readLayout(ALICE_USER_ID, "alice");
  if (aliceLayout.length > 0) {
    throw new Error(
      `alice holds ${aliceLayout.length} widget preference(s), and she is the fixture whose ` +
        "Home must read as an EMPTY DASHBOARD. Once demo and bob carry layouts she is the " +
        "only account left on which the empty-dashboard re-offer, and the onboarding " +
        "wizard's starter panel behind it, are reachable at all.",
    );
  }

  // The other two invariants this layout decided — demo's remaining `/arrange` chip
  // run of 11, and bob's four ids composing a THREE-step starter card — are asserted
  // in `test/seed-widget-layouts.test.ts`, not here, and deliberately so. Both are
  // facts about SOURCE (`WIDGET_META`, `buildStarterSteps`), not about rows, and that
  // test can `import` the real thing where this script, being plain `.mjs`, could only
  // regex TypeScript. A guard that reads another file's type annotation and
  // indentation would break `npm run db:reset` on a reformat that changed nothing.
  // This block owns what only a database can answer; that test owns the rest.
}

// ------------------- reminder consent, read back out of the DB (#1271/#1525)
// ACCOUNT-LEVEL, NOT DEMO-SPECIFIC, so all three seeded accounts are checked
// together for the same reason the Home layouts are: this script is the last
// thing `npm run db:reset` runs, and `supabase/seed.sql` is a plain data file
// with no way to assert anything about itself.
//
// The invariant: `reminder_consent` must be TRUE wherever any per-tool enabled
// flag is true. Consent is a hard DELIVERY gate — `send-web-reminders` continues
// on a falsy one — and `enableTargetPatch` always writes consent alongside the
// enabled column precisely so no surface can arm a reminder without it. A false
// consent sitting beside an armed target is therefore a state NO USER PATH CAN
// PRODUCE: the Reminders screen draws the row as armed and the server can never
// send it. Demo held exactly that until #1271, because this script overwrote the
// consent `supabase/seed.sql` had already granted.
//
// The timestamp half is checked too, because it is the difference between two
// states with the same boolean. `false` + NULL is NEVER ASKED and the one-time
// contextual prompt is offered; `false` + a non-null timestamp is DECLINED and
// the prompt is withheld for good. Declined has no positive rendering — it is
// only ever an absence — so seeding it costs a surface and buys nothing, and
// alice is deliberately the never-asked account rather than the declined one.
{
  const ACCOUNTS = [
    ["demo", DEMO_USER_ID],
    ["alice", "00000000-0000-0000-0000-000000000001"],
    ["bob", "00000000-0000-0000-0000-000000000002"],
  ];
  // Every per-tool reminder switch on `user_preferences`. Listed rather than
  // globbed: a new tool's column has to be added here on purpose, and a guard
  // that silently stopped covering one would be worse than no guard.
  const TARGET_COLUMNS = [
    "act_reminders_enabled",
    "breathing_reminders_enabled",
    "cbt_reminders_enabled",
    "gratitude_reminders_enabled",
    "grounding_reminders_enabled",
    "habits_reminders_enabled",
    "journal_reminders_enabled",
    "meditation_reminders_enabled",
    "mood_reminders_enabled",
    "sleep_reminders_enabled",
  ];

  for (const [label, userId] of ACCOUNTS) {
    const { data, error } = await admin
      .from("user_preferences")
      .select(["reminder_consent", "reminder_consent_updated_at", ...TARGET_COLUMNS].join(","))
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`${label} user_preferences read-back: ${error.message}`);
    if (!data) throw new Error(`${label} has no user_preferences row to check consent on.`);

    const armed = TARGET_COLUMNS.filter((column) => data[column]);
    if (armed.length > 0 && !data.reminder_consent) {
      throw new Error(
        `${label} has reminder consent off while ${armed.join(", ")} ` +
          `${armed.length === 1 ? "is" : "are"} armed. Consent is a hard delivery gate, so ` +
          "this account renders reminders it can never be sent — a state no user path can " +
          "produce.",
      );
    }
    if (!data.reminder_consent && data.reminder_consent_updated_at !== null) {
      throw new Error(
        `${label} reads as DECLINED (consent false with a timestamp of ` +
          `${data.reminder_consent_updated_at}), which permanently withholds the one-time ` +
          "contextual reminder prompt on every tool. Declined has no positive rendering, so " +
          "no fixture should be seeded into it.",
      );
    }
  }

  // Demo specifically: consented, with the CBT target armed. Restated here rather
  // than left to the invariant above, because "no contradiction" is also true of
  // an account with consent off and nothing armed — which is what demo used to be
  // one line away from, and which shows the reviewer no armed reminder row at all.
  const { data: demoPreferences, error: demoError } = await admin
    .from("user_preferences")
    .select("reminder_consent,cbt_reminders_enabled,cbt_reminder_hour,cbt_reminder_timezone")
    .eq("user_id", DEMO_USER_ID)
    .maybeSingle();
  if (demoError) throw new Error(`demo consent read-back: ${demoError.message}`);
  if (!demoPreferences.reminder_consent || !demoPreferences.cbt_reminders_enabled) {
    throw new Error(
      `Demo came back with consent ${demoPreferences.reminder_consent} and the CBT reminder ` +
        `${demoPreferences.cbt_reminders_enabled ? "on" : "off"}. Both are seeded true by ` +
        "`supabase/seed.sql` and this script must leave them alone: with every target off, " +
        "the Reminders screen is ten off toggles and an armed row — its time, its zone — is " +
        "never rendered without a reviewer arming one by hand.",
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
const wipedButEmpty = DEMO_SEED_WIPE_TABLES.filter((table) => !counts[table]);
if (wipedButEmpty.length > 0) {
  console.error("Insert counts for this run:");
  for (const [table, n] of Object.entries(counts)) console.error(`  ${table}: ${n}`);
  throw new Error(
    `Wiped but not re-seeded: ${wipedButEmpty.join(", ")}. ` +
      "Every table in DEMO_SEED_WIPE_TABLES must end the run with a non-zero insert count.",
  );
}

console.log("Seeded demo@test.local:");
for (const [table, n] of Object.entries(counts)) console.log(`  ${table}: ${n}`);

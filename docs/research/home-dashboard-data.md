# Home dashboard data audit — what each drawn number can stand on today (#955)

Research for #949 (home-dashboard redesign, design `10b`). For every number the design
draws, this records: what the current home widget shows and computes from, the data
source today (client React Query cache with its cap, an existing server aggregate, or
nothing), whether the civil-day/timezone boundary is handled, and what a new aggregate
would need. In-repo + migration audit only; no live Supabase queries were run.

**House rule for new aggregates** (per the ticket, refined by #808's own findings — see
[the volatility correction](#a-correction-to-the-house-rules-premise-808)): `security
invoker` RPC, `stable`, `set search_path = pg_catalog, public`, over the `*_data` base
tables, no args where possible, `revoke from public/anon`, `grant to authenticated` —
the shape every existing aggregate below already has.

## Verdict summary

| Drawn stat                                 | Verdict                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check-in "3 this week · 7-day average 3.0" | **Computable today** (client cache, 200-row; both mechanisms exist on the tracker screen)                                                                                                                                                                   |
| Journal "24 entries · 698 words"           | **Computable today, exact** (head count + `journal_word_total()` RPC; the widget already renders both)                                                                                                                                                      |
| Gratitude "29 entries · 83 items"          | Entries exact today; **items needs a new RPC** (today it is a recent-30-page sum, not lifetime)                                                                                                                                                             |
| Breathing "Last session yesterday"         | **Computable today** (newest row of the capped list; captured `dayKey`)                                                                                                                                                                                     |
| Grounding "14 sessions · 44 minutes"       | Sessions exact today; **minutes needs a new RPC** (today capped at newest 30 rows)                                                                                                                                                                          |
| Meditation "30 sessions · 551 minutes"     | Sessions exact today; **minutes needs a new RPC** (today capped at newest 30 rows)                                                                                                                                                                          |
| Sleep "7.2h average · quality 3.2"         | **Computable today, exact** (`sleep_stats(p_time_zone)` RPC already returns both)                                                                                                                                                                           |
| Habits "2 of 4 done today"                 | **Computable today** (client; habits list is uncapped) — but no home widget computes it: the `habits-today` slot renders CBT activities                                                                                                                     |
| Nudge: "Sleep from last night"             | **Computable with a decision**: "last night logged?" is answerable from the capped list, but needs a decided night definition (windowed entries key to sleep-_start_ day, duration-only entries to the logging day). Weekly average: exists (`sleep_stats`) |
| Nudge: "Two habits due"                    | **Computable today** (same client computation as the habits hero: due-today minus ticked)                                                                                                                                                                   |
| CBT programme "4 of 12"                    | **Not honestly computable today.** Denominator 12 = total CBT task defs (real), but per-task completion is never persisted; only `phase_index` (0–4 of 5 phases) is stored                                                                                  |
| ACT programme "0 of 10"                    | **Not honestly computable today.** Same shape: 10 = total ACT task defs, 4 phases stored as `phase_index` 0–3                                                                                                                                               |

---

## 1. The eight tool-row stats

### 1.1 Check-in — "3 this week · 7-day average 3.0"

| Question                  | Answer                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widgets           | `src/features/home/widgets/mood-checkin-widget.tsx` (today's logs + last time, from `useMoodLogs(userId, 30)`, filtered on `dayKey === todayKey`, lines 17–26); `src/features/home/widgets/mood-trend-widget.tsx` (7-day average over the same 30-row cache, lines 15–29, plus exact lifetime count via `useMoodLogCount`)                                       |
| "This week" count source  | Exists on the tracker screen, not on home: `countLogsInCurrentWeek` (`src/features/mood/week-window.ts:261–270`) over `useMoodHistory(userId, 200)` (`src/features/mood/mood-tracker-screen.tsx:101,168`). Calendar week Mon–Sun over captured `dayKey`s — deliberately not a trailing 7 days (#697)                                                             |
| 7-day average source      | Tracker: `getMoodSummary(moodLogs, 7)` (`src/features/mood/summaries.ts:27`) — `dayKey`-windowed via `dayRangeEndKey`. Home trend widget: `computeAverage` cuts on `new Date(l.loggedAt) >= startOfDayDaysAgo(7)` (`mood-trend-widget.tsx:15–20`) — a **viewer-timezone instant cut, not the captured day**; the tracker's mechanism is the correct one to reuse |
| Cache cap                 | `useMoodLogs` default 30 (`src/features/mood/queries.ts:33`); `MOOD_HISTORY_WINDOW = 200` (`queries.ts:47`). A week/7-day window breaks only past ~200 logs in the window (≈28/day) — practically exact                                                                                                                                                          |
| Civil-day handling        | Yes on the tracker path: `dayKey` is captured at logging time (`logged_offset_minutes`, #250/#330) and compared, never re-bucketed                                                                                                                                                                                                                               |
| Existing server aggregate | `mood_emotion_counts()` (lifetime per-emotion counts, `supabase/migrations/20260809000000_mood_emotion_counts.sql`) — not what this stat needs. Exact lifetime count: `countMoodLogs` head count                                                                                                                                                                 |
| New aggregate needed      | None required. If exactness at any volume is wanted: a `mood_week_stats(p_time_zone)` twin of `sleep_stats` over `mood_logs_data` (`score` and `logged_offset_minutes` are plaintext columns; zero decrypts)                                                                                                                                                     |

### 1.2 Journal — "24 entries · 698 words"

| Question             | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget       | `src/features/home/widgets/journal-week-widget.tsx` — renders **exactly this pair** (lines 80–91)                                                                                                                                                                                                                                                                                                                                       |
| Source               | Both server-exact today: `useJournalEntryCount` → `countJournalEntries` (PostgREST head count, `src/features/journal/repository.ts:85–93`) and `useJournalWordTotal` → `journal_word_total()` RPC (`supabase/migrations/20260719_journal_word_total.sql:13–53`, built for exactly this — the 50-row list cache froze both numbers, #293/#323). The 50-row list (`journal/queries.ts:33`) only stands in until the server numbers arrive |
| Civil-day handling   | N/A (lifetime totals). The widget's day badge compares captured `dayKey` (lines 44–48)                                                                                                                                                                                                                                                                                                                                                  |
| New aggregate needed | **None. Fully standing today.** Note `journal_word_total()` reads the decrypting view `public.journal_entries` by necessity — word-counting needs plaintext; the per-call decrypt of every body is inherent to the stat                                                                                                                                                                                                                 |

### 1.3 Gratitude — "29 entries · 83 items"

| Question                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget            | `src/features/home/widgets/gratitude-widget.tsx` — entries stat exact via `useGratitudeEntryCount` → `countGratitudeEntries` head count (`src/features/gratitude/repository.ts:129–137`); the "items" stat is `answeredCount` summed over the **recent 30-entry page only** (`gratitude-widget.tsx:22,34–38`), documented as "an at-a-glance figure", not lifetime                                                                                                                                                                                                         |
| Cache cap                 | Widget fetches 30 (`useGratitudeEntries(userId, 30)`; hook default 50, `gratitude/queries.ts:34`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Civil-day handling        | Day badge compares captured `dayKey` (lines 27–31)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Existing server aggregate | None for items                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| New aggregate needed      | **Yes, for a lifetime items count**: `gratitude_item_total()` — no args, `stable`, `security invoker`, over `public.gratitude_entries_data`, summing `(item_1_enc is not null)::int + … + (item_5_enc is not null)::int`. **Zero decrypts**: the encryption migration guarantees an empty slot is a NULL ciphertext ("positional NULL semantics are load-bearing", `supabase/migrations/20260613_gratitude_entries_encrypt.sql:13–16`), and the client's `answeredCount` counts non-blank slots the same way (`src/features/gratitude/questions.ts:11–13`). Cheap to build |

### 1.4 Breathing — "Last session yesterday"

| Question                   | Answer                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget             | `src/features/home/widgets/breathing-widget.tsx` — renders "Last session {date}" from `sessions?.at(0)` of `useBreathingSessions` (lines 18–25, 46–52)                                                                                                              |
| Cache cap                  | 30 newest (`src/features/breathing/queries.ts:26`) — irrelevant for a "newest row" stat                                                                                                                                                                             |
| Civil-day handling         | Yes: sessions carry a captured `dayKey`; the widget compares, never re-buckets (#330, comment at lines 21–23). A relative "yesterday" label is a `dayKey` diff against today's key                                                                                  |
| Existing server aggregates | `countMindfulnessSessionsExcludingNames` (exact session count, `breathing/queries.ts:43–44`) and `breathing_total_minutes(excluded_names)` (`supabase/migrations/20260809010000_breathing_total_minutes.sql:36–59`) if the redesign later wants counts/minutes here |
| New aggregate needed       | **None. Fully standing today**                                                                                                                                                                                                                                      |

### 1.5 Grounding — "14 sessions · 44 minutes"

| Question                | Answer                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget          | `src/features/home/widgets/grounding-log-widget.tsx` → shared `SessionLogWidget` (`session-log-widget.tsx:29–47`): **both** numbers are `list.length` and a minutes sum over the capped list                                                                                                                                                                                                                          |
| Cache cap               | 30 newest (`src/features/grounding/queries.ts:22`) — both drawn numbers silently freeze at 30 sessions today                                                                                                                                                                                                                                                                                                          |
| Exact pieces that exist | Sessions: `countMindfulnessSessionsByNames(groundingSlugs)` head count (`grounding/queries.ts:55–56`) — used by the grounding home hero, not by the widget. Minutes: **nothing** (`breathing_total_minutes` is exclusion-filtered; no inclusion twin exists)                                                                                                                                                          |
| Civil-day handling      | N/A for lifetime totals; sessions carry captured `dayKey`                                                                                                                                                                                                                                                                                                                                                             |
| New aggregate needed    | **Yes**: `grounding_total_minutes(included_names text[])` — the inclusion mirror of `breathing_total_minutes`, `where exercise_name = any(included_names)`, over `public.mindfulness_sessions_data` (`duration_minutes` is a plain `int`; zero decrypts). Grounding is the closed slug set, so inclusion is the correct filter direction here — the same line `countMindfulnessSessionsByNames` draws. Cheap to build |

### 1.6 Meditation — "30 sessions · 551 minutes"

| Question                | Answer                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget          | `src/features/home/widgets/meditation-widget.tsx` — `all.length` and `all.reduce(... durationMinutes)` over the capped list (lines 20–22, 43–48)                                                                                                                                                                           |
| Cache cap               | 30 newest (`src/features/meditation/queries.ts:39`) — both drawn numbers freeze at 30 sessions today (the drawn "30 sessions" is suspiciously exactly the cap)                                                                                                                                                             |
| Exact pieces that exist | Sessions: `countMeditationSessions` head count (`src/features/meditation/repository.ts:191–201`). Median: `meditation_median_minutes()` RPC (`supabase/migrations/20260728_meditation_median_minutes.sql`). Lifetime **total** minutes: **nothing**                                                                        |
| Civil-day handling      | `doneToday` compares captured `dayKey` (widget line 21); lifetime totals need none                                                                                                                                                                                                                                         |
| New aggregate needed    | **Yes**: `meditation_total_minutes()` — no args, `coalesce(sum(duration_minutes), 0)` over `public.meditation_sessions` (a plain RLS table — it was never renamed to `_data` and has no decrypting view; `duration_minutes` is an unencrypted `int`, per the median migration's own header). The cheapest RPC on this list |

### 1.7 Sleep — "7.2h average · quality 3.2"

| Question             | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget       | `src/features/home/widgets/sleep-widget.tsx` — renders **exactly this pair**: `averageDurationMinutes(all, 7)` + `averageQuality(all, 7)` over `useSleepLogs(userId, 30)` (lines 23–29, 50–61)                                                                                                                                                                                                                                                          |
| Client mechanism     | `src/features/sleep/summaries.ts:11–30` — `dayKey`-walked window via `dayRangeEndKey` (#250), so travel does not shift nights between buckets. 30 rows cover a 7-day window unless a user logs >30 entries/week                                                                                                                                                                                                                                         |
| Server aggregate     | **Exists and is exact**: `sleep_stats(p_time_zone)` returns `avg_duration_minutes_7` and `avg_quality_7` (plus 30-day stats, quality distribution, extremes, weekday averages) — `supabase/migrations/20260811000000_sleep_window.sql:190–283`, over `sleep_logs_data` (base table since `20260808000000_sleep_stats_base_table.sql`). The sleep tracker screen already calls it (`src/features/sleep/sleep-tracker-screen.tsx:48` via `useSleepStats`) |
| Civil-day handling   | Yes, best-in-repo: windowed entries use stored `entry_day` (civil day at sleep start, #800), offset-carrying rows use the captured offset, legacy rows fall back to the caller-supplied timezone                                                                                                                                                                                                                                                        |
| New aggregate needed | **None. Fully standing today** — the dashboard should call `sleep_stats` rather than the capped client list                                                                                                                                                                                                                                                                                                                                             |

### 1.8 Habits — "2 of 4 done today"

| Question                     | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current widget               | **There is no habits home widget.** The registry id `habits-today` maps to `ActivitiesWidget` — CBT behavioural-activation activities (`src/features/home/widget-registry.tsx:51`; `src/features/home/widgets/activities-widget.tsx:14–25` documents this: "it reads no habit data at all, only `activity_logs.scheduled_at`", kept under the old id because `widget_preferences.widget_id` is a storage key). Its badge is done/total of _scheduled CBT activities_, not habits |
| Where the real figure exists | The habits home screen hero: `dueToday = allHabits.filter((h) => isScheduledOn(h, today))`, `dueTodayTicked = dueToday.filter((h) => isTickedOn(allLogs, h.id, todayStr))` (`src/features/habits/habits-home-screen.tsx:88–91`, rendered as `${dueTodayTicked}/${dueToday.length}` at line 178)                                                                                                                                                                                  |
| Data source & caps           | `useHabits(userId, { includeArchived: true })` — **uncapped** list of habits (`src/features/habits/repository.ts:96–99`); logs from `useHabitLogs` with a 30-day `sinceDate` window (`habits-home-screen.tsx:47–48`). Today's ticks always fit; no cap risk. (The old 365-row history cap was replaced by 50-row keyset pages, `habits/queries.ts:57`)                                                                                                                           |
| Civil-day handling           | `isScheduledOn` uses the viewer-local weekday (`habits/scheduling.ts:13–19`); `logged_on` is a plain civil `date` written from the local day key. Consistent, viewer-local by design                                                                                                                                                                                                                                                                                             |
| New aggregate needed         | **None** — the data is small and bounded (a user's habits + today's ticks); this is honestly a client computation. The build cost is a _widget_, not an aggregate                                                                                                                                                                                                                                                                                                                |

## 2. The two nudges

### 2.1 "Sleep from last night"

- **Can the app know last night is unlogged?** Mostly. `loggedOnDate(logs, dateKey)`
  exists (`src/features/sleep/summaries.ts:80–82`) and the 30-row list always covers the
  last two days. The catch is the **night definition**: a windowed entry's `dayKey` is
  the civil day at _sleep start_ (#800 — a night starting 23:00 yesterday keys to
  _yesterday_), while a duration-only entry keys to the day it was _logged_ (usually
  this morning, i.e. _today_) — `src/features/sleep/repository.ts:49–55`,
  `supabase/migrations/20260811000000_sleep_window.sql:15–19`. So "last night logged?"
  must check `dayKey ∈ {yesterday, today}` (equivalently `entry_day >= yesterday`), and
  the honest phrasing is "no sleep captured since yesterday" rather than a precise
  night identity — a night identity was explicitly _not_ invented (#800/ADR-0002).
- **Weekly average source**: exists — `sleep_stats(p_time_zone).avg_duration_minutes_7`
  (server, exact) or the client `averageDurationMinutes(logs, 7)` over the capped list.
- **New aggregate needed**: none. A product decision on the night definition is the
  only gap.

### 2.2 "Two habits due"

- **Due-today count**: computable today, client-side — `dueToday.length -
dueTodayTicked` from the exact code at `habits-home-screen.tsx:88–91` (scheduling via
  cadence `daily` / `weekdays` / `customDays`, `habits/scheduling.ts:13–19`).
- There is no server-side "due" concept anywhere: schedules live on the `habits` rows
  and are evaluated client-side against the viewer-local weekday. That is fine — the
  input is one uncapped small table plus today's ticks.
- **Guardrail note**: any "due" nudge copy must stay non-punitive (AGENTS.md); the
  repo's own precedent is `isAtMissTwiceRisk` (`habits/scheduling.ts:38–56`), written
  to "never turn into shame copy".

## 3. Programme progress — CBT "4 of 12", ACT "0 of 10"

**Verdict: not honestly computable today, for either module.**

What the drawn denominators actually match: **the total number of task definitions
across all phases** — `CBT_PROGRAM` has 5 phases (`assessment`, `formulation`,
`thinking`, `behavioural`, `resilience`; `src/features/cbt/program-definition.ts:220`)
carrying exactly **12** task defs (`setGoals`, `clarifyValues`, `dailyNoticing`,
`examineBelief`, `thoughtRecordOnce`, `thoughtRecordDaily`, `activityOnce`,
`activityDaily`, `exposureLadder`, `resiliencePlan`, `calmingOnce`, `calmingDaily`);
`ACT_PROGRAM` has 4 phases (`foundation`, `bePresent`, `openUp`, `doWhatMatters`;
`src/features/act/program-definition.ts:75`) carrying exactly **10** task defs. So the
design's 12 and 10 are real numbers in the codebase — but only as _definitions_.

Why the numerator has no source:

- **Persisted programme state is five columns per module** in `user_preferences`
  (`src/features/settings/repository.ts:30–34,68–72`): `*_program_started_at`,
  `*_program_completed_at`, `*_program_prompt_dismissed_at`, `*_program_phase_index`,
  `*_program_phase_started_at`. That is the _entire_ stored state. No per-task record
  exists anywhere.
- **Task done-ness is recomputed, current phase only.** Client: `deriveCbtProgram`
  evaluates only `CBT_PROGRAM[phaseIndex]`'s tasks (`src/features/cbt/derive-cbt-program.ts:114–117`),
  each task's `signal(data)` returning `{current, target}` with `done = current >=
target` — milestone signals count records since `phase_started_at`, daily-practice
  signals are true only for the selected day. Server twin: `program_widget_task_status(p_module,
p_day_start, p_day_end, p_day_key)` (`supabase/migrations/20260803000000_program_widget_captured_days.sql:35–118`)
  returns `(task_key, done)` rows for the current phase, with captured-day bucketing
  for the four CBT daily legs.
- **Consequences**: daily tasks flip back to not-done every midnight, so any "N of M
  complete" using them is non-monotone; past phases' milestone done-ness cannot be
  reconstructed after `advancePhase` (signals are measured against
  `phase_started_at`, which is overwritten on advance — `src/features/cbt/use-cbt-program.ts:84–98`);
  and phase advancement is a _manual user action_, not a completion consequence.
- **The only honest "N of M" available today** is `phaseIndex + 1` of `totalPhases`
  ("phase 2 of 5" / "phase 1 of 4") — `derive-cbt-program.ts:77,138–139` already
  exposes both numbers — or a per-current-phase "K of L tasks done today" from the
  existing RPC.

What "4 of 12" would need to be buildable: persisted per-task completion (a
`program_task_completions`-style record written when a milestone first passes its
signal, with a decided semantic for the six daily-practice tasks — e.g. count them only
in their phase, or exclude them from the fraction). That is a schema + product-semantics
change, not an aggregate.

## 4. What the programme-widget machinery actually holds

- **Widget**: `src/features/home/widgets/program-widget.tsx` (wrapped by
  `cbt-programme-widget.tsx` / `act-programme-widget.tsx`). Three states: not enrolled
  (no `startedAt`), completed, or in-progress — in-progress shows the **current
  phase's** task list (daily practice first among undone, done sorted last, lines
  45–62), max 2 visible tasks, "+N more". **No fraction, no progress bar, no "N of M"
  is rendered anywhere in it.**
- **Status hook**: `src/features/home/program-widget-status.ts` — `currentLocalDayRange()`
  produces `{start, end, key}` (both instant bounds _and_ the civil-day key; they move
  independently under travel, which is why all three ride the query key, lines 60–66);
  the RPC call at lines 30–48. `program-widget-status.test.ts` pins exactly that
  key/bounds invariant.
- **RPC**: `program_widget_task_status` — `security invoker`, `stable`, per-task
  `exists(...)` probes scoped to the current phase read from `user_preferences`,
  offset-window-bounded scans so decrypting views are never scanned unbounded
  (`20260803000000` lines 68–89).
- **Nothing anywhere holds cumulative programme progress.** The search for "N of M"
  across the programme machinery finds only: `phaseIndex`/`totalPhases` in the derive
  views, and per-task `{current, target}` signal results (e.g. "3 of 7 days") — both
  recomputed, neither persisted.

## 5. What `routines-today`'s suppression logic computes

The closest thing the app has to a "due today" engine, and it is grid-level:

- `src/features/home/use-visible-widget-ids.ts:17–29` — drops the `routines-today`
  slot entirely (no gap, no placeholder) when the user _has_ routines but none are
  scheduled today; the zero-routines doorway still renders. Runs the routines query
  only when the user owns the widget.
- `src/features/routines/use-routines-today.ts:70–113` — the shared aggregate behind
  the widget and the FAB: for every routine, `deriveRoutine(steps, records, dayKey)`
  (client-derived day view; nothing persisted, #96) plus `scheduledToday =
isScheduledOn(routine, today)` (cadence evaluation, viewer-local). Aggregates
  `doneSteps` / `totalSteps` / `openSteps` / `allComplete` over **scheduled-today
  routines only** (#104: an open step on an off-day routine must neither show the FAB
  nor block "done for today").
- Pattern worth copying for any dashboard nudge row: "due" = cadence says today ∧ not
  done, evaluated client-side from uncapped small tables; suppression happens at the
  slot level, not inside the card; and `RoutinesWidget` renders `null` on off-days
  rather than nudging (`routines-widget.tsx:27`).

## 6. Existing server aggregates (inventory)

All are `security invoker` + `stable` + search-path-pinned, `authenticated`-only:

| Function                                                               | Returns                                                                      | Reads                                                                     | Migration                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `journal_word_total()`                                                 | lifetime word count                                                          | `journal_entries` **view** (decryption inherent — needs plaintext bodies) | `20260719`                                                |
| `journal_writing_days(tz, days)` / `journal_writing_buckets(tz, days)` | writing-day keys / per-day buckets                                           | see migrations `20260810000000/1`                                         | `20260810*`                                               |
| `meditation_median_minutes()`                                          | lifetime median sit                                                          | `meditation_sessions` (plain table)                                       | `20260728`                                                |
| `sleep_stats(p_time_zone)`                                             | 7/30-day duration+quality averages, distribution, extremes, weekday averages | `sleep_logs_data` base table                                              | `20260811000000` (base-table read since `20260808000000`) |
| `breathing_total_minutes(excluded_names)`                              | lifetime breathing minutes                                                   | `mindfulness_sessions` **view** (plain `int` column; see §7)              | `20260809010000`                                          |
| `mood_emotion_counts()`                                                | lifetime per-emotion counts                                                  | `mood_logs_data` base table                                               | `20260809000000`                                          |
| `program_widget_task_status(module, start, end, key)`                  | current-phase task done flags                                                | several views, offset-bounded scans                                       | `20260803000000`                                          |

Plus exact PostgREST head counts (zero-decrypt per #808's measurements):
`countJournalEntries`, `countGratitudeEntries`, `countMoodLogs`,
`countMeditationSessions`, `countMindfulnessSessionsByNames` /
`...ExcludingNames`, `useSleepLogCount`.

## 7. A correction to the house rule's premise (#808)

The ticket's rule says "never the decrypting views — `app.decrypt_text` is VOLATILE".
That premise is **outdated by #808's own resolution**: `app.decrypt_text` (and
`app.encryption_key`) have been `STABLE` since `20260666_audit_phase2_fixes.sql:29,43–47`
(2026-06-10), and #808/#810 _measured_ that projection pruning works — a head count on
`journal_entries` costs 0 decrypt calls, a narrow projection on `mood_logs` costs 0.
(Stale comments claiming VOLATILE survive in `20260809000000_mood_emotion_counts.sql`
and `20260811000000_sleep_window.sql:13` — migration files are changelog entries, not
current state.) Consequently `breathing_total_minutes` reading the
`mindfulness_sessions` view is _not_ paying decryption despite its own header.
**Base-table reads remain the right convention for new aggregates** — explicit,
plan-obvious, immune to future view changes — but they are belt-and-braces, not a
correctness requirement, and existing view-reading aggregates need no fixing.

## What needs building — ranked by cost

1. **Nothing** (already standing, just call the right source): Journal both stats;
   Sleep both stats (`sleep_stats`); Breathing last-session; Check-in week count +
   7-day average (reuse the tracker's `dayKey` mechanisms, not the trend widget's
   instant cut); Habits done-today and habits-due nudge (client, uncapped inputs);
   Gratitude/Grounding/Meditation _session counts_ (existing head counts).
2. **Trivial RPC** — `meditation_total_minutes()`: no args, `sum` over a plain RLS
   table.
3. **Trivial RPC** — `grounding_total_minutes(included_names text[])`: inclusion
   mirror of `breathing_total_minutes`, plain `int` column.
4. **Small RPC** — `gratitude_item_total()`: sum of non-null `item_N_enc` flags over
   `gratitude_entries_data`; zero decrypts thanks to positional NULL semantics.
5. **Product decision, no schema** — sleep-nudge night definition ("no sleep captured
   since yesterday" over `entry_day`), plus quiet/optional nudge framing per
   guardrails.
6. **Widget work, no aggregate** — a real habits row: the `habits-today` slot renders
   CBT activities; the honest "2 of 4 done today" exists only on the habits home
   screen.
7. **Schema + semantics change (largest)** — programme "N of M": needs persisted
   per-task completion and a decided treatment of daily-practice tasks, or the design
   falls back to what is honest today: "phase 2 of 5" / per-phase "K of L today" from
   `program_widget_task_status`.

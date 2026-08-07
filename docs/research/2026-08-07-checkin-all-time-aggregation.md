# All-time aggregation for the check-in redesign: client-side or a Supabase RPC?

> Research for [#693](https://github.com/Selftend/selftend/issues/693) (map [#689](https://github.com/Selftend/selftend/issues/689)), resolved 2026-08-07.
> Blocks [#700](https://github.com/Selftend/selftend/issues/700) (range controls), [#701](https://github.com/Selftend/selftend/issues/701) (distribution chart), [#702](https://github.com/Selftend/selftend/issues/702) (emotion usage counts).
> Reading exercise only — no application code changed, nothing run against a live Supabase project.

## Recommendation

**Split the three needs. Two stay client-side; one gets an RPC.**

| need                                                | verdict                           | mechanism                                                 |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| "All time" range on trend / distribution / mood map | **client-side — already shipped** | `useMoodScorePoints(userId, ALL_TIME_FROM_ISO)`           |
| Per-mood-level distribution counts                  | **client-side**                   | five-slot reduce over score points already in cache       |
| Per-emotion usage counts                            | **RPC**                           | `public.mood_emotion_counts()`, `stable security invoker` |

One new migration, one new function, no arguments, no persisted column, no change to
`export_user_data()` / `delete_user_account()`, no new index.

The single most important implementation detail: **the RPC must read
`public.mood_logs_data`, not the `public.mood_logs` view** — see §6. Every existing
aggregate RPC in the repo reads the view, and for this one that would be wrong.

---

## 1. Encryption boundary — confirmed, `mood_score` and `emotions` are plaintext

`public.mood_logs` is a `security_invoker` view over the base table
`public.mood_logs_data`, with `INSTEAD OF` triggers doing encrypt-on-write and the
view doing decrypt-on-read.

Five columns are encrypted (`bytea` ciphertext, `*_enc`):
`notes`, `situation`, `thoughts`, `behaviours`, `bodily_sensations`
(`supabase/migrations/20260589_mood_logs_encrypt.sql:11-15`, decrypted in the view at
`:44-51`, plaintext originals dropped in
`supabase/migrations/20260590_mood_logs_drop_plaintext.sql:6-10`).

Everything else is plaintext on the base table. The migration says so in its own header:

> Pass-through (plaintext, stay on the base table): id, user_id, mood_score, emotions[]
> (fixed ids, not user text), linked_strategy, logged_at, created_at.
> — `supabase/migrations/20260589_mood_logs_encrypt.sql:6-8`

Confirmed against the view body (`:39-52`) — `mood_score` and `emotions` are selected
bare, with no `app.decrypt_text()` wrapper. `logged_offset_minutes` was added later,
also plaintext, and the view was recreated to expose it
(`supabase/migrations/20260708_shared_tool_occurrence_time.sql:4-6` and `:29-38`).

Column definitions come from the original table
(`supabase/migrations/20260514_cbt_phase1.sql:64-68`):

```sql
mood_score integer not null check (mood_score between 1 and 10),
emotions   text[]  not null default array[]::text[],
logged_at  timestamptz not null default timezone('utc', now()),
```

The score range was narrowed to 1–5 in
`supabase/migrations/20260520_mood_scale_1_to_5.sql:12-16`, which is what makes a dense
five-bucket distribution well-defined.

**So yes: every column the three aggregates need is plaintext, and a server-side
aggregate never has to touch a decrypt path.** But that is a statement about the
_columns_, not automatically about the _query_ — see §6, which is the part the ticket
did not anticipate.

## 2. The precedent — what the repo already does

Three sibling aggregate RPCs, all the same shape:

| function                        | migration                                      | reads                                                       | args           |
| ------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- | -------------- |
| `journal_word_total()`          | `20260719_journal_word_total.sql:13-18`        | `public.journal_entries` (view; genuinely needs plaintext)  | none           |
| `meditation_median_minutes()`   | `20260728_meditation_median_minutes.sql:35-41` | `public.meditation_sessions` (plain table, never encrypted) | none           |
| `sleep_stats(p_time_zone text)` | `20260731100000_sleep_stats.sql:57-72`         | `public.sleep_logs` (view)                                  | IANA zone name |

The pattern, verbatim from `sleep_stats`:

```sql
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  ...
   where sleep_log.user_id = uid
```

and the grant block (`20260731100000_sleep_stats.sql:161-167`, identical in the other two):

```sql
revoke all on function public.sleep_stats(text) from public;
revoke execute on function public.sleep_stats(text) from anon;
grant execute on function public.sleep_stats(text) to authenticated;
notify pgrst, 'reload schema';
```

The `revoke ... from anon` line is not redundant: older Supabase images granted execute
to `anon` directly, where `revoke ... from public` does not reach it (noted in each
migration, tracing to `supabase/migrations/20260718_security_advisor_hardening.sql`).

**Why `security invoker` and not `definer`** — argued at length in
`20260728_meditation_median_minutes.sql:18-27`: invoker means the table's own RLS policy
is enforced against every row the aggregate touches, so _the database, not the function
body_, confines the result to one user. A definer copy would run with RLS off and leave
the hand-written `user_id = uid` filter as the only barrier, "in a function whose whole
output is a single number that would look perfectly plausible while wrong." The
`user_id = uid` filter stays as belt and braces.

**Rounding stays in TypeScript** — also argued in both migrations: SQL returns exact
`numeric`, and the client applies the same `Math.round` / `roundTo1` its row-derived
siblings used, because `round(numeric)` rounds half away from zero, `round(double
precision)` ties to even, and `Math.round` breaks ties upward. (Not load-bearing for
integer counts, but the rule is the rule.)

**Client call sites** (`grep -rn "\.rpc(" src/` — eight total, three of them aggregates):

- `src/features/sleep/repository.ts:97-102` — `.rpc("sleep_stats", { p_time_zone: timeZone }).maybeSingle<SleepStatsRow>()`
- `src/features/meditation/repository.ts:148-149` — `.rpc("meditation_median_minutes")`
- `src/features/journal/repository.ts:78-83` — `.rpc("journal_word_total")`, with `Number(data ?? 0)` because "PostgREST serialises bigint as a JSON number, but coerce defensively"

None pass a user id: "the RPC scopes itself to `auth.uid()` under the caller's own RLS,
so it takes no user id" (`src/features/sleep/repository.ts:80-81`).

**The governing rule already exists.** `docs/adr/0001-row-derived-vs-server-aggregated-stats.md`
(accepted 2026-07-28, from #335) says a stat may be row-derived only inside a window the
row cap provably covers under a stated bound; **"anything whose window is user-visible as
'all time'" must be server-aggregated** (`:38-40`). It also carves out two things this
research leans on:

- **Exact filtered counts need no function** (`:42-48`) — a PostgREST `head` count is
  already an exact server-side answer under RLS. `countMoodLogs` is already this.
- **"Everything beyond a count — sums, averages, medians, buckets, extremes — is a SQL
  function"** (`:50-51`), and **"a hybrid is the normal shape, not a compromise"**
  (`:79-82`): the RPC carries the aggregates while charts that genuinely need rows keep
  reading the row query.

## 3. The current data path and its ceiling

### The score-points query is _already_ uncapped

`listMoodScorePoints` (`src/features/mood/repository.ts:150-181`) is a three-column
select (`logged_at, logged_offset_minutes, mood_score`) that **pages until exhaustion**:

```ts
const SCORE_POINTS_PAGE = 1000;                       // repository.ts:131
for (let offset = 0; ; offset += SCORE_POINTS_PAGE) { // :157
  ...
  if (rows.length < SCORE_POINTS_PAGE) return points; // :179
}
```

The page size matches Supabase's default response cap: "By default, Supabase projects
return a maximum of 1,000 rows. This setting can be changed in your project's API
settings."
([Supabase Python API reference, `select`](https://supabase.com/docs/reference/python/select), checked 2026-08-07).
PostgREST's own `db-max-rows` default is unlimited
([PostgREST v12 configuration](https://docs.postgrest.org/en/v12/references/configuration.html), checked 2026-08-07);
the 1,000 is Supabase's platform setting on top of it, which is why the comment at
`repository.ts:129-130` describes it as "Supabase's default max-rows".

### Volume for the ticket's scenario

Two check-ins a day for two years = **1,460 rows**.

| tenure @ 2/day | rows  | round trips @ 1000/page | score-points payload |
| -------------- | ----- | ----------------------- | -------------------- |
| 1 year         | 730   | 1                       | ~67 KB               |
| 2 years        | 1,460 | 2                       | ~134 KB              |
| 5 years        | 3,650 | 4                       | ~336 KB              |
| 10 years       | 7,300 | 8                       | ~672 KB              |

Payload arithmetic: one row of the score-points projection serialises as

```json
{ "logged_at": "2026-08-07T14:23:11.123456+00:00", "logged_offset_minutes": 180, "mood_score": 4 }
```

= 91 bytes plus a separating comma ≈ **92 bytes/row** uncompressed. The response is
served gzip/br and this text is extremely repetitive, so the wire cost is roughly an
order of magnitude lower; the ~134 KB is what gets decoded, and ~1,460 JS objects is
what sits in the TanStack cache after `mapMoodLog`-style construction (each row also
builds two `Date`s and an `toISOString()` inside `entryDayKey`, `repository.ts:175`).

**Paging edge case worth knowing:** the loop only terminates on a _short_ page
(`repository.ts:179`), so a user whose count is an exact multiple of 1,000 pays one
extra empty round trip (2,000 rows ⇒ 3 requests).

**The ±840-minute window padding does nothing to All-time paging.** `WINDOW_PAD_MS` is a
fixed ±24 h applied to the _bounds_ (`repository.ts:139-143`, `:162-163`). For All time
the lower bound is the epoch and there is no upper bound at all
(`mood-heatmap.tsx:16`), so the pad is inert. It only matters on a bounded custom range,
where it drags in at most two extra days of rows (≤ 4 rows at 2/day) — and those fall
outside the explicit day-key walk in `buildMoodChartDataForRange`
(`src/features/mood/chart-data.ts:70-79`) and are discarded.

### How wrong the 200-row cache already is

`useMoodHistory` (`src/features/mood/queries.ts:41-49`) fetches
`listMoodLogs(userId, 200)` — a `select("*")` including all five _decrypted_ text
columns — and every screen narrows it with `select`. Coverage in days:

| logging rate | days covered by 200 rows |
| ------------ | ------------------------ |
| 1/day        | 200                      |
| 2/day        | **100**                  |
| 3/day        | 66                       |

Auditing each consumer against ADR-0001:

- **Safe under an assumed bound.** `getMoodSummary(logs, 7)`, `getWeekDelta` (14 days),
  `getDailyAverages(logs, 7)` — 14 days needs ≤ 200 rows unless the user logs more than
  ~14 times a day. This is exactly the "assumed bound" the ADR permits (`:24-36`).
- **Not affected.** `getDayMoodSummary(logs, selectedDate)` — `useSelectedDate` returns
  today unconditionally (`src/stores/selected-date-store.ts:28-30`), so it never asks
  about a day outside the cache. (Week navigation in #689 would change this: a week
  strip that pages backwards past ~100 days would start reading empty days for a 2/day
  user. Worth flagging on that ticket.)
- **Already wrong today.** `getTopEmotions(moodLogs, 3)`
  (`src/features/mood/mood-tracker-screen.tsx:90` → `src/features/mood/summaries.ts:141-152`)
  takes **no window at all** — it counts emotions across whatever the cache holds. It
  renders under `week.feltMost` = "Felt most often" inside a section headed
  `week.title` = "This week" (`src/i18n/locales/en/mood.json`, `week` block;
  `src/features/mood/mood-week-hero.tsx:121-131`). For a twice-daily user that label sits
  over a figure computed across roughly the last **100 days**, and it silently changes
  meaning as the user's logging rate changes. This is not a future risk the redesign
  introduces; it is a live instance of the exact defect class ADR-0001 was written for.

So the ticket's "emotion counts would be badly wrong" is right, and understated: they
are already badly wrong, and mislabelled.

## 4. Need by need

### 4a. "All time" range — client-side, and it already ships

**This contradicts the ticket's framing.** All time is not new. The mood map has been
pinned to it since it was built:

```ts
// All time, literally: a fixed epoch keeps the query key stable while the
// paged score-points fetch spans the user's whole history.
const ALL_TIME_FROM_ISO = "1970-01-01T00:00:00.000Z";
// src/features/mood/mood-heatmap.tsx:14-16
...
const { data: scorePoints } = useMoodScorePoints(userId, ALL_TIME_FROM_ISO);
// :30
```

#700 notes the same thing from the design side ("The heatmap has no control at all:
`mood-heatmap.tsx:16` pins it to `ALL_TIME_FROM_ISO`"). So the mechanism exists, is
shipped, and is already paying the All-time cost on every visit to the tracker screen.

Adding an "All time" segment to the trend and distribution controls is
`fromIso = ALL_TIME_FROM_ISO, toIso = undefined` — the _same query key_
(`moodKeys.scorePoints(userId, fromIso, toIso)`, `queries.ts:22-23`), so all three
sections share one cache entry and one fetch rather than three.

This does not violate ADR-0001. The ADR's rule is about stats derived over a **capped**
list query; `listMoodScorePoints` has no cap — it pages to exhaustion by construction.
The ADR's own escape hatch says as much: charts that genuinely need rows keep reading
the row query (`:79-82`).

The honest cost statement for #700: **~134 KB decoded and 2 round trips at two years of
twice-daily logging, growing linearly.** That is acceptable for a chart. It stops being
acceptable somewhere around the 5–10 year mark, and the mitigation then is a
day-bucketed RPC (one row per civil day rather than per entry, ~730 rows for two years
instead of 1,460) — but that is a future optimisation with a clear trigger, not a
now-decision, and it would need the full `p_time_zone` day-key machinery of §5.

### 4b. Distribution buckets — client-side, and explicitly _not_ an RPC

`mood_score` is already one of the three columns `listMoodScorePoints` fetches. A
five-bucket distribution over the selected range is a reduce over an array the client
already holds — zero extra network, zero extra rows, and it composes with whatever range
the section's control is on.

Writing a `mood_distribution(p_from, p_to, p_time_zone)` RPC would mean a migration, a
parity test, `p_time_zone` plumbing, and a _second_ network round trip, in order to
compute five integers from data already in memory. Do not do it.

Shape (mirroring `qualityDistribution` in the sleep tracker and the dense-array
convention of `sleep_stats:136-142` — always five slots, out-of-range scores dropped):

```ts
export function getScoreDistribution(
  points: { dayKey: string; moodScore: number }[] | undefined,
  startKey: string,
  endKey: string,
): [number, number, number, number, number];
```

Filter on `dayKey` in the key range, exactly as `scoresInKeyRange`
(`summaries.ts:22-26`) already does, so the distribution counts the same entries the
line chart above it draws. Bucketing on `dayKey` rather than `loggedAt` is mandatory —
see `summaries.ts:10-16`.

Note for #701: the distribution counts **check-ins**, not days, whereas the trend line
plots **daily averages** (`chart-data.ts:67-79`). Two check-ins on one day contribute two
distribution segments but one chart point. That is defensible but must be stated in the
copy, or the two charts will look like they disagree.

### 4c. Per-emotion usage counts — this one wants the server

Four reasons, in order of weight:

1. **The output size is bounded; the input is not.** There are 22 built-in emotions
   (`src/constants/emotions.ts:9-32`) plus the user's custom ones — call it 20–40. The
   answer is ~30 integers regardless of whether the user has 50 check-ins or 5,000. Every
   other candidate aggregate returns something proportional to the range being drawn.
2. **`emotions` is net-new on the wire.** It is not in the score-points projection. A row
   with three tagged emotions adds ~50 bytes:
   `{"emotions":["anxious","overwhelmed","frustrated"]}` ≈ 49 bytes. At 1,460 rows that
   is **~207 KB and 2 round trips** for the client-side route, versus **~0.7 KB and 1
   round trip** for the RPC. The gap widens linearly with tenure while the answer stays
   the same size.
3. **The consumer is a settings surface.** The counts render in the manage-emotions modal
   (`src/features/mood/manage-emotions-modal.tsx` — which today has no counts at all).
   Downloading a user's entire check-in history to render "used 12×" beside a row of
   emoji is disproportionate.
4. **ADR-0001 names it.** "Anything whose window is user-visible as 'all time' is
   server-aggregated" (`:38-40`), and counts-per-group is in the enumerated list of
   things that must be a SQL function (`:50-51`). A lifetime _row_ count would be a head
   count and need no function; this is a grouped count over an unnested array, which
   PostgREST cannot express — its aggregate syntax is disabled by default on Supabase
   (§7).

**Proposed signature and body:**

```sql
create or replace function public.mood_emotion_counts()
returns table (emotion_id text, uses bigint)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select emotion.id, count(*)::bigint
    -- mood_logs_data, NOT the mood_logs view: see the volatility note in the
    -- migration header. `emotions` and `user_id` are plaintext columns on the
    -- base table, and its RLS policies are what confine this to one user.
    from public.mood_logs_data as mood_log
    cross join lateral unnest(mood_log.emotions) as emotion(id)
   where mood_log.user_id = uid
   group by emotion.id;
end;
$$;

revoke all on function public.mood_emotion_counts() from public;
revoke execute on function public.mood_emotion_counts() from anon;
grant execute on function public.mood_emotion_counts() to authenticated;
notify pgrst, 'reload schema';
```

Design notes:

- **No `p_time_zone`.** The count is lifetime and never bucketed by civil day, so none
  of §5 applies. It is the only member of this family that structurally cannot get the
  day key wrong. That is an argument for keeping it lifetime-only — which also matches
  the design's `used 12×` / `unused` framing (#702).
- **Zero-use emotions do not come back.** An inner `unnest` drops rows with empty arrays
  and never invents a group for an emotion nobody tagged. That is correct: the client
  already holds the user's emotion list via `useEmotionDisplay`
  (`src/features/mood/use-emotion-display.ts`), so `unused` is _list minus map_, computed
  on the client with no extra query.
- **Do not join `emotion_preferences` in SQL.** Its `name` column has been encrypted
  since `20260657_emotion_preferences_encrypt.sql`, so a join would pull a decrypting
  view into the plan for no benefit; and `mood_logs.emotions` can hold ids with no
  preference row at all (custom and legacy ids —
  `src/features/mood/use-emotion-display.ts:44-59` already handles both).
- **Sorting stays on the client**, so it can order by the user's saved `position` and
  break ties the way `getTopEmotions` does (`summaries.ts:148-151`).
- **Coerce `bigint` defensively** in the repository (`Number(row.uses ?? 0)`), following
  `src/features/journal/repository.ts:82`.
- **Query key under the `mood` root** — `["mood", "emotionCounts", userId]` — so the
  existing `invalidateQueries({ queryKey: moodKeys.all })` in `useSaveMoodLog`
  (`queries.ts:103`) and `useDeleteMoodLog` already reach it. ADR-0001 `:91-93` requires
  this ("the stats query lives under the same feature query-key root as the list it
  summarizes"); `useSleepStats` is the precedent.
- **Parity test obligatory** — ADR-0001 `:71-77`. New file
  `test/integration/mood-emotion-counts.integration.test.ts`, matching
  `sleep-stats.integration.test.ts`, `journal-word-total.integration.test.ts` and
  `meditation-median-minutes.integration.test.ts`. It must pin the SQL against
  `getTopEmotions`-equivalent JS on seeded rows, including the empty-array and
  duplicate-id-within-one-entry cases.

**The runner-up, and why it loses.** Since the mood map already fetches all-time score
points, `emotions` could simply be added to that projection — the counts would then cost
one extra column on a query that already runs. It is cheaper to build (no migration, no
parity test). It loses because it couples a settings modal to the tracker screen's query;
it makes the _chart_ query carry a column the chart never uses, on the one query that
refetches every time a range control moves (three controls per #700); and it grows the
wire cost of every trend render with how heavily the user tags emotions. If #702 ever
decides the count should be _windowed_ rather than lifetime, this route also stops being
viable, because a window has to be expressed in civil days (§5) and that is server work.

### 4d. First/last day — no RPC needed

`getFirstMoodDayKey` (`repository.ts:194-232`) already resolves the earliest _civil_ day
correctly, including the subtlety that the earliest UTC instant is not necessarily the
earliest civil day: it scans forward by `OFFSET_SPAN_MS = 2 × 840 min` because two rows
can sit 28 h apart in UTC and share a day, and a later instant can belong to an earlier
day (`:188-192`, `:210-214`). It costs two small round trips. Leave it.

The _last_ day for a resolved span label ("Jan 3, 2025 – Aug 7, 2026", requested by #700)
is `dayRangeEndKey` over the score points already in cache
(`src/utils/date.ts:106-112`) — no server work. So there is no `mood_day_bounds()` RPC.

### 4e. Why not one combined RPC

Different arity and different cache lifetime. Under #700 the distribution's range is
independent per section, while emotion counts are lifetime and range-independent. A
combined `mood_stats(p_from, p_to, p_time_zone)` would recompute and refetch the emotion
counts every time any of the three range controls moved — the counts would be
invalidated by a range change they do not depend on. Keep them separate: separate query
keys, separate calls, separate invalidation.

## 5. Day-key correctness in SQL

Not needed for the recommended RPC (it is lifetime and unbucketed), but recorded here
because any future windowed mood aggregate must get it right, and it is the part most
likely to be got wrong.

The rule (`src/features/mood/summaries.ts:10-16`):

> Every aggregation here groups on `dayKey` — the civil day captured when the entry was
> logged, resolved once in the repository — never on `loggedAt`.

`entryDayKey` (`src/lib/occurrence-time.ts:70-78`) shifts the instant by the _captured_
offset and truncates; when the offset is `null` it falls back to `localDateKey(date)` —
the **viewer's** local day, not UTC. `null` means "not captured", never "UTC"
(`src/lib/occurrence-time.ts:9-14`), a distinction
`supabase/migrations/20260726_occurrence_offset_nullable.sql:1-15` was written to create:
the column was `not null default 0`, so every legacy row "claimed UTC", and the migration
deliberately cleared **every** stored `0` (`:44-45`) so that from then on a `0` only ever
means a client explicitly sent it.

**Therefore `coalesce(logged_offset_minutes, 0)` in SQL is the bug**, not the fix — it
re-creates precisely what `20260726` spent a migration removing.

The correct expression is already written, in `sleep_stats`
(`supabase/migrations/20260731100000_sleep_stats.sql:98-105`):

```sql
case
  when sleep_log.logged_offset_minutes is null
    then (sleep_log.logged_at at time zone p_time_zone)::date
  else (
    (sleep_log.logged_at at time zone 'UTC')
      + make_interval(mins => sleep_log.logged_offset_minutes)
  )::date
end as civil_day
```

- The `else` branch mirrors `dateKeyAtOffset` (`occurrence-time.ts:47-51`): `logged_at`
  is `timestamptz`, so `at time zone 'UTC'` yields the UTC wall clock as a plain
  `timestamp`, adding the captured offset gives the civil wall clock, and `::date`
  truncates.
- The `is null` branch mirrors `localDateKey` (`src/utils/date.ts:8-10`) — the viewer's
  local day. **The server cannot know this on its own**; it needs the viewer's frame.
- And the window's end day mirrors `dayRangeEndKey` (`src/utils/date.ts:106-112`) as
  `greatest(max(civil_day), (now() at time zone p_time_zone)::date)`
  (`20260731100000_sleep_stats.sql:113`), so an entry logged east of the viewer is not
  clipped off the right edge.

**It must be an IANA zone name, not a numeric offset.** `sleep_stats:53-56` states why:
Postgres resolves a zone name against the tz database _at each row's own instant_, so a
row logged on the other side of a DST boundary buckets correctly; a single fixed offset
misbuckets it. The client supplies it from `deviceTimeZone()`
(`src/utils/date.ts:23-28`), which returns `Intl.DateTimeFormat().resolvedOptions().timeZone`
and falls back to `"UTC"`. Nothing about the zone is stored — it is an argument, used and
discarded. ADR-0001 `:60-65` codifies this.

## 6. The trap: reading the view would decrypt every row

The ticket assumed that because `mood_score` and `emotions` are plaintext, "an aggregate
can run server-side without touching any decrypt path." **The columns are plaintext; the
default query shape is not free.**

`app.decrypt_text` is declared with **no volatility marker**
(`supabase/migrations/20260586_app_crypto_helpers.sql:36-44`):

```sql
create or replace function app.decrypt_text(ciphertext bytea)
returns text
language sql
security definer
set search_path = pg_catalog, public, extensions
as $$ ... pgp_sym_decrypt(ciphertext, app.encryption_key()) ... $$;
```

PostgreSQL: "If none of these appear, `VOLATILE` is the default assumption."
([CREATE FUNCTION, PostgreSQL 17](https://www.postgresql.org/docs/17/sql-createfunction.html), checked 2026-08-07).
So all five `app.decrypt_text(...)` entries in the `public.mood_logs` view's targetlist
are volatile — and the planner has two guards that both refuse to optimise volatile
targetlist entries away:

1. **The view is not flattened into the query.** `is_simple_subquery()` in
   `src/backend/optimizer/prep/prepjointree.c` (PostgreSQL `REL_17_STABLE`, read
   2026-08-07):

   > Don't pull up a subquery that has any volatile functions in its targetlist.
   > Otherwise we might introduce multiple evaluations of these functions, if they get
   > copied to multiple places in the upper query, leading to surprising results.

   followed by `if (contain_volatile_functions((Node *) subquery->targetList)) return false;`

2. **The unused output columns are not pruned either.** The
   `remove_unused_subquery_outputs()` optimisation exists exactly to blank unreferenced
   view outputs — added by commit `55d5b3c0`, "Remove unnecessary output expressions from
   unflattened subqueries", which notes the problem "is especially common when expanding
   views"
   ([commit message](https://www.postgresql.org/message-id/E1Wv8Yu-0002lj-K0%40gemulon.postgresql.org),
   checked 2026-08-07). But it declines on volatility, in
   `src/backend/optimizer/path/allpaths.c` (`REL_17_STABLE`, read 2026-08-07):

   ```c
   /*
    * If it contains volatile functions, we daren't remove it for fear
    * that the user is expecting their side-effects to happen.
    */
   if (contain_volatile_functions(texpr))
       continue;
   ```

   and the function's own header comment says the same: "we can remove any such outputs
   that are not needed by the subquery itself ... and do not affect semantics otherwise
   (e.g., volatile functions can't be removed)."

**Consequence.** `select emotions from public.mood_logs where user_id = uid` decrypts
`notes`, `situation`, `thoughts`, `behaviours` and `bodily_sensations` for **every scanned
row**, even though none is projected. Each `app.decrypt_text` call additionally invokes
`app.encryption_key()` (`20260586:13-21`), which reads `vault.decrypted_secrets` — itself
a decrypting view. At 1,460 rows that is **7,300 `pgp_sym_decrypt` calls and 7,300 Vault
key reads** to produce ~30 integers.

`pgp_sym_decrypt` is deliberately expensive (iterated-and-salted key derivation), so this
is plausibly seconds rather than milliseconds — _estimate, not measured_, since this
research ran against migration files only. The point does not depend on the exact figure:
the work is entirely avoidable.

**The fix is one word: read `public.mood_logs_data`.** This is safe and introduces no new
exposure:

- RLS is enabled on the base table (`20260589_mood_logs_encrypt.sql:28`) and all four
  policies were moved onto it, rewritten to the `initplan` form
  (`supabase/migrations/20260667_audit_rls_initplan.sql:93-96`):
  `alter policy mood_logs_select_own on public.mood_logs_data using (((select auth.uid()) = user_id));`
- `authenticated` already holds `select` on it — the grant is explicit and blanket
  (`supabase/migrations/20260670_grant_role_privileges.sql:20-21`), and that migration
  exists precisely because "the security_invoker decrypt views require the INVOKING role
  to hold privileges on the underlying `*_data` base tables" (`:7-9`).
- `mood_logs_data` lives in `public`, so it is already reachable by PostgREST today. The
  RPC touches nothing new. The ciphertext columns are simply never selected — and are
  useless without the key, which lives in Vault behind `SECURITY DEFINER` helpers in the
  `app` schema that must never be exposed to the API (`20260586:4-8`).

**This departs from ADR-0001's letter.** The ADR says "a `stable`, `security invoker` SQL
function **over the decrypting view**" (`:53`). That wording was written when the only
examples were `journal_word_total` (which genuinely needs plaintext) and `sleep_stats`
(which does not, and pays for it). The clause should be amended to: _over the decrypting
view when the aggregate needs plaintext; over the `*_data` base table otherwise._

**Pre-existing observation, out of scope here:** `sleep_stats` reads `public.sleep_logs`
and therefore decrypts one `notes` column per sleep-log row on every call, for nothing.
The blast radius is small (sleep-log volumes are low) but it is the same waste. Two
possible follow-ups, both separate tickets: point `sleep_stats` at `sleep_logs_data`, or
mark `app.decrypt_text` `stable` — the latter would let the planner prune across all ~30
decrypting views at once, but it touches a shared security-sensitive helper and needs its
own review.

## 7. Why PostgREST cannot do this without a function

Worth recording so nobody proposes `select=emotions.count()`. PostgREST's aggregate
functions are **off by default**:

> we have **disabled** aggregate functions by default
>
> Aggregate functions can operate across an effectively limitless number of rows, whereas
> other parts of PostgREST — thanks to pagination — can be limited to operate only across
> a certain number of rows.
>
> — [Supabase, "PostgREST Aggregate Functions"](https://supabase.com/blog/postgrest-aggregate-functions), checked 2026-08-07

Matching PostgREST's own default: `db-aggregates-enabled` defaults to `false`
([PostgREST v12 configuration](https://docs.postgrest.org/en/v12/references/configuration.html), checked 2026-08-07).
Enabling it requires
`ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true'; NOTIFY pgrst, 'reload config';`
and there is no trace of that anywhere in this repo (`grep -rn "db_aggregates_enabled\|db-aggregates"` — no hits in
migrations, `supabase/config.toml`, or docs). Nor should there be: turning it on to avoid
one migration would open every table in `public` to unbounded client-driven aggregation.

`countMoodLogs` (`repository.ts:234-243`) is unaffected — a `head` count is a PostgREST
`Prefer: count=exact` response header, not an aggregate function, and ADR-0001 `:42-48`
already blesses it as the right answer for exact counts.

## 8. Privacy and GDPR

**No cross-user leak.** `security invoker` means the function runs as the calling role,
so `mood_logs_select_own` on `mood_logs_data` (`20260667_audit_rls_initplan.sql:95`) is
enforced against every row the aggregate touches — the database confines the result, not
the function body. The `user_id = uid` filter is belt and braces on top, and an
unauthenticated caller is rejected outright rather than silently aggregating zero rows,
following `meditation_median_minutes:44-47`. The grant block keeps `anon` out explicitly.

**`export_user_data()` needs no change.** Nothing is persisted — the counts are derived
per call. And `export_user_data` already exports every `mood_logs` row in full, including
`emotions` and `logged_offset_minutes`
(`supabase/migrations/20260802000000_export_user_data_missing_columns.sql:233`), so a
derived count over already-exported data adds nothing exportable. The completeness gate
(`test/integration/export-user-data-completeness.integration.test.ts`) diffs the live
schema for tables; a function creates none, so it does not trip.

**`delete_user_account()` needs no change.** No new table, no new column, nothing to
cascade. The counts vanish with the rows they are derived from.

**Data minimisation.** The RPC is strictly _less_ revealing than the client-side
alternative: it returns ~30 integers instead of shipping the user's entire tagged-emotion
history to the device on every visit to a settings modal.

**Product guardrail, for #702 rather than this ticket.** Usage counts on emotions are one
framing away from implying a user should be feeling things more evenly. Keep the copy
descriptive (`used 12×`, `unused`), never comparative or evaluative, and never rank
emotions against each other. AGENTS.md's retention and safety guardrails bind here.

## 9. Indexes

`mood_logs_user_logged_idx on (user_id, logged_at desc)` was created in
`supabase/migrations/20260567_perf_indexes.sql:11-12`, when `mood_logs` was still a table.
`alter table public.mood_logs rename to mood_logs_data`
(`20260589_mood_logs_encrypt.sql:27`) carries indexes with the table but **does not rename
them**, so the index now lives on `mood_logs_data` under its original name. It has not
been dropped or recreated since (`grep -rn "mood_logs_user_logged_idx" supabase/migrations/`
— one hit, the creation).

**It serves the proposed aggregate as-is, and nothing new is wanted:**

- `mood_emotion_counts()` filters `where user_id = uid` with no ordering and no range.
  `user_id` is the index's leading column, so a user's whole history is one contiguous
  index range; the planner takes an index or bitmap-heap scan. The trailing
  `logged_at desc` is dead weight for this query but harmless.
- **Do not add a GIN index on `emotions`.** GIN accelerates containment predicates
  (`emotions @> '{anxious}'`), not a full `unnest`-and-group over every one of the user's
  rows. It would cost write amplification on every check-in and buy nothing.
- The client-side distribution and All-time trend ride `listMoodScorePoints`, which is
  `.eq(user_id).gte(logged_at).order(logged_at asc)` — the same index, used as intended
  (it is literally what `20260567`'s header says it was added for).

## 10. What contradicted the ticket's assumptions

1. **"All time" is not new.** `mood-heatmap.tsx:14-16,30` already fetches literally all
   time via the paged score-points query, and has shipped that way. The decision for #700
   is whether to _expose a control_ for it on two more sections, not whether it is
   affordable.
2. **The distribution needs no new data at all.** `mood_score` is already in the
   score-points projection, so "counts per mood level across the selected range" is a
   client-side reduce over the cache. Only _one_ of the ticket's three needs is actually
   a data-access question.
3. **The emotion counts are not a future risk — they are a live bug.**
   `getTopEmotions(moodLogs, 3)` (`mood-tracker-screen.tsx:90`) applies no window at all
   and renders under a "This week" heading (`src/i18n/locales/en/mood.json`, `week.title`
   / `week.feltMost`). Today's "Felt most often" is really "most often across the last
   100–200 check-ins", and it changes meaning with the user's logging rate. Whoever picks
   up #702 should fix or re-scope it, not just add the new counts beside it.
4. **"Aggregate without decrypting anything" is true of the columns, false of the
   default query shape.** Reading through `public.mood_logs` decrypts all five encrypted
   columns per row regardless of projection, because `app.decrypt_text` is VOLATILE (§6).
   The RPC must read `mood_logs_data`. This also means ADR-0001's "over the decrypting
   view" clause is too strong and wants amending.
5. **The ±840-minute padding does nothing to All-time paging.** `WINDOW_PAD_MS` applies
   to bounds; All time has an epoch lower bound and no upper bound
   (`repository.ts:139-143,162-163`). It only costs ≤ 2 extra days of rows on a bounded
   custom range, which the day-key walk discards anyway.

## Sources

Primary sources outside the repo (all checked 2026-08-07):

- [PostgreSQL 17, CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html) — "If none of these appear, `VOLATILE` is the default assumption."
- PostgreSQL `REL_17_STABLE`, `src/backend/optimizer/prep/prepjointree.c`, `is_simple_subquery()` — refuses subquery pull-up when the targetlist contains volatile functions.
- PostgreSQL `REL_17_STABLE`, `src/backend/optimizer/path/allpaths.c`, `remove_unused_subquery_outputs()` — "If it contains volatile functions, we daren't remove it".
- [PostgreSQL commit 55d5b3c0](https://www.postgresql.org/message-id/E1Wv8Yu-0002lj-K0%40gemulon.postgresql.org) — "Remove unnecessary output expressions from unflattened subqueries."
- [PostgREST v12 configuration](https://docs.postgrest.org/en/v12/references/configuration.html) — `db-max-rows` defaults to unlimited; `db-aggregates-enabled` defaults to `false`.
- [Supabase, PostgREST Aggregate Functions](https://supabase.com/blog/postgrest-aggregate-functions) — aggregates disabled by default; enabling requires `ALTER ROLE authenticator SET pgrst.db_aggregates_enabled`.
- [Supabase Python API reference, `select`](https://supabase.com/docs/reference/python/select) — "By default, Supabase projects return a maximum of 1,000 rows."

In-repo primary sources: `supabase/migrations/{20260514_cbt_phase1, 20260520_mood_scale_1_to_5, 20260565_emotion_preferences, 20260567_perf_indexes, 20260586_app_crypto_helpers, 20260589_mood_logs_encrypt, 20260590_mood_logs_drop_plaintext, 20260667_audit_rls_initplan, 20260670_grant_role_privileges, 20260708_shared_tool_occurrence_time, 20260719_journal_word_total, 20260726_occurrence_offset_nullable, 20260728_meditation_median_minutes, 20260731100000_sleep_stats, 20260802000000_export_user_data_missing_columns}.sql`;
`src/features/mood/{repository,queries,summaries,chart-data,mood-heatmap,mood-tracker-screen,mood-week-hero,use-emotion-display}.ts(x)`;
`src/lib/occurrence-time.ts`; `src/utils/date.ts`; `src/stores/selected-date-store.ts`;
`src/constants/emotions.ts`; `src/features/{sleep,meditation,journal}/repository.ts`;
`docs/adr/0001-row-derived-vs-server-aggregated-stats.md`.

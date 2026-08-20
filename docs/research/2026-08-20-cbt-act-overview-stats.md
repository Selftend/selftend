# What the new CBT/ACT overview stats mean, and how each is computed

Date: 2026-08-20 · Ticket: #1220 (map #1215) · Status: research, no code changed

Answers, per stat drawn in the `11a` / `12a` / `11c` redesign: which table and column
backs it, whether that column is plaintext or ciphertext, over what window, whether the
screen can compute it from rows it already fetches, and whether it needs a new server
aggregate.

## Headline

Three findings dominate everything below.

1. **"Belief drops N points" has no data behind it. At all.** `beliefRating` is captured
   **once** per negative automatic thought, in the `nats` wizard step. The wizard is
   `situation → nats → hotThought → emotions → evidence → distortions → balancedThought →
outcome` (`src/features/cbt/thought-record-steps.ts`), and the `outcome` step captures
   `emotionIntensityAfter` + `outcomeNotes` only. There is no second belief rating, so
   there is no _drop_ to average — this is not an encryption problem, it is a missing
   field. Both stat 2 and stat 8 are impossible as drawn.
2. **The rescue for both is `emotion_intensity_before` / `emotion_intensity_after`** —
   0-100 integers, **plaintext** on `thought_records_data`, and already differenced on the
   record detail screen (`thought-record-detail-screen.tsx:113-116`, `intensityShift`).
   A "points lighter" stat re-read as emotion intensity is free per-record and cheap in
   aggregate. This is a copy/product decision the spec must make explicitly.
3. **Nothing else needs an RPC.** Every remaining stat is either an exact PostgREST `head`
   count (which ADR-0001 says needs no function) or a client-side reduction over a window
   the existing row cap provably covers. The one stat that _could_ justify an RPC —
   per-distortion counts — has a perfect precedent in `mood_emotion_counts()` and is
   described at the end, but the client-side route is defensible.

## Per-stat table

| #   | Stat as drawn                                                        | Table                                                | Column(s)                                                                         | Plain / cipher                                                                         | Window                                                                           | Client-side possible?                                                                  | New RPC?                                                     |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | "N thought records / this month"                                     | `thought_records` (view over `thought_records_data`) | `id` count, filtered `user_id`, `archived_at is null`, `created_at >= monthStart` | plaintext (nothing decrypts)                                                           | civil month                                                                      | **Already built**: `countThoughtRecordsSince()` + `useThoughtRecordCountSince()`       | No — exact `head` count                                      |
| 2   | "−31 points / belief drops points on average"                        | —                                                    | `nats → [].beliefRating`                                                          | **ciphertext** (`nats_enc bytea`), and only ONE rating exists                          | —                                                                                | **No**                                                                                 | **Impossible as drawn.** See §2                              |
| 2′  | same, re-read as _emotion intensity_                                 | `thought_records`                                    | `emotion_intensity_before`, `emotion_intensity_after`                             | **plaintext** on the base table                                                        | this month → client OK; lifetime → RPC                                           | Yes for "this month" (see §2)                                                          | Only if the window is lifetime/unbounded                     |
| 3   | Insights: per-distortion counts (Mind reading 5, …)                  | `thought_records`                                    | `distortions text[]`                                                              | **plaintext** (explicit pass-through in `20260591`)                                    | design says "this month"; **code today is lifetime, top-3, gated at ≥5 records** | Yes, over the existing 500-row list (bound argument in §3)                             | Optional — `mood_emotion_counts()` shape fits exactly        |
| 4   | "Mind reading is the pattern you catch most — five times this month" | same as 3                                            | same as 3                                                                         | plaintext                                                                              | this month                                                                       | Yes (it is stat 3's top row)                                                           | Same answer as 3                                             |
| 5   | ACT "choice points mapped"                                           | `act_choice_points`                                  | `id` count on `user_id`                                                           | plaintext (`hooks`/`away_moves`/`toward_moves`/`notes` are all encrypted, none needed) | lifetime (assumed)                                                               | **Not safely** — see the cache trap in §5                                              | No RPC, but **needs a new `countChoicePoints()` head count** |
| 6   | ACT "thoughts unhooked"                                              | `act_defusion_logs`                                  | `id` count on `user_id`                                                           | plaintext (`fused_thought`/`defused_version`/`notes` encrypted, none needed)           | lifetime (assumed)                                                               | **No** — home fetches only 50 rows                                                     | No RPC, but **needs a new `countDefusionLogs()` head count** |
| 7   | ACT "committed action"                                               | `act_committed_actions`                              | `id` count on `user_id` + `status`                                                | `status` **plaintext**; `title`/`description`/`obstacles` encrypted                    | active (assumed)                                                                 | **Already built**: `countCommittedActions()` + `useCommittedActionCount()`             | No                                                           |
| 8   | "45 points lighter by the end of writing it down" (per record)       | `thought_records`                                    | `emotion_intensity_before` − `emotion_intensity_after`                            | **plaintext**                                                                          | this record                                                                      | **Yes, already computed** — `intensityShift` at `thought-record-detail-screen.tsx:113` | No                                                           |

Encryption reference: `supabase/migrations/20260591_thought_records_encrypt.sql`,
`20260637_act_defusion_logs_encrypt.sql`, `20260649_act_committed_actions_encrypt.sql`,
`20260653_act_choice_points_encrypt.sql`.

## 1. "N thought records this month"

`countThoughtRecordsSince(userId, sinceIso)` (`src/features/cbt/repository.ts`) and its hook
`useThoughtRecordCountSince` already exist and are used by the Progress screen's 30-day stat.
An exact `select("id", { count: "exact", head: true })` with `archived_at is null` and
`created_at >= since`.

It is also **index-backed**: `thought_records_user_created_idx` on
`thought_records_data (user_id, created_at desc) include (created_offset_minutes) where
archived_at is null` (`20260814000000_home_recency_indexes.sql`) matches the predicate
exactly, so this plans as an Index Only Scan and never touches the ciphertext heap —
zero `app.decrypt_text` calls, per ADR-0001's measured table.

⚠️ **Window caveat.** The filter is on the `created_at` _instant_, but thought records
carry a captured `created_offset_minutes` and the app buckets them by
`entryDayKey(created_at, created_offset_minutes)` (#330). A record written just either
side of a month boundary in a different UTC offset is counted by the instant, not by the
civil day the rest of the app shows it on. ADR-0001 says day-scoped windows should walk
civil days via the captured offset. For a _month_ boundary the blast radius is one row at
most and only for travellers — acceptable, but it should be a written assumption, not an
accident. (`thought_records` is the **only** table with a captured offset column; every
ACT table resolves its day from the viewer's current zone.)

⚠️ **Do not put an exact head count next to a capped client-side count.** This is the
ADR-0001 failure mode by name: "the exact hero count can sit beside it disagreeing
quietly". If stat 1 is an exact server count and stat 3's distortion counts are reduced
over the 500-row list, the two must be reconciled or both must come from the same source.

## 2. The belief-drop stats (2 and 8)

### What is actually stored

```ts
// src/features/cbt/types.ts
export interface NegativeAutomaticThought {
  text: string;
  beliefRating: number | null; // 0-100; how strongly the user believes this thought
  isHotThought: boolean;
}
```

`nats` is a `jsonb` column and it is **encrypted** — `nats_enc bytea`, written as
`app.encrypt_text(coalesce(new.nats,'[]'::jsonb)::text)` and read back as
`app.decrypt_text(nats_enc)::jsonb`.

Two separate blockers, and the second is the fatal one:

- **Aggregation:** a belief rating inside an encrypted jsonb blob cannot be averaged by
  SQL without decrypting `nats_enc` for every row in the window and re-parsing the JSON.
  ADR-0001 makes this technically legal (a `stable security invoker` RPC reading the
  decrypting view pays `rows returned × encrypted columns selected`), but it means one
  decrypt per record for a single number, on a table whose other reads deliberately avoid
  that.
- **The datum does not exist.** There is exactly one `beliefRating` per NAT and no
  re-rating step anywhere in the wizard, the editor, or the detail screen. Grep confirms
  every `beliefRating` write site is the `nats` step / `nat-add-form`. **A "belief drop"
  cannot be computed from any window of any size, on the server or the client.**

### The two ways out

**(a) Re-read the stat as emotion intensity.** `emotion_intensity_before` and
`emotion_intensity_after` are `integer check (… between 0 and 100)` and are explicit
pass-throughs in the encrypt migration ("PASS-THROUGH: … `emotion_intensity_before`,
`emotion_intensity_after`") — plaintext on `thought_records_data`, aggregatable in SQL,
and already differenced in the UI:

```ts
// src/features/cbt/thought-record-detail-screen.tsx:113
const intensityShift =
  data.emotionIntensityBefore !== null && data.emotionIntensityAfter !== null
    ? data.emotionIntensityAfter - data.emotionIntensityBefore
    : null;
```

- **Stat 8 becomes free.** The number already renders on the detail card via
  `detail.intensityShift`; the redesign is a presentation change ("45 points lighter"
  wants the magnitude of a drop, the code holds a signed after−before) plus new copy.
  `thought-record-saved-screen.tsx` shows the same pair on the closing moment.
- **Stat 2 depends on its window.** If it is "this month", the 500-row list covers it
  (see §3's bound) and a client-side mean is legal under ADR-0001's _assumed bound_
  clause. If it is lifetime — and the phone variant "−31 points avg" draws no window at
  all — then it is an average beyond the cap and ADR-0001 is unambiguous: **sums,
  averages, medians, buckets, extremes ⇒ a SQL function**, plus a parity integration test
  pinning the JS and SQL implementations to each other. **The spec must state the window;
  it is the single fact that decides migration-or-no-migration.**

**(b) Add a second belief rating** (re-rate the hot thought after the balanced thought).
That is a schema + wizard + i18n change and a product decision, not a stats decision. It
would land inside the encrypted `nats` blob, so it would _still_ be unaggregatable in SQL
— any average over it would be client-side or would pay a decrypt per row.

⚠️ Sanity check on the drawn value: a mean drop of **−31 points** on a 0-100 scale where
the input control is `NumberRating min={0} max={100} step={10}` is plausible for emotion
intensity. Both fields are **nullable and optional** — a record where either is null
contributes nothing, so the denominator is "records that filled in both", not "records".
The label must not imply otherwise.

## 3. Per-distortion counts (stats 3 and 4)

### What exists today

`useCbtInsights` already computes this — but not in the shape drawn:

```ts
// src/features/cbt/use-cbt-insights.ts
const topDistortions = useMemo<TopDistortion[]>(() => {
  if (!thoughtRecords || thoughtRecords.length < 5) return [];
  const counts = new Map<string, number>();
  for (const record of thoughtRecords)
    for (const distortion of record.distortions)
      counts.set(distortion, (counts.get(distortion) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, 3);
}, [thoughtRecords]);
```

Four gaps against the design:

|            | today                                                                                                                                    | design                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| window     | **lifetime** (whatever the 500-row list holds)                                                                                           | **this month**                                                                 |
| rows shown | top **3** (`.slice(0, 3)`)                                                                                                               | **4** (Mind reading 5, Catastrophising 3, Personalisation 2, All-or-nothing 2) |
| gate       | hidden entirely below **5** thought records                                                                                              | design shows a run of counts                                                   |
| render     | one card, `dashboard.insights.topDistortion` = `"Top distortion: {{name}} ({{count}}×)"` with the rest joined into a prose `description` | a per-pattern list                                                             |

`build-insight-cards.ts` consumes `topDistortions[0]` as the card title and
`topDistortions.slice(1)` as a comma-joined detail line, so re-shaping the section is a
change to `use-cbt-insights.ts` + `build-insight-cards.ts` + `cbt-insights-section.tsx`,
not new plumbing.

### Can it be client-side?

Yes, and the bound is unusually clean. `listThoughtRecords` caps at **500** rows ordered
by `updated_at desc`. Any record created this month has `updated_at >= created_at >=
monthStart`. For such a record to fall outside the top 500, five hundred _other_ records
must have a strictly greater `updated_at` — which puts all of them after `monthStart` too.
So the month window is fully covered unless the user creates or edits **more than 500
thought records inside one calendar month**. Under ADR-0001 that is an _assumed_ bound,
and an honest one; it must be written down where the cap lives together with its failure
mode (silent undercount past 500/month).

That bound does **not** hold for a lifetime window. If the section is ever re-drawn as
"all time", the counts truncate silently — exactly the #293/#256/#337 pathology — and it
must move to the server. **The current lifetime implementation is already in that
position**, which is worth flagging on its own: `topDistortions` today is a lifetime stat
over a capped list, and ADR-0001 says lifetime ⇒ server. Narrowing it to "this month" as
the redesign does actually _fixes_ a latent ADR-0001 violation.

### If it goes server-side

`distortions` is a plaintext `text[]` — the encrypt migration lists it as a pass-through
alongside `emotions` — so this is `mood_emotion_counts()` transposed almost verbatim:

```sql
create or replace function public.thought_record_distortion_counts()
returns table (distortion_id text, uses bigint)
language plpgsql stable security invoker
set search_path = pg_catalog, public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  return query
  select d.id, count(*)
    from public.thought_records_data as tr          -- base table: no decrypt in the projection
    cross join lateral unnest(tr.distortions) as d(id)
   where tr.user_id = uid and tr.archived_at is null
   group by d.id;
end; $$;
revoke all on function public.thought_record_distortion_counts() from public;
revoke execute on function public.thought_record_distortion_counts() from anon;
grant execute on function public.thought_record_distortion_counts() to authenticated;
notify pgrst, 'reload schema';
```

Notes if this route is taken:

- Reading `thought_records_data` rather than the view is a **simplification, not a
  performance requirement** — ADR-0001 explicitly corrects the `mood_emotion_counts`
  header comment on this: `app.decrypt_text` and `app.encryption_key()` were marked
  `STABLE` in `20260666_audit_phase2_fixes.sql`, so a projection naming no encrypted
  column already costs zero decrypts through the view. (The `mood_emotion_counts` header
  still asserts the pre-`20260666` VOLATILE story; do not copy that paragraph forward.)
- **Windowing pushes it past the precedent.** `mood_emotion_counts()` is deliberately
  argument-free _because_ it is lifetime and therefore has no day boundary to get wrong.
  A "this month" version needs `p_time_zone text` (an IANA zone name, resolved per row
  instant so DST cannot misbucket — ADR-0001, #333/#401), and for thought records it
  should prefer the row's captured `created_offset_minutes` and fall back to `p_time_zone`
  only where the offset was never captured. That is materially more work than the
  precedent, and it is the argument for staying client-side here.
- Migration hygiene applies: a new file must sort after `20260815000000`, use the 14-digit
  form, and not collide with a same-day sibling.
- ADR-0001's **parity obligation**: a stat expressed in both JS and SQL gets an
  integration test pinning the two to each other on seeded rows. The isolation assertion
  from `test/integration/mood-emotion-counts.integration.test.ts` (alice cannot see bob's
  rows; the assertion that would catch a later "optimisation" to `security definer`) is
  the other half.

### Copy detail

The i18n keys are kebab-case and **American-spelled**: `distortions.mind-reading.title` =
"Mind reading", `distortions.catastrophizing.title` = "Catastrophizing",
`distortions.personalization.title` = "Personalization",
`distortions["all-or-nothing"].title` = "All-or-nothing thinking". The design writes
"Catastrophising" / "Personalisation" (British). Either the design is illustrative or the
en strings change — and a source-string rename reaches Weblate, so it is not free.

## 4-7. The ACT stats

The ACT overview fetches **exactly one thing** today:

```ts
const { data: defusionLogs } = useDefusionLogs(userId, 50);
const recentLogs = defusionLogs?.slice(0, 3) ?? [];
```

No choice points, no committed actions. All three stats are new data.

### 5. "choice points mapped" → `act_choice_points`

No count helper exists. `listChoicePoints(userId, limit = 30)` is the only read.

☠️ **`useChoicePoints` puts its limit OUTSIDE the query key.**

```ts
export function useChoicePoints(userId: string | null, limit = 30) {
  return useQuery({ queryKey: actKeys.choicePointList(userId), queryFn: () => listChoicePoints(userId!, limit), … });
}
```

So `useChoicePoints(userId, 500)` and the list screen's `useChoicePoints(userId)` share one
cache entry and whichever mounts first wins. `count-queries.ts` already documents this as a
known "best-effort raise, never an undercount regression" for the Progress screen. A header
stat that says **"37 choice points mapped"** and silently means 30 is not best-effort, it is
wrong. `useDefusionLogs`/`useExpansionLogs`/`useUrgeSurfLogs` _do_ key on their limit;
`useChoicePoints`/`useConnectionLogs`/`useObservingSelfSessions` do not.

⇒ Add `countChoicePoints(userId)` as a `head` count, mirroring `countCommittedActions`
(including the `isMissingACTSchemaError(error) → 0` degradation every ACT read has).
Index-backed by `act_choice_points_user_created_idx (user_id, created_at desc)`.
No decryption: `hooks`, `away_moves`, `toward_moves`, `notes` are all `_enc bytea`, and
none of them are needed for a count.

### 6. "thoughts unhooked" → `act_defusion_logs`

`defusionLogs.length` off the screen's existing `useDefusionLogs(userId, 50)` is
**wrong past 50 rows** — a hard truncation, not an assumed bound, since a user can easily
log more than 50 defusions over a lifetime. Raising the limit to 500 fetches 500 rows and
pays `500 × 3` decrypts (`fused_thought_enc`, `defused_version_enc`, `notes_enc`) for one
integer.

⇒ Add `countDefusionLogs(userId)` as a `head` count. Index-backed by
`act_defusion_logs_user_created_idx`. Zero decrypts.

### 7. "committed action" → `act_committed_actions`

**Already built.** `countCommittedActions(userId, status)` +
`useCommittedActionCount(userId, status)` exist and already serve the app Home's "N active"
row. `status` is plaintext; `title`/`description`/`obstacles` are encrypted and unneeded.
Index-backed by `act_committed_actions_user_status_idx`.

⚠️ The design draws the label singular ("committed action"), which does not disclose
whether the number is _active_ commitments or lifetime. `listCommittedActions` has **no
`.limit()` at all**, which is why the count query was added in the first place — so
whichever is chosen, use the count, never the list length. **Open question for the spec.**

⚠️ All three ACT tables lack a captured occurrence offset, so any windowed ACT stat
buckets by the viewer's current zone. Lifetime counts sidestep this entirely, which is a
point in their favour.

## Presentation: `ModuleHomeHeader.stats`

```ts
export interface HeaderStat {
  value: string;
  label: string;
}
```

Rendered by `HeaderStats` as `value` in `font-semibold text-foreground tabular-nums`, then
`label` muted, joined by a `·` that belongs to the _preceding_ item so a wrapped line never
starts with a stranded separator. Neither CBT nor ACT passes `stats` today.

**Pattern B is the decided convention** (#749, 2026-08-09): the number goes in `value`,
the noun becomes a bare pluralised `label`:

```ts
{ value: String(n), label: t("hero.entries", { count: n }) }   // entries_one: "entry"
```

Six modules still ship the whole phrase in `value` with `label: ""`, which bolds the entire
stat. Count the _rendering_, not the call sites — the majority pattern is the broken one.
`gratitude-home-screen.tsx:90` is the correct model, including the `hero.loadingValue`
em-dash placeholder for an undefined count.

☠️ **Bulgarian бройна форма.** Masculine nouns take a count form after a numeral. Under
pattern B the bg `_other` value is a _count form, not a plain plural_ — it only ever renders
after a number (`3 записа`, never `3 записи`). New keys for these stats need bg values
authored as count forms, and they look wrong in isolation, so they must never be
"corrected" in Weblate. A flat, unpluralised label paired with a number is a live bg bug
even when the en reads fine.

Keys land in the `cbt` and `act` namespaces, both locales (`en`, `bg`).
`test/i18n-key-coverage.test.ts` already walks every locale JSON on a key-shape regex, and
`test/accent-ink-call-sites.test.ts` scans `ModuleHomeHeader` call sites — either is the
right home for a "no `t(…, {count})` inside a stat's `value:`" invariant.

Also worth noting for the phone variant: `HeaderStats` wraps rather than scrolls, and each
item is `shrink`, so "−31 points avg" vs "belief drops points on average" is a copy choice
the component already supports without a breakpoint prop.

## Open questions the spec must answer

1. **What is stat 2 actually measuring?** Belief does not have a before/after. Emotion
   intensity does. Pick one, or add a re-rating step.
2. **What is stat 2's window?** "this month" ⇒ client-side, no migration. Lifetime ⇒ RPC +
   parity integration test.
3. **Lifetime or "this month" for the distortion counts?** The design says this month; the
   code today is lifetime. This month is both cheaper and more correct.
4. **Is stat 7 active commitments or lifetime commitments?**
5. **Do stats 1 and 3 come from the same source?** Mixing an exact server count with a
   capped client reduction in one section is the named ADR-0001 anti-pattern.
6. **British vs American distortion spellings** — the design and the en strings disagree.

## Sources

- `supabase/migrations/20260591_thought_records_encrypt.sql` (encrypt/pass-through split)
- `supabase/migrations/20260637|20260649|20260653_act_*_encrypt.sql`
- `supabase/migrations/20260809000000_mood_emotion_counts.sql` (the RPC precedent)
- `test/integration/mood-emotion-counts.integration.test.ts` (its isolation test)
- `supabase/migrations/20260814000000_home_recency_indexes.sql`
- `supabase/migrations/20260731130000_thought_records_occurrence_offset.sql`
- `docs/adr/0001-row-derived-vs-server-aggregated-stats.md`
- `src/features/cbt/repository.ts`, `queries.ts`, `use-cbt-insights.ts`,
  `cbt-home/build-insight-cards.ts`, `cbt-home/derive-cbt-home-view.ts`,
  `thought-record-steps.ts`, `thought-record-detail-screen.tsx`
- `src/features/act/act-home-screen.tsx`, `count-queries.ts`, `queries/*.ts`,
  `repository/*.ts`
- `src/components/app/module-home-header.tsx`

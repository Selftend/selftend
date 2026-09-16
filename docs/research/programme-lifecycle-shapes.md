# What each candidate shape costs — programme lifecycle

Date: 2026-09-16 · Map: [#2529](https://github.com/Selftend/selftend/issues/2529) ·
Ticket: [#2532](https://github.com/Selftend/selftend/issues/2532) (research, AFK) ·
Origin: [#2386](https://github.com/Selftend/selftend/issues/2386) ·
Branch: `research/programme-lifecycle-shapes`, cut from `origin/dev` at `4a8421f5`

**This is a bill, not a recommendation.** Nothing below chooses a shape; that is the
next ticket's job and it is a product decision, not a cost one. Every figure was read
off this branch and is cited `file:line`. No jest run was performed; no source file was
modified.

---

## Headline

Four facts change the arithmetic the ticket set up.

1. **The migration's cost is a constant, not a function of the change.** Every
   migration that touches user data must redeclare `export_user_data()` **wholesale** —
   currently a 1,019-line statement. The single-column `account_origin` migration is
   **1,092 lines**, of which the column add is about 50
   (`supabase/migrations/20260914000000_account_origin.sql:1092` total, column at `:36-38`,
   export from `:59`). So "nine columns" and "one new table" both round to _one ~1,100-line
   migration_, and "nothing" is the only shape that avoids it. Migration size is a bad
   discriminator between shapes 3, 4 and 5.

2. ☠️ **Shape 5's premise mis-describes its own precedent.** `goals`,
   `act_committed_actions` and `procrastination_tasks` are decrypting views over
   `*_data` base tables — but **their `status` columns are plaintext**, and so are their
   dates. The rule is written down verbatim at
   `supabase/migrations/20260649_act_committed_actions_encrypt.sql:6-9`:

   > `-- ENCRYPT (all text, NOT NULL, default ''; no length cap, no not-blank constraint):`
   > `--   title, description, obstacles`
   > `-- PASS-THROUGH (plaintext, stay on the base table): id, user_id,`
   > `--   life_domain (enum CHECK), status (enum CHECK), target_date (date), created_at, updated_at.`

   And `supabase/migrations/20260821020000_goal_value_key.sql:13-22` says the same thing
   from the other side: goals' convention "was derived from columns like status and target
   date, **which carry nothing personal**." A `programme_runs` row holding a status, a
   phase index and three timestamps has **zero columns the pattern would encrypt**.

   ⚠️ **But the repo contains one table built in that shape anyway, and it is the closest
   precedent of all.** `dbt_sessions_data` has no `_enc` column and still carries the full
   apparatus, for a reason stated in the migration
   (`supabase/migrations/20260910000000_dbt_module.sql:172-174`):

   ```
   -- No free text today, so no `_enc` column - but the base/view pair is kept so the
   -- post-MVP sessions' optional `note_enc` is an added column rather than a
   -- retrofit, and so the repository reads every DBT table the same way.
   ```

   So shape 5 is priceable two ways and the bill states both: against the _criterion_ it is
   scaffolding around nothing; against the _dbt_sessions precedent_ it is ~84 lines bought
   as insurance that a future free-text field (a "why did you leave?" note) is an added
   column rather than a retrofit. Which of those it is, is the next ticket's call.

3. ☠️ **There is a third gate the ticket does not name.** Besides the export-completeness
   gate and the delete path, a new table carrying `user_id` must be accounted for in the
   engagement report's `content_events` registry:
   `test/integration/analytics-reports.integration.test.ts:550-592` (`NOT_CONTENT`), and
   `docs/analytics.md:218-226` forbids an exemption that says "undecided". Shapes 4 and 5
   owe it a line and a reason; shapes 1–3 owe it nothing.

4. **The fossil is one line away from being read, and the report already knows it.**
   `programme_progress` already joins `user_preferences` and already carries `started_at`
   and `phase_index` together on purpose; it simply does not select `phase_started_at`
   (`scripts/analytics-engagement.sql:226-248`). Shape 2's whole SQL cost is that one
   column plus a new fixed-shape row — it touches no migration, no client file and no
   `user_preferences` column.

---

## 0. The baseline: what exists, who writes it, who reads it

### The columns

**Six per module, not five** — the fifth fact the ticket lists omits
`*_graduation_dismissed_at`, which the funnel reads as a funnel step.
`docs/modules/act-harris-happiness-trap.md:387` says so in as many words: "Preference
flags on `user_preferences` (mirror `cbt_program_*`) — **six**, not three".

| column (× `cbt_`, `act_`, `dbt_`) | type                         | written by                                             |
| --------------------------------- | ---------------------------- | ------------------------------------------------------ |
| `*_program_started_at`            | `timestamptz null`           | start, replay, **abandon (→ null)**                    |
| `*_program_completed_at`          | `timestamptz null`           | advance-on-last-phase; cleared by start/replay/abandon |
| `*_program_prompt_dismissed_at`   | `timestamptz null`           | dismiss, abandon; cleared by start/replay/show         |
| `*_program_phase_index`           | `integer not null default 0` | start/replay (→ 0), advance (→ +1)                     |
| `*_program_phase_started_at`      | `timestamptz null`           | start, replay, advance — **never nulled**              |
| `*_graduation_dismissed_at`       | `timestamptz null`           | dismiss-graduation; cleared by start/replay            |

That is **18 of the table's 114 columns**, ~16%. The client-side mirror is four
coordinated lists in two files:
`src/features/settings/repository.ts:32-89` (row type), `:147-212` (`mapPreferences`),
`:414-471` (`PREFERENCE_COLUMNS`), and `src/features/modules/types.ts:74-95` (the
`UserPreferences` face) + `:262-278` (`defaultUserPreferences`).

### Confirmed and corrected against the ticket's premises

- ✅ `user_preferences` is a plain RLS'd table. Nothing in the migration history wraps it
  in a `*_data` twin; the export reads it directly with three explicit projections
  (`supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql:183-257`,
  `:1065-1096`, `:1146-1164`).
- ✅ Nothing nulls `*_program_phase_started_at`. The three `abandonProgram`s write exactly
  three fields each and leave the phase columns alone:
  `src/features/cbt/use-cbt-program.ts:132-141`,
  `src/features/act/use-act-program.ts:131-140`,
  `src/features/dbt/use-dbt-program.ts:132-143`.
- ⚠️ **Correction: `goals.status` has four values, not three.**
  `supabase/migrations/20260514_cbt_phase1.sql:17` —
  `check (status in ('active', 'completed', 'paused', 'abandoned'))`. The three-value form
  the ticket quotes belongs to `procrastination_tasks`
  (`supabase/migrations/20260516000000_cbt_phase4.sql:25`) and to
  `act_committed_actions`. If a run row copies "the goals vocabulary", it inherits a
  **paused** state the ticket did not price — and _paused_ is arguably the nearest word
  the schema already has for the stall the map found.
- ⚠️ **Correction: `cbt_phase4` is a migration filename, not a table.** The status-bearing
  table in it is `public.procrastination_tasks`
  (`supabase/migrations/20260516000000_cbt_phase4.sql:16-28`), encrypted into a view by
  `supabase/migrations/20260605_procrastination_tasks_encrypt.sql:46`.

### Every reader, re-derived one notch wider than the ticket

Grepped on the column names, the camelCase field names, and `phaseIndex` /
`phaseStartedAt` separately, across `src/`, `app/`, `test/`, `scripts/`, `supabase/`
and `docs/` — `app/` carries **no** direct reference, which is worth stating because
grepping `src/` alone would have left that unknown.

**Server-side readers (3):**

| reader                                                                                                                                                                                       | where                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `public.program_widget_task_status()` — reads `cbt_program_phase_index`, `coalesce(cbt_program_phase_started_at, cbt_program_started_at)`, and the ACT twin, straight off `user_preferences` | `supabase/migrations/20260803000000_program_widget_captured_days.sql:112-119`, `:215-221` |
| `public.export_user_data()` — the 18 columns sit in the `preferences` projection                                                                                                             | `supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql:185-252`         |
| `scripts/analytics-engagement.sql` — `programme_progress`, `first_occurrences`, section 7                                                                                                    | `:226-248`, `:362-405`, `:755-813`                                                        |

**Client readers (13 files):**
`src/features/settings/repository.ts` · `src/features/modules/types.ts` ·
`src/features/{cbt,act,dbt}/use-<module>-program.ts` ·
`src/features/{cbt,act,dbt}/derive-<module>-program.ts` ·
`src/features/{cbt,act,dbt}/<module>-home-screen.tsx` ·
`src/features/widgets/use-widget-snapshot-sync.ts:71-137` ·
`src/features/widgets/snapshot-types.ts:224-232` ·
`src/features/widgets/snapshot-builder.ts:418`.
Indirect consumers of the hooks (no column knowledge): `src/features/cbt/use-cbt-insights.ts`,
`src/features/act/queries/defusion.ts`, `src/features/routines/use-routine-tool-records.ts`,
`src/components/app/{cbt,act}-program-card.tsx`.

**Non-rendering writers/readers (3):**
`scripts/seed-demo-data.mjs:2937-2947` (writes the CBT anchor) and `:2960-3020` (reads it
back and re-derives the phase) · `test/integration/analytics-reports.integration.test.ts:347-376`
(fixture writer) · `test/integration/program-widget-task-status.integration.test.ts:29-40, 64-68, 184-186`.

**Docs that state the column names** (any rename or move drags all of these):
`docs/analytics.md` (§Phase 1 programme funnel `:226-256`, §first occurrences `:595-627`,
§Phase 3 correction `:787-812`) · `supabase/README.md:463-469` ·
`docs/modules/act-harris-happiness-trap.md:385, 387, 637` ·
`docs/modules/dbt-mckay-skills-workbook.md:444, 497` ·
`docs/design/1980-before/README.md:38, 207, 208, 266` · `CONTEXT.md:16-19, 129`.

---

## 1. The fixed costs every non-"nothing" shape pays

### 1.1 The migration version

`supabase/README.md:314`: "**So: use `YYYYMMDDHHMMSS` for anything new, and keep one
width.**" Two rules bind — no two files may share a version, and **no version may be a
prefix of another** (`:289-312`), which is what makes a bare-8-digit sibling fatal.
`test/migration-conventions.test.ts` fails the build on either (`supabase/README.md:316`).

The **`max(existing) + 1 day`, never today's date** convention is stated at
`docs/reminders.md:145`: "One migration, versioned **`max(existing) + 1 day` at write
time** … never today's date - see the migration-version rule the repo follows".

**Concretely on this branch:** the newest checked-in version is **`20260919000000`**
(`supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql`), so the next
free version is **`20260920000000`** — not `20260916…`, which today's date would give and
which is _behind_ five existing files. ⚠️ Re-derive at write time; three of the last six
migrations landed on dates ahead of the calendar.

### 1.2 The export redeclaration — the dominant constant

`supabase/README.md:450-454`: "**Copy from the newest declaration on `dev`, not from the
one you were reading when you started.** Every redeclaration is a full-body
last-writer-wins over every other one … on 2026-07-28 `dev` shipped an export missing two
activity columns exactly this way (#429)."

- Newest declaration: `supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql:149`,
  statement lines 149–1167 → **1,019 lines copied**, whatever the change.
- `user_preferences` is serialised as **three explicit bare-identifier column lists**
  (`:183-257`, `:1065-1096`, `:1146-1164`), merged with `||`. Both gate parsers require
  bare identifiers — `test/integration/export-user-data-completeness.integration.test.ts:41`
  and `test/export-user-data-monotonic.test.ts:84` share the regex
  `/select\s+((?:[a-z_][a-z0-9_]*\s*,\s*)*[a-z_][a-z0-9_]*)\s+from\s+public\.(\w+)\b/gi` —
  so an expression in the projection silently un-matches the whole block.
- Two gates police it: `test/export-user-data-monotonic.test.ts` (no declaration may _lose_
  a column; runs in `verify`, no database) and
  `test/integration/export-user-data-completeness.integration.test.ts` (every live column
  of every read table is exported or withheld; runs in `integration`).

### 1.3 The export rule, and what the person then sees

`supabase/README.md:463-469`:

> The rule (#429, decided 2026-07-28): **a column is exported unless it is caller scoping,
> a credential or secret, server bookkeeping, or internal plumbing** … "It is app state"
> is not a reason: a theme, a chosen sound, an onboarding step or **a program phase is data
> the user provided or generated**. This table is parsed by the completeness integration
> test, so a new withheld column must be added here (with a reason) or the suite fails.

A programme lifecycle fact fits **none** of the four withheld categories. So on every
shape that stores one, **it is exported**, and the person's download gains it. Today the
export already ends-to-end asserts `cbt_program_phase_index` is inside `preferences`
(`test/integration/export-user-data-completeness.integration.test.ts:234-258`).

**Column half vs table half.** Both are enforced. The table half is
`test/integration/export-user-data-completeness.integration.test.ts:189-200`: every live
PostgREST-exposed `public` relation carrying a literal `user_id` column must be read by the
winning declaration or named in `supabase/README.md`'s whole-tables list (`:485-488`, which
today has exactly **two** rows: `*_data` and `digest_auth_identities`). The `*_data` row is
not a free pass — `dataTwinJustified` (`:144-153`) requires the decrypting view to exist,
the export to read _the view_, and every base-only column to end `_enc`.

### 1.4 The delete path — usually free

`purge_user_account()` explicitly deletes five things and lets the rest cascade
(`supabase/migrations/20260826000000_account_purge_helper.sql:41-51`). A new table declaring
`user_id uuid not null references auth.users (id) on delete cascade` owes it **nothing** —
the DBT module added seven tables and redeclared it zero times, and says so:
`supabase/migrations/20260910000000_dbt_module.sql:7-8`. Its newest (and only) declaration
remains `20260826000000`.

---

## 2. Shape 1 — Nothing

**Keep writing exactly what the app writes; record the refusal in `docs/analytics.md`.**

| line item                                | cost                                       |
| ---------------------------------------- | ------------------------------------------ |
| Migrations                               | **0**                                      |
| `export_user_data()`                     | untouched                                  |
| Export gate / content gate / delete path | untouched                                  |
| Client files                             | **0**                                      |
| Report SQL                               | **0**                                      |
| Tests that fail                          | **none**                                   |
| Files touched                            | 1–2 docs                                   |
| Tickets                                  | **1** (a docs change, or a line in an ADR) |

**What it owes.** `docs/analytics.md` currently carries the _observation_ three times —
`:247-256`, `:618-627`, `:794-812` — each ending in a pointer to a change that is "tracked
separately". None of them carries a **ruling**. Recording the refusal means converting the
newest of those (`:808-810`: "☠️ **Recording abandonment properly is a change to what the
app writes, not to what the report reads**") from a deferral into a decision, and the
funnel's own `\echo` legend (`scripts/analytics-engagement.sql:755-762`) and section-7
comment (`:766-781`) would want the same sentence so a later reader does not "fix" it.

**What it costs in kind, not in files.** The state-vs-event caveat becomes permanent, and
`docs/analytics.md:595-608` already records the one thing it makes unrecoverable forever:
_"the first time anybody reached phase 3" is not recoverable_. Per the map, that has cost
nothing to date — 0 abandonments, 0 completions, 0 phase advances in production.

⚠️ **The one thing this shape does not buy.** It does not make the funnel honest; it makes
the funnel's dishonesty _ruled_. Section 7's own comment (`:770-781`) already says the
drop-off is optimistic, so nothing in the report changes — but nothing stops being wrong
either.

---

## 3. Shape 2 — Read the fossil

**No migration. Teach the report that `phase_started_at IS NOT NULL AND started_at IS NULL`
is an abandoned run, and `phase_index` is where it stopped.**

| line item                       | cost                                                |
| ------------------------------- | --------------------------------------------------- |
| Migrations                      | **0**                                               |
| `export_user_data()`            | untouched (the fossil columns are already exported) |
| Export / content / delete gates | untouched                                           |
| Client files                    | **0**                                               |
| Report SQL                      | 1 file, ~3 edits                                    |
| Docs                            | `docs/analytics.md`, 2 passages                     |
| Tests that fail                 | 1 integration file                                  |
| Tickets                         | **1**                                               |

**The SQL, precisely.**

1. `programme_progress` gains `p.phase_started_at` — the view already cross-joins the
   three modules' columns and just does not select this one
   (`scripts/analytics-engagement.sql:226-248`). One column in the `values` list, one in
   the projection, per module.
2. Section 7 gains an abandoned row, or the `\echo` legend changes. ☠️ It cannot simply
   become a new `programme_steps` row: `programme_steps` is a _funnel_ keyed on
   `min_phase_index` (`:250-268`) and an abandonment is not a later step than completion.
   The `reached` CTE's `case s.kind` (`:783-793`) has **no catch-all `else`** by design
   (`:277-281`), so a new kind must be named in both places or it silently falls into the
   phase branch.
3. `first_occurrences` may gain "somebody has left a programme part-way"
   (`:391-406`). ⚠️ Same no-`else` discipline, and the same k=5 exemption: this section
   prints facts, never counts (`:293-297`).

**What it does _not_ recover, stated exactly.** The report's own comment already names it
(`:337-344`): `phase_started_at` "holds only the CURRENT phase's start — it is overwritten
on every advance". So the fossil yields **that a run was abandoned** and **at which phase**,
and it yields a _lower bound_ on when the last phase began. It does not yield when the run
started, when it was left, or anything about a prior run — a replay overwrites the fossil
with a fresh `phase_started_at` and the previous abandonment disappears
(`src/features/cbt/use-cbt-program.ts:143-155`).

⚠️ **And the fossil is ambiguous the moment a person replays.** `started_at IS NULL AND
phase_started_at IS NOT NULL` is exact _today_ only because nobody has both abandoned and
restarted. A person who abandons, restarts and abandons again presents identically to one
who abandoned once — so the predicate identifies "there is an abandoned run", never "how
many".

**Tests that will fail.** `test/integration/analytics-reports.integration.test.ts` —
specifically `describe("engagement report: the programme funnel")` at `:1561`, its
`"prints every step for every programme and both account types"` at `:1709` (a row-count
assertion), and the first-occurrences watch-list assertion at `:2162-2203`, which pins the
**exact** fact list including the three-per-programme block at `:2190-2194`. That last one
is the acceptance-criterion test: a new fact must be added there or the suite fails, by
design. `test/analytics-programme-phases.test.ts` is **unaffected** (it only reads
`programme_labels`). `test/analytics-shared-sql.test.ts` is **unaffected**:
`programme_progress` is not a shared block (`EXPECTED_BLOCKS` at `:25-36` lists only
`accounts`, `content_events`, `k_suppression`, `population_provenance`).

---

## 4. Shape 3 — More columns on `user_preferences`

**e.g. `*_program_abandoned_at`, or keeping `started_at` and adding a status.**

| line item            | cost                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Migrations           | **1**, ≈ 1,100 lines (the export redeclaration is ~1,019 of them) |
| New columns          | 3 per module × 3 = **9**, taking the table from 114 → **123**     |
| `export_user_data()` | 9 identifiers added to the projection at `:185-252`               |
| Export gate          | satisfied by exporting; **the person's download gains 9 fields**  |
| Content-events gate  | untouched (no new table)                                          |
| Delete path          | untouched                                                         |
| Client files         | **4 minimum** + 3 hooks                                           |
| Report SQL           | as shape 2, plus the new columns                                  |
| Tests that fail      | ~8 files                                                          |
| Tickets              | **2–3** (migration+export · client write · report/docs)           |

**Migration mechanics.** `user_preferences` is a plain table, so the DDL is an ordinary
`alter table … add column if not exists` — the exact shape of
`supabase/migrations/20260914000000_account_origin.sql:36-38` and
`supabase/migrations/20260918000000_general_reminder_columns.sql:19-24`. **No RLS change**
(the table's three policies are `for`-scoped, not column-scoped), **no grant**, **no
trigger**, **no drop-view dance**. That is the whole saving over shape 5, and it is real:
the column add is ~5 lines of DDL plus a `comment on column`.

**The client bill is four coordinated lists, and the fourth is easy to miss.**
`src/features/settings/repository.ts` holds the row type (`:32-89`), the mapper
(`:147-212`) and the patch map `PREFERENCE_COLUMNS` (`:414-471`);
`src/features/modules/types.ts` holds the public face (`:74-95`) and the defaults
(`:262-278`). ⚠️ A column added to the first three and not to `PREFERENCE_COLUMNS` is
**silently unwritable** — `updateUserPreferences` translates through that map and skips
unknown keys (`:509-512`).

☠️ **The undershipped-schema retry is a real hazard here, and the comment says why.**
`src/features/settings/repository.ts:262-268`: PostgREST's PGRST204 is parsed so a write
retries **without only the named column**, because "the previous broad-strip fallback
silently dropped program-state writes, so 'abandon program' appeared to do nothing"
(`:516-519`). So on an environment whose schema is behind the code — a shipped native build
running before the migration reaches it is the usual case — an abandon that is _supposed_
to write `*_program_abandoned_at` will still succeed, minus that column, and **record
nothing**. The new fact is only as reliable as migration/build ordering.

**Data-minimisation framing (not a recommendation, a cost).** `AGENTS.md` requires
feature-level justification per field, and `supabase/README.md:463-469` guarantees the
result is exported. Nine timestamps about leaving a mental-health programme is nine more
retained personal facts per account, and the map's guardrail puts the burden on keeping.

**What it does not buy.** Prior runs. A second abandonment overwrites the first
`*_program_abandoned_at` exactly as `phase_started_at` is overwritten today — the
state-not-event problem relocated one column to the right. Replay's clearing of
`completed_at` (`src/features/cbt/use-cbt-program.ts:143-155`) is untouched unless a
`*_program_completed_count` or similar joins the nine.

**Tests that will fail** (named): `src/features/settings/repository.test.ts` (`:234-260`
"defaults program timestamps to null" and the round-trip fixtures at `:290-340`) ·
`src/features/cbt/use-cbt-program.test.ts:339-363` (the abandon assertion is
`objectContaining`, so it passes on an _added_ key — it fails only if abandon stops writing
one of the three it names) · `src/features/act/use-act-program.test.ts` ·
`test/integration/export-user-data-completeness.integration.test.ts` (tests 2 and 6) ·
`test/export-user-data-monotonic.test.ts` (if the copy loses a column) ·
`test/integration/analytics-reports.integration.test.ts` (as shape 2) ·
`test/migration-conventions.test.ts` (version rules).
⚠️ **`src/features/dbt/use-dbt-program.ts` has no direct test** — there is no
`use-dbt-program.test.ts`; only `derive-dbt-program.test.ts` and `dbt-home-screen.test.tsx`.
A change to DBT's `abandonProgram` is caught by nothing hook-level.

---

## 5. Shape 4 — A `programme_runs` row per run (plain table)

**With a `status` in the existing vocabulary. Answers replay and prior runs for free.**

| line item            | cost                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------- |
| Migrations           | **1**, ≈ 1,150 lines (DDL ≈ 25, export ≈ 1,019, backfill the rest)                    |
| New objects          | table + FK + 1 RLS policy + 1–2 indexes + `comment on table`                          |
| `export_user_data()` | **1 new projection block** (a table, not an identifier)                               |
| Export gate          | table half at `…completeness:189-200` — must be read, or named in `README:485-488`    |
| Content-events gate  | **1 line in `NOT_CONTENT` with a real reason**                                        |
| Delete path          | free, via `on delete cascade`                                                         |
| Client files         | 3 hooks rewritten + a new query/repository + widget sync + 4 preference lists trimmed |
| Report SQL           | `programme_progress` rebuilt against the new table                                    |
| Tests that fail      | ~12 files, incl. 3 integration suites                                                 |
| Tickets              | **4–6**                                                                               |

**Migration mechanics.** The plain-table template is `favorites`:
`supabase/migrations/20260908000000_favorites.sql:30-47` — `create table` (8 lines),
`comment on table` (`:40`), `alter table … enable row level security` (`:42`), one
`create policy … for all to authenticated using (…) with check (…)` (`:44-47`). **No
explicit grant** (a table inherits the default `public`-schema ACL; a _view_ does not — see
shape 5). Note `:56-58`'s standing advice, inherited here: the policy should carry **both**
`using` and `with check`.

**What it owes the export.** A whole new `jsonb_build_object` block appended in the tail of
the function — the existing append points are at
`supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql:665, 721, 753, 796,
818, 891, 946, 991, 1104, 1119, 1134`, and the natural slot is between `:1144` and `:1146`.
The nearest single-table precedents are `breathingExercises` (`:1119-1131`) and
`feedbackSubmissions` (`:1134-1144`). The block must use **bare identifiers** (§1.2).
**What the person then sees in their download:** a new top-level array, one object per run,
carrying every run they ever started — including ones they left. That is a _visible_
product change to the export, unlike shape 3's nine extra fields inside `preferences`.

☠️ **The content-events gate, which the ticket does not mention.**
`test/integration/analytics-reports.integration.test.ts:550-592` holds `NOT_CONTENT`, "every
`public` relation carrying a `user_id` that `content_events` deliberately does not read,
each with the reason it is not activation." Two neighbours already sit there under exactly
the reason a run row would claim — `:569-571`:

> `act_program_state: "programme progress state; the practice writes an act_* row",`
> `meditation_program_state: "programme progress state; the practice writes meditation_sessions",`

So the line is cheap and the precedent is exact. But `docs/analytics.md:218-226` binds its
wording: "**No exemption may say 'undecided'** … Either a table is read, or its reason is
real. A test enforces this." And the registry has an anti-rot half — an entry that stops
being necessary fails too (`…integration.test.ts:533-536`).

**The client bill is the largest of the five, and it is not the migration.** Today the
programme's whole state arrives on a row the app _already blocks on_:
`src/features/settings/repository.ts:277-285` — "The row decides both legal gates, so while
it is unknown the whole app is behind `PreferencesUnavailableScreen`." A run row is a
**second read**, which means a new TanStack query key, its own loading surface, its own
invalidation on every start/advance/abandon/replay, and a decision about whether the module
home may render before it lands (ADR-0009's reserve-or-draw-nothing rule attaches to whatever
that surface is). The three hooks (`use-{cbt,act,dbt}-program.ts`, ~180 lines each) stop
being `updatePreferences.mutateAsync({...})` wrappers and become mutations against a new
repository.

☠️ **And the server RPC moves with it.** `program_widget_task_status()` reads
`cbt_program_phase_index` / `cbt_program_phase_started_at` / `cbt_program_started_at`
directly off `user_preferences`
(`supabase/migrations/20260803000000_program_widget_captured_days.sql:112-119`, ACT at
`:215-221`). It is the **Android launcher widget's** source of truth, and `CONTEXT.md:129`
warns the two copies of the checklist must move together or "the programme screen and the
Android launcher widget … contradict each other". So shape 4 costs a redeclaration of that
function too — a third shared, last-writer-wins function in the same migration.

**Migration/rollout hazard.** Native builds have **no OTA channel** (`docs/deployment.md`
and the three in-repo comments cited on map #2445's research). A shipped build keeps writing
`user_preferences`; the new table would be empty for it. Either the columns stay as a
write-through mirror for a release or two, or old builds' programme state stops being
recorded. `favorites` is the precedent for choosing the mirror
(`supabase/migrations/20260908000000_favorites.sql:5-13`: "reshaping the table would turn a
shipped app's add button into an error … A second table costs this copy plus three doc
entries, and an old phone keeps a WORKING dashboard").

**Tests that will fail** (named): the three `derive-*-program.test.ts` (if the view shape
changes) · `src/features/cbt/use-cbt-program.test.ts` and
`src/features/act/use-act-program.test.ts` (every assertion is on
`updatePreferences.mutateAsync` payloads — `:339-363` etc. — and all of them break) ·
`src/features/settings/repository.test.ts:234-260` (if the columns leave) ·
`src/features/widgets/snapshot-builder.test.ts:297` · the three
`<module>-home-screen.test.tsx` · `src/components/app/{cbt,act}-program-card.test.tsx` ·
`test/integration/analytics-reports.integration.test.ts` (fixture writer at `:347-376`, the
funnel block at `:1561`, and `NOT_CONTENT` at `:550`) ·
`test/integration/program-widget-task-status.integration.test.ts:29-40, 64-68, 184-186` ·
`test/integration/export-user-data-completeness.integration.test.ts` (tests 1, 2, 3, 5, 6) ·
`test/export-user-data-monotonic.test.ts` (columns that leave `user_preferences` need
`INTENTIONALLY_DROPPED` entries — `:43-69`, and each entry has its own anti-rot check at
`:169-191`) · `scripts/seed-demo-data.mjs:2937-3020` is not a test but fails the seed run.

**Replay and prior runs, the thing this buys.** With a row per run, `replayProgram`'s
clearing of `completed_at` stops being lossy by construction, which closes the map's own
"Not yet specified" item. The map already flagged that: _"if the shape is 'a run row',
replay is free and this patch closes itself."_

---

## 6. Shape 5 — A run row that is also encrypted

**Matching `goals` / `act_committed_actions` / `procrastination_tasks` — views over
`*_data` base tables.**

| line item                                  | cost                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Everything in shape 4                      | yes                                                                                                                                                                                                    |
| **Plus** per-table objects                 | base table, index, `updated_at` trigger, RLS enable, 1 policy, the view, **3 trigger functions**, **3 `INSTEAD OF` triggers**, **1 explicit grant** — 12–15 objects vs 4–7                             |
| **Plus** SQL lines                         | ≈ **84–100** vs a plain table's ≈ **14–35**; roughly **3×**                                                                                                                                            |
| **Plus** the export                        | must read **the view**, never the base (`README:485-488` + `dataTwinJustified`)                                                                                                                        |
| **Plus** a dedicated integration test      | the house convention — **39** `*-encryption.integration.test.ts` files exist, one per encrypted table; `test/integration/goals-encryption.integration.test.ts` is **287 lines**                        |
| **Plus** every later column change         | an add costs 70–105 lines; a drop costs the full dance, below                                                                                                                                          |
| **Plus** fleet-wide maintenance            | every cross-cutting audit re-declares every trigger function: `supabase/migrations/20260662_update_triggers_return_fresh_timestamps.sql` re-declared **33** `*_upd()` bodies in one 782-line migration |
| Ciphertext columns it would actually carry | ☠️ **zero** (but see `dbt_sessions`, below)                                                                                                                                                            |
| Tickets                                    | **5–7**                                                                                                                                                                                                |

**The template, measured.** `supabase/migrations/20260910000000_dbt_module.sql` builds seven
of these. Per table: base table (`:37`), index (`:47`), `set_*_updated_at` trigger (`:51`),
`enable row level security` (`:55`), `create policy …_manage_own` (`:58`), the
`security_invoker` view (`:63`), an optional guard function (`:74`), three trigger functions
(`:125`, `:142`, `:157`), three `INSTEAD OF` triggers (`:139`, `:154`, `:164`), and
`grant select, insert, update, delete on public.<view> to authenticated;` (`:167`) — **a view
inherits no ACL, so the grant is mandatory.** That is lines 37–167 = **131 lines** for
`dbt_coping_plans`; the leaner `dbt_sessions` is `:181-273` = **~84 SQL lines**.
`routines_data` — the only other table born in this shape — is
`supabase/migrations/20260715_routines.sql:24-135` = **96 SQL lines** for a table with
**one** encrypted column.

☠️ **The controlled experiment already exists in the repo.** `20260715_routines.sql` built
one encrypted table and one plain table on the same day and said why — `:11-12`:
"`routine_steps` is a plain table (tool_id is an app-defined identifier, not free text),
with RLS directly on it." `routine_steps` (`:139-183`) is **34 SQL lines** including two
indexes and a compound parent-ownership `with check`, against `routines_data`'s 96.
Plain-table comparators: `favorites` **14 SQL lines / 4 objects**
(`20260908000000_favorites.sql:31-49`); `widget_preferences` — the whole migration is
**17 lines** (`20260539_widget_preferences.sql`).

☠️ **The drop-view dance, priced.** There is exactly **one** `drop view` in the whole
migration history (`grep -rn "drop view" supabase/migrations/` → a single hit), which is
itself the measurement: the pattern is cheap to extend at the tail and expensive to change
anywhere else. Two precedents:

- **Adding** a column: `supabase/migrations/20260821020000_goal_value_key.sql` — base-table
  `alter` (`:47`), `create or replace view` **appending the column at the end only**
  (`:49-53`: "`create or replace view` may only ADD columns at the end - reordering raises
  'cannot change name of view column'"), **both** `INSTEAD OF` trigger functions redeclared
  _in full from their winning declarations_ (`:73`, `:101`), both triggers dropped and
  recreated (`:97-99`, `:126-128`), and the grant re-issued (`:130`). Lines 47–130 = **84
  lines**, before the 1,019-line export copy.
- **Removing** one: `supabase/migrations/20260919000000_drop_act_preferred_check_in_time.sql:27-33`
  — "Postgres allows a replacement to add trailing columns, never to remove one" — so it is
  `drop view` → rebuild → **re-attach all three `INSTEAD OF` triggers** (`:120-127`) →
  **re-grant** (`:129-132`: "The rebuilt view is a new object with no inherited ACL… Without
  it the view is unreadable by `authenticated` on any database built from migrations alone").

### Is programme lifecycle the kind of thing this pattern is for?

**The criterion is written down in four places and they agree: the pattern is for free
text.** The sharpest is `supabase/migrations/20260910000000_dbt_module.sql:10-15`, restating
`docs/modules/dbt-mckay-skills-workbook.md:466`:

```
-- The plaintext rule (spec §5.1), stated once: an id, an enum, a number a list
-- orders on, a timestamp, an offset or a boolean is a plaintext column with a
-- CHECK; every free-text field is `*_enc`. Nothing plaintext is ever the person's
-- words.
```

The other three: `supabase/README.md:62, 68` ("User-entered **text** columns are encrypted
at rest"); `docs/architecture.md:190`; `docs/data-privacy-model.md:30`. Plus
`supabase/migrations/20260821020000_goal_value_key.sql:20-22`, which names `status` by name
as a column that "carr[ies] nothing personal" — while itself being the one documented
override in the other direction (`value_key` is encrypted because _which values someone
holds_ was judged sensitive).

A `programme_runs` row of `status` + `phase_index` + timestamps is, by that rule, **entirely
plaintext**. So the encryption half of shape 5 is scaffolding around nothing it would
encrypt — _unless_ the `dbt_sessions` argument is accepted, in which case the same 84 lines
are the price of never doing the retrofit later. `20260626_goals_drop_plaintext.sql` is what
a retrofit's tail looks like: a **second** migration, purely to drop the plaintext columns
the conversion left behind.

☠️ **Three consequences of the pattern that are costs in their own right:**

1. **You cannot keep a plaintext column private on the base table.** `supabase/README.md:487`
   — "a table merely named `*_data`, or **a plaintext base column the view never surfaces**,
   fails the suite." So the "encrypt it but keep a private analytics column" design is
   closed; every base column is surfaced and exported.
2. **Validation in an `INSTEAD OF` trigger is bypassable; a base-table `CHECK` is not.**
   `supabase/migrations/20260669_audit_ciphertext_size_caps.sql:6-12` — the replacement
   validation "lives ONLY inside the INSTEAD OF triggers on the decrypting views — which an
   authenticated user bypasses entirely by POSTing straight to `/rest/v1/<table>_data` (the
   security_invoker views require the invoker to hold base-table privileges, so the base
   `_data` grants cannot be revoked)." A plain table puts the status CHECK in the
   un-bypassable place by construction. (`goals`' four-value status CHECK survives on
   `goals_data` for exactly this reason.)
3. **A server reader would read the base table, not the view.** `record_days()` does
   (`supabase/README.md:347`: "an all-time scan through nine `app.decrypt_text` views would
   decrypt the caller's entire history to answer a question about calendar days"), and so
   does `sleep_stats()`. So the funnel would read `programme_runs_data` and the view would
   exist only for the client — with `dataTwinJustified`
   (`test/integration/export-user-data-completeness.integration.test.ts:144-153`) then
   policing both halves. Index precedent for the funnel's filter:
   `supabase/migrations/20260814000000_home_recency_indexes.sql:64-65` puts
   `(user_id, status)` on `act_committed_actions_data`.

**And if `status` were encrypted**, the funnel could not group on it server-side at all:
`docs/research/2026-08-09-crypto-helper-volatility.md:67-74` — "a query that orders or
filters on a **decrypted** value must decrypt every candidate row before the `LIMIT` can
apply — a cap does not save it." `docs/adr/0002-encrypted-sleep-window.md:37-41` is the
standing precedent for accepting that consequence deliberately ("Server-side exact-timing
analytics are deliberately unavailable"). For a status the whole point of which is to be
counted, that is the cost in full.

---

## 7. The bill, side by side

|                                                 | 1. Nothing         | 2. Read the fossil | 3. More columns             | 4. Run row (plain)                   | 5. Run row (encrypted)                               |
| ----------------------------------------------- | ------------------ | ------------------ | --------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Migrations                                      | 0                  | 0                  | 1 (≈1,100 lines)            | 1 (≈1,150 lines)                     | 1 (≈1,200 lines)                                     |
| New DB objects                                  | 0                  | 0                  | 9 columns (114→123)         | **4–7** objects, ≈14–35 SQL lines    | **12–15** objects, ≈84–100 SQL lines                 |
| Dedicated encryption integration test           | —                  | —                  | —                           | —                                    | **~287 lines** (house convention, 39 exist)          |
| `export_user_data()` redeclared                 | no                 | no                 | **yes**                     | **yes**                              | **yes**                                              |
| What the download gains                         | nothing            | nothing            | 9 fields in `preferences`   | a new array of every run             | same                                                 |
| Export-gate work                                | none               | none               | 9 identifiers               | new projection block, read the table | new projection block, read **the view**              |
| `NOT_CONTENT` registry                          | —                  | —                  | —                           | **1 line + a real reason**           | **1 line + a real reason**                           |
| `purge_user_account()`                          | —                  | —                  | —                           | free (cascade)                       | free (cascade)                                       |
| `program_widget_task_status()`                  | —                  | —                  | —                           | **redeclare**                        | **redeclare**                                        |
| Client files touched                            | 0                  | 0                  | 5 (+3 hooks)                | ~12                                  | ~12                                                  |
| Report SQL                                      | 0                  | 1 file, 3 edits    | 1 file                      | 1 file, rebuilt                      | 1 file, rebuilt                                      |
| Docs touched                                    | 1–2                | 2                  | 4–5                         | 6–7                                  | 7–8                                                  |
| Test files that fail                            | **0**              | 1                  | ~8                          | ~12                                  | ~13 (+1 new)                                         |
| Later column add / drop                         | —                  | —                  | `alter table` + export copy | `alter table` + export copy          | **+70–105 lines** to add; **+69** for the drop dance |
| Recovers: that a run was left                   | no (fossil unread) | **yes**            | yes                         | yes                                  | yes                                                  |
| Recovers: which phase it was left at            | no                 | **yes**            | yes                         | yes                                  | yes                                                  |
| Recovers: _when_ it started / was left          | no                 | no                 | **yes**                     | **yes**                              | **yes**                                              |
| Recovers: prior runs / replays                  | no                 | no                 | no                          | **yes**                              | **yes**                                              |
| Recovers: the **stall** (the map's actual exit) | no                 | partly¹            | only if dated²              | only if dated²                       | only if dated²                                       |
| Rough size                                      | 1 ticket           | 1 ticket           | 2–3 tickets                 | 4–6 tickets                          | 5–7 tickets                                          |

¹ The fossil dates the _last phase move_, so "93 days since anything moved" is computable
today — that is how the map measured it. It cannot distinguish a stall from the gate.
² Every shape that records a stall has to decide whether a run frozen **by the module gate**
(#2449) is dated as such; the map's Notes call an undated stall signal "measuring the gate,
not the person". No shape prices that for free.

---

## 8. Surprises

1. ☠️☠️ **Shape 5's precedent does not encrypt the thing shape 5 exists to encrypt.**
   `status`, dates and timestamps are explicitly pass-through plaintext on all three cited
   tables, and the rule is written down — "an id, an enum, a number a list orders on, a
   timestamp, an offset or a boolean is a plaintext column with a CHECK"
   (`20260910000000_dbt_module.sql:10-15`; also
   `20260649_act_committed_actions_encrypt.sql:6-9`,
   `20260821020000_goal_value_key.sql:13-22`). An encrypted run row has nothing to put in a
   `bytea`.
2. ⚠️ **…and yet the repo already built exactly that table once, on purpose.**
   `dbt_sessions_data` has zero `_enc` columns and full apparatus, so that a post-MVP
   `note_enc` "is an added column rather than a retrofit"
   (`20260910000000_dbt_module.sql:172-174`). It cost ~84 SQL lines. That is the whole case
   for shape 5, and it is a bet on a future free-text field, not a confidentiality argument.
3. ☠️ **A plaintext column cannot be hidden on a `*_data` base table.** "a plaintext base
   column the view never surfaces, fails the suite" (`supabase/README.md:487`). The
   "encrypt it but keep a private analytics column" design does not exist here.
4. ☠️ **`INSTEAD OF` trigger validation is bypassable by any authenticated caller** POSTing
   to `/rest/v1/<table>_data` (`20260669_audit_ciphertext_size_caps.sql:6-12`). A status
   CHECK on a plain table is un-bypassable; one enforced in a view's trigger is not.
5. **The encrypted shape carries a standing fleet tax.**
   `20260662_update_triggers_return_fresh_timestamps.sql` re-declared **33** `*_upd()`
   bodies in one 782-line migration; `20260667`, `20260669` and `20260670` are three more
   fleet-wide sweeps. Each new encrypted table joins that fleet permanently.
6. ☠️ **`goals.status` has four values, not three** — `'paused'` is in the check
   (`20260514_cbt_phase1.sql:17`). And `cbt_phase4` is a _migration_, not a table; the
   three-value status belongs to `procrastination_tasks`.
7. ☠️ **A third gate exists that the ticket does not name**: the engagement report's
   `NOT_CONTENT` registry (`test/integration/analytics-reports.integration.test.ts:550-592`),
   with `docs/analytics.md:218-226` forbidding an "undecided" reason. Two exact precedents
   already sit in it (`act_program_state`, `meditation_program_state`), so the cost is one
   line — but it is one line nobody would have looked for.
8. **The migration's size is a constant.** One column and one whole table both cost the same
   1,019-line `export_user_data()` copy. Sizing the shapes by "how big is the migration"
   discriminates almost nothing.
9. **The programme columns are six per module, not five.** `*_graduation_dismissed_at` is one
   of them and the funnel reads it as a step
   (`scripts/analytics-engagement.sql:237-242`, `docs/modules/act-harris-happiness-trap.md:387`).
10. ☠️ **A shipped build with an older schema silently drops the new column and succeeds.**
    `src/features/settings/repository.ts:262-268, 514-521` retries a write minus the missing
    column by design — which is right for resilience and means a new abandonment timestamp
    records _nothing_ on any build that predates its migration, with no error anywhere.
11. **`program_widget_task_status()` is a fourth reader nobody lists.** It reads the
    programme columns straight off `user_preferences` and feeds the Android launcher widget
    (`20260803000000_program_widget_captured_days.sql:112-119`, `:215-221`;
    `CONTEXT.md:129` on why the two copies must move together).
12. **`user_preferences` is not just wide, it is the app's gate.** The whole app sits behind
    `PreferencesUnavailableScreen` until that one row lands
    (`src/features/settings/repository.ts:277-285`). Moving programme state off it turns a
    free field on an already-blocking read into a second request with its own loading
    surface — the largest hidden cost in shapes 4 and 5, and it is a client cost, not a
    schema one.
13. **The delete path is free and the demo-seed cascade guard has a gap.** A cascading FK
    costs nothing (`20260910000000_dbt_module.sql:7-8`), and the cascade assertion at
    `test/integration/db-functions.integration.test.ts:747-769` keys on `DEMO_SEED_TABLES`,
    not on "every table with a `user_id`".
14. **The export table-half is real but narrow.** It keys on the literal column name
    `user_id` in PostgREST's exposed `public` schema
    (`test/integration/export-user-data-completeness.integration.test.ts:189-200`). A table
    naming its owner column anything else, or not exposed over REST, passes every gate in
    the repo silently. Worth knowing, not worth exploiting.
15. **`src/features/dbt/use-dbt-program.ts` has no hook-level test.** CBT and ACT do.
    Whatever shape lands, DBT's write path is the one nothing catches.
16. **`docs/analytics.md` already states the observation three times and rules on it zero
    times** (`:247-256`, `:618-627`, `:794-812`). Shape 1's real work is converting a
    deferral into a decision, which is a smaller edit than it sounds and a larger
    commitment.

---

## 9. Not priced here

- **A client-side event library.** Out of scope on the map, and `docs/analytics.md:808-810`
  says the fix is "a change to what the app writes, not to what the report reads", so it is
  not an argument for one.
- **Whether a run frozen by the module gate (#2449) should be dated as such.** The map keeps
  this in "Not yet specified"; every recording shape inherits it, and no shape gets it free.
- **A "why did you leave?" free-text field.** It is the only thing that would make shape 5's
  encryption load-bearing. Nobody has proposed it, and it would carry its own
  data-minimisation and copy review.
- **The ADR number.** Map #2529 says next free is `0012` on `dev`, ☠️ re-derived at
  assembly time from `dev` _and_ open PRs, because #2452 on map #2445 is also writing one.

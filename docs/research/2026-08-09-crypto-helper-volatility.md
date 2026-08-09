# Crypto-helper volatility and parallel safety

Date: 2026-08-09 · Map: #808 · Tickets: #809 (research), #810 (measurement), #811 (audit)
· Origin: #706

Everything below was measured against the **local** Supabase instance
(PostgreSQL 17.6), never staging or production, on a seeded user with **1,460
journal entries** (~800-char bodies, 2 encrypted columns) and **1,460 mood logs**
(5 encrypted columns) — #706's own "heavy user" figure.

## Headline

**#706's central claim is false against the shipped schema, and has been since
June.** `app.decrypt_text` is **`STABLE`**, not `VOLATILE`. The projection pruning
it asks for already happens. The migration that did it —
`20260666_audit_phase2_fixes.sql`, items #15/#16, from the 2026-06-10 audit — cites
the same two planner guards #706 rediscovered, two months earlier.

#706 read the **superseded** original (`20260586_app_crypto_helpers.sql:36-44`,
which genuinely carries no marker) and never checked the live catalogue.
`20260666` re-declares the function with `stable` and runs
`alter function app.encryption_key() stable`.

Live catalogue (`pg_proc`), current:

| function                     | `provolatile`          | `proparallel` | `prosecdef` | `proleakproof` |
| ---------------------------- | ---------------------- | ------------- | ----------- | -------------- |
| `app.decrypt_text(bytea)`    | **`s` stable**         | `u` unsafe    | `t`         | `f`            |
| `app.encryption_key()`       | **`s` stable**         | `u` unsafe    | `t`         | `f`            |
| `app.encrypt_text(text)`     | `v` volatile — correct | `u` unsafe    | `t`         | `f`            |
| `extensions.pgp_sym_decrypt` | `i` immutable          | `s` safe      | `f`         | `f`            |
| `extensions.pgp_sym_encrypt` | `v` volatile           | `s` safe      | `f`         | `f`            |

pgcrypto declares `pgp_sym_decrypt` **IMMUTABLE and PARALLEL SAFE**, so the
`STABLE` wrapper is a defensible _narrowing_ (it is `app.encryption_key()`'s table
read that makes the pair stable-not-immutable), and `PARALLEL UNSAFE` on our
wrappers is purely the inherited `CREATE FUNCTION` default, not an inherited
property.

## Measured: what the STABLE marking is worth

Decrypt calls counted exactly via `pg_stat_user_functions` — which works here
precisely _because_ a `SECURITY DEFINER` function can never be inlined
(`inline_function()` refuses on `prosecdef`), so every call is its own countable
invocation.

| query                                                            | shipped (`STABLE`)   | reverted to `VOLATILE`    | factor  |
| ---------------------------------------------------------------- | -------------------- | ------------------------- | ------- |
| `countJournalEntries` — head count on the `journal_entries` view | **0 calls, 0.60 ms** | 2,920 calls, 980 ms       | ~1,600× |
| mood narrow projection — 3 plaintext cols from `mood_logs`       | **0 calls, 1.28 ms** | **7,300 calls**, 1,761 ms | ~1,400× |
| journal list — `select * … limit 50`                             | 100 calls, 33.9 ms   | 2,920 calls, 566 ms       | ~17×    |

Three things this settles:

1. **Projection pruning works.** Both zero-call rows are
   `remove_unused_subquery_outputs()` doing exactly what #706 said it would refuse
   to do for a volatile expression. The head count plans as an **Index Only Scan**
   with `Heap Fetches: 0` — it never touches the ciphertext at all.
2. **The view flattens.** The mood query's plan contains no subquery scan; it is a
   bare `Index Scan … on mood_logs_data`. `is_simple_subquery()` pulled it up.
3. **`LIMIT` is pushed below the decrypt.** 100 calls = 50 rows × 2 columns, not
   1,460 × 2. List-query decrypt cost scales with the page size, not the user's
   lifetime history. Under `VOLATILE` the same query pays 2,920 — the whole
   history — which is the regression `20260666` was written to fix.

The `VOLATILE` mood figure is **7,300 decrypt calls**, matching #706's predicted
figure exactly. Its _mechanism_ is correct in every detail. Only its claim about
the current state is wrong.

## RLS is unaffected

Under both markings the RLS policy still filtered correctly — the plans show
`Rows Removed by Filter: 2` (the other users' rows) and the `auth.uid()` InitPlan
in place. This is expected: qual ordering against security quals is governed by
**`LEAKPROOF`**, not by volatility, and `app.decrypt_text` is `proleakproof = f`
either way. Nothing about the volatility marking moves the RLS boundary, and
`decrypt_text` appears in the view's _target list_, not in a qual, so it is only
ever evaluated on rows that already passed the policy.

## Parallel safety: real in theory, worth nothing in practice

All three helpers are `PARALLEL UNSAFE` — the `CREATE FUNCTION` default, never
addressed by `20260666`. A parallel-unsafe function in a query's target list
forbids a parallel plan for that query outright.

**Forced-parallel synthetic aggregate** (`parallel_setup_cost=0`,
`min_parallel_table_scan_size=0`, `max_parallel_workers_per_gather=4`), summing
decrypted body lengths over 1,460 rows:

| marking           | plan                                                          | time (3 runs)      |
| ----------------- | ------------------------------------------------------------- | ------------------ |
| `PARALLEL UNSAFE` | `Aggregate → Seq Scan`                                        | 258 / 251 / 326 ms |
| `PARALLEL SAFE`   | `Finalize Aggregate → Gather (4 workers) → Parallel Seq Scan` | 88 / 82 / 84 ms    |

Identical result both ways (`sum = 1262660`). So the marking genuinely does gate
parallelism, worth ~3×.

**But the real RPC does not benefit at all.** `journal_word_total()` is the one
production function that decrypts in bulk. Called the way the app calls it, under
**default** planner settings:

| marking                     | time (3 runs)      |
| --------------------------- | ------------------ |
| `PARALLEL UNSAFE` (shipped) | 672 / 667 / 690 ms |
| `PARALLEL SAFE`             | 811 / 765 / 710 ms |

No improvement — if anything noise in the wrong direction. Two reasons, both
independent of our marking:

- `journal_word_total()` is **plpgsql** and gets its answer with `SELECT … INTO`.
  plpgsql passes a row-count limit to SPI, and a query executed with a count limit
  is not run in parallel. The function's own body can therefore never parallelise
  regardless of what the crypto helpers are marked.
- Even without that, a per-user read filtered on `user_id` plans as an **index
  scan**, and the ~3× above came from a _seq_ scan over a table that is, locally,
  almost entirely one user's rows. In production the table is shared across users,
  so the per-user path is the index, not the scan this test forced.

So: `PARALLEL SAFE` would be _semantically_ defensible (pgcrypto's own functions
are parallel safe; the helpers only read), but on present evidence it buys nothing
measurable on any real call path. That is the finding #813 needs.

## Inventory: reads against a decrypting view (#811)

82 reads across `src/**`, classified against the 38 decrypting views enumerated
from `pg_class` / `pg_get_viewdef` on the live schema:

| class                                      | count | decrypt cost                          |
| ------------------------------------------ | ----- | ------------------------------------- |
| head counts (`count: "exact", head: true`) | 9     | **0** — fully pruned                  |
| narrow projections                         | 4     | **0** — fully pruned                  |
| bounded `select("*")`                      | 58    | scales with the page cap, as intended |
| **unbounded reads**                        | 16    | scales with the user's whole history  |

Of the 16 unbounded, three are `mood_logs` narrow projections
(`repository.ts:159, :217`) that cost **0** because the projection is pruned. The
remaining ~14 are unbounded `select("*")`:

| enc/row | view                                                                                                                                                             | site                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 7       | `habits`                                                                                                                                                         | `src/features/habits/repository.ts:95`               |
| 4       | `act_value_entries`                                                                                                                                              | `src/features/act/repository/values.ts:37`           |
| 3       | `act_committed_actions`                                                                                                                                          | `src/features/act/repository/committed-action.ts:43` |
| 2       | `exposure_hierarchies`                                                                                                                                           | `src/features/exposure/repository.ts:89`             |
| 2       | `exposure_sessions`                                                                                                                                              | `src/features/exposure/repository.ts:186`            |
| 1       | `act_action_steps`, `breathing_exercises`, `exposure_items`, `milestones`, `habit_logs`, `stage_practice_notes`, `emotion_preferences`, `task_steps`, `routines` | see sweep                                            |

**Cost is `enc/row × expected row count`, and the two factors point opposite ways.**
`habits` has the worst per-row multiplier but a naturally small row count (a user
has tens of habits, not thousands). The one to watch is **`habit_logs`** — only 1
encrypted column, but one row per habit per day, so it is the only entry here whose
row count grows without bound. `routines` and `task_steps` are the same shape at
smaller slope. None of these is a _pruning_ problem — every one of them genuinely
selects `*` — so the fix, where one is wanted, is a row cap, not a projection change.

## Corrections this forces

1. **ADR-0001's clause is factually wrong** and was added only on 2026-08-08 (by
   #730, on #706's authority). It states `app.decrypt_text` "carries no volatility
   marker, so it is VOLATILE" and that "a clean projection buys nothing". Both are
   false. Fixed in this change.
2. **`sleep_stats()`'s move to `sleep_logs_data` (`20260808000000`) rests on a wrong
   justification.** The move is harmless and arguably still tidier, but it did not
   fix a real cost — the `notes` decrypt it was said to be paying was already being
   pruned. No action needed beyond not citing it as precedent.
3. **The comment above `countJournalEntries` is correct after all.** It says the head
   count "avoids fetching (and decrypting) full journal bodies". Measured: 0 decrypt
   calls. An earlier comment of mine on #706 claimed this comment was false — it is
   not; it was written before `20260666` and happens to have become true.

## Method notes for whoever repeats this

- `pg_stat_reset()` is denied to Supabase's `postgres` role (not a superuser), but
  `SET track_functions = 'all'` **is** allowed in-session. Take a before/after delta
  off `pg_stat_user_functions` and flush with `pg_stat_force_next_flush()`.
- Measure as `authenticated` with `request.jwt.claims` set, not as `postgres` —
  `postgres` bypasses RLS and produces a different plan shape.
- A faster query is not proof of pruning. Read the plan's `Output` lines, or count
  the calls. Both were done here.

# ADR-0001: When a stat may be row-derived, and when it must be server-aggregated

Date: 2026-07-28 · Status: accepted · Origin: #335 (map #331)

## Context

Four statistics shipped as client-side sums over a capped list query, and each
silently truncated the moment a heavy user outgrew the cap — while every suite
stayed green, because the numbers remained plausible:

| instance | surface                                                  | fixed by                                          |
| -------- | -------------------------------------------------------- | ------------------------------------------------- |
| #293     | journal lifetime word total over `useJournalEntries(50)` | `journal_word_total()` RPC (PR #322)              |
| #256     | eight sleep-tracker aggregates over `useSleepLogs(50)`   | `sleep_stats(p_time_zone)` RPC (`20260731100000`) |
| #323     | Home journal-week stats                                  | exact lifetime totals (PR #392)                   |
| #337     | meditation median minutes                                | `meditation_median_minutes()` RPC                 |

The failure is invisible by construction: a truncated "lifetime longest night"
is a perfectly believable number, and the exact hero count
(`select … count head`) can sit beside it disagreeing quietly.

## Decision

**A statistic may be derived from fetched rows only inside a window the row
cap covers under a stated logging-rate bound — and the statement must be
honest about whether that bound is _enforced_ or _assumed_.** Nothing in the
schema caps how often a user logs, so most bounds are assumptions; an
assumption is acceptable only when it is written where the cap lives together
with its failure mode (silent truncation past the bound) and the blast radius
is accepted. (Live example: the Home sleep widget and the OS-widget snapshot
renderer derive 7-day figures from a 30-row query under an **assumed** bound
of ~4 sleeps per day. A user logging more than 30 sleeps in 7 days truncates
those two widget averages — accepted because the tracker's own figures come
from the RPC and self-correct, and the widget is a glance surface. A stat
whose truncation would not be acceptable does not qualify for an assumed
bound; use the server.)

**Every other statistic — anything lifetime, anything windowed beyond what the
cap covers, anything whose window is user-visible as "all time" — is
server-aggregated**, by one of two sanctioned mechanisms.

**Exact filtered counts need no function**: a PostgREST `head` count
(`select("…", { count: "exact", head: true })` with filters) is already an
exact server-side answer under RLS — `countJournalEntries`,
`countSleepLogs`, `countGratitudeEntries` and the #323 fix are the precedent.
A lifetime or windowed _row count_ uses this and stops; writing an RPC for a
count would add a migration to reimplement something PostgREST already does
exactly.

**Everything beyond a count — sums, averages, medians, buckets, extremes —
is a SQL function**, shaped like this:

- a **`stable`, `security invoker` SQL function**, filtered on `auth.uid()`
  belt-and-braces on top of RLS, with the #322 grant shape (`revoke all … from
public; revoke execute … from anon; grant execute … to authenticated; notify
pgrst, 'reload schema';`);
- **reading the decrypting view, with an honest projection.** `app.decrypt_text`
  and `app.encryption_key()` are **`STABLE`** — `20260666_audit_phase2_fixes.sql`
  items #15/#16 marked them so, and only `app.encrypt_text` is genuinely VOLATILE
  (`pgp_sym_encrypt` salts each call). Because they are stable the planner both
  flattens the view (`is_simple_subquery()`) and prunes unused output expressions
  (`remove_unused_subquery_outputs()`), so **a narrow projection costs nothing and
  a `LIMIT` is pushed below the decrypt**. Measured on 1,460 journal entries and
  1,460 mood logs (local PG 17.6, decrypt calls counted via
  `pg_stat_user_functions` — a `SECURITY DEFINER` function is never inlined, so
  every call is countable):

  | read                                            | decrypt calls           | time    |
  | ----------------------------------------------- | ----------------------- | ------- |
  | `head` count on `journal_entries`               | **0** (Index Only Scan) | 0.60 ms |
  | 3 plaintext cols from `mood_logs` (5 encrypted) | **0**                   | 1.28 ms |
  | `select * … limit 50` from `journal_entries`    | 100 = 50 rows × 2 cols  | 33.9 ms |

  Reverting the marking to VOLATILE locally reproduces the pathology those markers
  exist to prevent — the same three reads cost 2,920 / 7,300 / 2,920 calls and
  980 / 1,761 / 566 ms. **So an exact `head` count on an encrypted table really is
  cheap, and `journal_word_total()` is right to read `journal_entries` for `body`.**
  Reading a `*_data` base table instead is a legitimate simplification when no
  plaintext is wanted at all — it is not a performance requirement, and
  `sleep_stats()`'s move to `sleep_logs_data` in `20260808000000` should not be
  cited as though it were one. What _does_ still cost is an **uncapped** read of a
  decrypting view, whose decrypt count scales with the user's whole history; cap it.
  RLS is unaffected by any of this: the policy lives on the base table,
  `security_invoker` is only how a view reaches it, and qual ordering against
  security quals is governed by `LEAKPROOF`, not by volatility. Detail and method:
  `docs/research/2026-08-09-crypto-helper-volatility.md` (#706, map #808);

- **never a persisted derived column on an encrypted table** — that would
  thread derived data through the encrypted write-path triggers and store it
  beside ciphertext it was derived from;
- **day-scoped windows walk civil days** (captured occurrence offset), and the
  one thing SQL cannot know — the viewer-local fallback for rows whose offset
  was never captured, and the viewer's "today" for the window end — arrives as
  an **IANA zone-name parameter** (`p_time_zone`), resolved per row instant so
  DST cannot misbucket (#333, #401). A fixed numeric offset is wrong across
  DST boundaries; nothing about the zone is stored;
- **rounding stays in TypeScript**: SQL returns exact `numeric`, the client
  applies the same `Math.round`/`roundTo1` as its row-derived siblings, so the
  two cannot drift on a `.5` tie (`round(numeric)` rounds half away from zero,
  `round(double precision)` ties to even, `Math.round` breaks upward).

**The parity obligation.** Any statistic expressed in both JS and SQL gets an
integration test pinning the two implementations to each other on seeded rows.
This is not optional hardening: PR #322 nearly shipped a `\s`-vs-`btrim`
whitespace mismatch that JS-only unit tests were structurally unable to catch
— the parity test class exists because review caught what the suites could
not. (`test/integration/journal-word-total.integration.test.ts`,
`sleep-stats.integration.test.ts`, `meditation-median-minutes.integration.test.ts`.)

A hybrid is the normal shape, not a compromise: the RPC carries the aggregates
while charts and lists that genuinely need rows keep reading the capped query
— the sleep tracker's 14-night chart deliberately stays on `useSleepLogs(50)`
because 14 night keys sit far inside that cap's worst case.

## Consequences

- Adding a stat to a surface starts with one question: _does the row cap
  cover this window under a bound I can enforce or honestly assume — with
  truncation past it acceptable?_ No ⇒ head count if it is a count, else RPC
  - migration + parity test, and the client keeps its fallback while the
    migration rolls out.
- Cache shape: the stats query lives under the same feature query-key root as
  the list it summarizes, so existing save/delete invalidation reaches both
  (`useSleepStats` under the `sleep` root is the precedent).
- The rule governs future surfaces; it does not retroactively rewrite
  row-derived stats whose window/cap justification holds.

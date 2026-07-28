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

**A statistic may be derived from fetched rows only inside a window the row cap
provably covers, with the cap justified against a worst-case logging rate —
not a typical one.** Write the justification where the cap lives. (Live
example: the Home sleep widget and the OS-widget snapshot renderer derive
7-day figures from a 30-row query; 7 night keys fit 30 rows at the stated
worst case of 4 sleeps per day.)

**Every other statistic — anything lifetime, anything windowed beyond what the
cap covers, anything whose window is user-visible as "all time" — is
server-aggregated**, by this mechanism:

- a **`stable`, `security invoker` SQL function over the decrypting view**,
  filtered on `auth.uid()` belt-and-braces on top of RLS, with the #322 grant
  shape (`revoke all … from public; revoke execute … from anon; grant execute
… to authenticated; notify pgrst, 'reload schema';`);
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
  provably cover this window at the worst-case rate?_ No ⇒ RPC, migration,
  parity test, and the client keeps its fallback while the migration rolls
  out.
- Cache shape: the stats query lives under the same feature query-key root as
  the list it summarizes, so existing save/delete invalidation reaches both
  (`useSleepStats` under the `sleep` root is the precedent).
- The rule governs future surfaces; it does not retroactively rewrite
  row-derived stats whose window/cap justification holds.

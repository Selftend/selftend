# ADR-0002: The sleep window is encrypted; its duration and calendar day are not

Date: 2026-08-11 · Status: accepted · Origin: #800 (map #771)

## Context

A sleep entry may now opt into a **sleep window**: estimated `Sleep started` and
`Sleep ended` bounds, each with the UTC offset captured at that bound
(`20260811000000_sleep_window.sql`). Exact sleep timing is health-adjacent
behavioural data — when someone is unconscious in bed, every night, is more
sensitive than the fact that they slept about seven hours. The base table also
needs _something_ about timing in plaintext, because two existing behaviours
read timing server-side without decrypting: `sleep_stats()` buckets entries by
civil day (ADR-0001 forbids doing that client-side over a capped list), and the
all-history screen orders by a stable key for keyset paging.

This trade-off is hard to reverse once user data exists, and surprising without
its context — hence this record.

## Decision

- **Exact bounds and both captured offsets are encrypted together** as one JSON
  payload in `sleep_logs_data.window_enc`, through the existing application
  encryption boundary (Vault key, `app.encrypt_text`/`app.decrypt_text`). One
  ciphertext rather than four columns, so the decrypting view pays one VOLATILE
  `decrypt_text` call per row, not four (#706 is the precedent for why that
  matters).
- **`duration_minutes` stays plaintext**, as it always was: `sleep_stats()`
  aggregates it for every figure on the tracker, and a duration reveals _how
  long_, not _when_.
- **`entry_day` (new) is plaintext and database-derived**: the civil date at
  sleep start in its captured frame for windowed entries, the existing
  captured-day calculation otherwise. It is a coarse calendar key — not user
  input, not a unique night identity — and it exists precisely so day-scoped
  statistics and paged ordering never decrypt exact timing. Resolution is one
  day; the window's minutes stay inside the ciphertext.
- **Server-side exact-timing analytics are deliberately unavailable.** No RPC
  can aggregate bedtimes, wake times, midpoints, or regularity, because the
  server cannot read them. If such a feature is ever wanted, it must be computed
  client-side from decrypted rows the user already owns — or this ADR must be
  explicitly superseded.
- **Legacy duration-only entries remain valid indefinitely.** A window is an
  opt-in addition; no existing row is reinterpreted, no window is ever guessed
  from "now minus duration", and switching an entry back to duration-only
  deletes the ciphertext rather than retaining hidden exact times.
- **The write path derives duration from the bounds and rejects contradiction**:
  a windowed entry whose `duration_minutes` disagrees with its own bounds is a
  `check_violation`, so the stored duration can never disagree with what the
  user was shown.

## Consequences

- `export_user_data()` includes `entry_day` and the decrypted `sleep_window`
  payload — stored user fields never silently disappear from export.
- For never-captured-offset legacy rows, stored `entry_day` uses a UTC fallback
  while clients keep rendering those rows on the viewer's local day (their
  existing behaviour). The stored value only drives ordering — where a one-day
  divergence is invisible next to the `created_at` tie-break — never display.
- `sleep_stats()` buckets windowed rows by `entry_day` (`window_enc is not
null` is the mode marker and costs no decrypt); duration-only rows keep the
  `p_time_zone` behaviour they always had.

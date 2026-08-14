-- Performance: index the (user_id, <timestamp>) orderings Home's tool rows now read (#990).
--
-- Home renders fourteen one-line stats, eleven of them a single timestamp. Those used to
-- come from each tool's full list query - `select("*")` at limit 500 over a decrypting
-- view, for one `created_at`. They are now one-row narrow-projection reads, which removes
-- the decryption entirely (ADR-0001: a projection naming no encrypted column costs zero
-- `app.decrypt_text` calls, and the LIMIT pushes below the decrypt when the ordering is
-- plaintext). This migration is the other half of that: without a matching index the
-- one-row read still seq-scans every user's rows and sorts them before taking one.
--
-- Same shape and rationale as 20260567_perf_indexes.sql - each index column matches the
-- actual ORDER BY of the read it serves. All indexes live on the `_data` base tables,
-- since the same-named public objects are decrypting views. Idempotent, additive, no
-- data change.
--
-- Plain CREATE INDEX rather than CONCURRENTLY: the latter cannot run inside a transaction
-- block, which is how migrations are applied, and these tables are small enough that the
-- SHARE lock is momentary. Verified against a local `supabase migration up`; each read
-- below plans as an Index Only Scan, so it never touches the heap the ciphertext lives in.

-- thought_records: the newest record WRITTEN, so created_at - the existing
-- thought_records_user_updated_idx serves the list's updated_at ordering and cannot
-- serve this one. Partial on the same `archived_at is null` predicate the read filters
-- by, which is also every other read of this table.
-- INCLUDE carries the captured offset the row renders with, so the read is answered
-- index-only and never touches the heap (where the ciphertext lives).
create index if not exists thought_records_user_created_idx
  on public.thought_records_data (user_id, created_at desc)
  include (created_offset_minutes)
  where archived_at is null;

-- activity_logs: the newest COMPLETION. activity_logs_user_scheduled_idx orders by
-- scheduled_at, which is a different question. This also serves listRecentCompletedActivities
-- (completed_at desc, limit 250), which the routines derive engine runs and which had no
-- index of its own.
create index if not exists activity_logs_user_completed_idx
  on public.activity_logs_data (user_id, completed_at desc)
  include (completed_offset_minutes);

-- self_care_logs: dated by created_at, not the log_date that self_care_logs_user_log_date_idx
-- covers - a back-dated log written today is the newest activity but not the newest day.
create index if not exists self_care_logs_user_created_idx
  on public.self_care_logs_data (user_id, created_at desc);

-- The ACT tables shipped with no indexes at all, so even their existing 30-row list reads
-- seq-scan every user's rows. One (user_id, created_at desc) each serves both those and
-- the new one-row reads.
create index if not exists act_observing_self_sessions_user_created_idx
  on public.act_observing_self_sessions_data (user_id, created_at desc);
create index if not exists act_choice_points_user_created_idx
  on public.act_choice_points_data (user_id, created_at desc);
create index if not exists act_defusion_logs_user_created_idx
  on public.act_defusion_logs_data (user_id, created_at desc);
create index if not exists act_expansion_logs_user_created_idx
  on public.act_expansion_logs_data (user_id, created_at desc);

-- Connection logs are read both unfiltered (the list) and filtered by technique (Home's
-- drop-anchor row), so technique sits between the two so the filtered read is a single
-- index probe; the unfiltered list still gets its user scoping from the leading column.
create index if not exists act_connection_logs_user_technique_created_idx
  on public.act_connection_logs_data (user_id, technique, created_at desc);

-- Committed actions are counted by status, and their list read has no LIMIT at all.
create index if not exists act_committed_actions_user_status_idx
  on public.act_committed_actions_data (user_id, status);

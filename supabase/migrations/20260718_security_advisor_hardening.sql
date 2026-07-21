-- Non-blocking security-advisor cleanups from the 2026-07-18 pre-release review.
-- Neither is exploitable; both silence Supabase security-advisor findings and harden defaults.

-- 1. Remove `anon`'s execute grant on record_feedback_submission().
--    Prod was provisioned on an older Supabase image whose default privileges granted execute
--    to `anon` directly, so the `revoke ... from public` in
--    20260563_feedback_rate_limit_fixed_threshold.sql never removed anon's own grant. Not
--    exploitable - the function raises `Not authenticated` on a NULL auth.uid() before doing
--    anything - but the lingering grant trips the advisor. REVOKE is inherently idempotent, so
--    this is a no-op on images where anon never held the grant.
revoke execute on function public.record_feedback_submission() from anon;

-- 2. Pin a fixed search_path on the updated_at trigger helper. It only calls pg_catalog
--    functions (timezone/now), so an empty search_path is sufficient and closes the advisor's
--    mutable-search_path finding.
alter function public.set_current_timestamp_updated_at() set search_path = '';

-- Meditation sessions are about to bucket by the civil day they were sat on
-- (#330), not the viewer's current local day, so "I sat on Tuesday" stays
-- Tuesday after travel. This is the cheapest instance in that workstream and the
-- template the remaining four copy: `meditation_sessions` is not encrypted, so
-- there is no `_data` table to alter, no view to re-list and no
-- `zz_*_occurrence` trigger to add - one column, written directly by the client
-- alongside the instant it belongs to.
--
-- NULLABLE, NO DEFAULT, NO BACKFILL. This is the whole lesson of
-- 20260726_occurrence_offset_nullable: `not null default 0` made every
-- pre-existing row assert "logged at UTC", which is indistinguishable from a
-- guess, and had to be undone before the offset could be trusted at all. Null
-- means "not captured" instead, and `entryDayKey` (src/lib/occurrence-time.ts)
-- falls back to the viewer's local day for it - which is precisely where those
-- rows render today, so nothing moves on deploy. From here on a stored 0 is only
-- ever written by a client that explicitly sent it, so it means what it says.
--
-- The check is satisfied by null, so it constrains real values without blocking
-- "unknown"; +/-840 minutes is the widest real UTC offset (+/-14:00).
alter table public.meditation_sessions
  add column if not exists completed_offset_minutes smallint
    check (completed_offset_minutes between -840 and 840);

notify pgrst, 'reload schema';

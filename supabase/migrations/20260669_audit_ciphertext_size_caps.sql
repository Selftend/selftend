-- ============================================================================
-- Full-audit (2026-06-10) — #90 (+ #41, #42): un-bypassable ciphertext size caps.
--
-- The free-text length caps added in 20260570 were CHECK constraints on the
-- PLAINTEXT columns; the drop_plaintext migrations dropped those columns, taking
-- the constraints with them. The replacement char_length/array_length validation
-- now lives ONLY inside the INSTEAD OF triggers on the decrypting views — which an
-- authenticated user bypasses entirely by POSTing straight to /rest/v1/<table>_data
-- (the security_invoker views require the invoker to hold base-table privileges, so
-- the base `_data` grants cannot be revoked). That lets a user write arbitrarily
-- large *_enc bytea, re-opening the bloat/DoS vector 20260570 closed (#90), and the
-- same hole un-bounds the encrypted text[] columns (#41) and the encrypted free-text
-- columns that never had a trigger guard at all — sleep notes, challenge_description,
-- task_steps.description, exposure_sessions notes/safety_behavior, stage practice
-- notes, mindfulness reflections (#42).
--
-- The durable, un-bypassable fix is a base-table CHECK on the CIPHERTEXT size, which
-- survives direct base-table writes. We apply ONE generous uniform ceiling (128 KiB)
-- to every user-entered *_enc column rather than per-field caps: the trigger guards
-- already bound the normal path tightly per field, so this is purely the backstop
-- against gross (multi-megabyte) abuse via the bypass. 128 KiB sits comfortably above
-- the largest legitimate value — journal body is char-capped at 20000, i.e. <= ~82 KB
-- of ciphertext even in worst-case 4-byte UTF-8 — while a single field can no longer
-- absorb a multi-MB blob. A uniform cap also lets this be a deterministic, idempotent
-- loop over the live *_enc columns with no risk of a mis-sized per-column cap silently
-- rejecting a legitimate write. NOT VALID so it never fails on a pre-existing row;
-- enforced on every insert/update going forward.
--
-- NOT LOCALLY VERIFIED (no local Postgres); validated + applied + advisor-checked
-- against the live project.
-- ============================================================================

do $$
declare
  c record;
  cname text;
begin
  for c in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type = 'bytea'
      and column_name like '%\_enc'
    order by table_name, column_name
  loop
    cname := c.table_name || '_' || c.column_name || '_size';
    if not exists (select 1 from pg_constraint where conname = cname) then
      execute format(
        'alter table public.%I add constraint %I check (octet_length(%I) <= 131072) not valid',
        c.table_name, cname, c.column_name
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

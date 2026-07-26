-- Exact lifetime word total for the journal hero stat (#293).
--
-- The client list query is capped at 50 entries, so summing bodies on the device silently
-- became a "recent 50" figure once a heavy writer passed the cap - the hero read as a
-- lifetime total but wasn't. `journal_entry_count` already solved the sibling entries stat
-- the same way.
--
-- Counting server-side keeps the number exact without shipping (and decrypting) every body
-- to the device, and stores nothing new: the count is derived per call from the same
-- decrypting view the client already reads, so no new field lands on an encrypted table
-- and the encrypted write path is untouched.
create or replace function public.journal_word_total()
returns bigint
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  total bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Mirrors countWords() in src/features/journal/word-count.ts: trim, then split on runs of
  -- whitespace. A blank body counts as zero words rather than one (regexp_split_to_array
  -- returns a single empty element for an empty string). Reading through the security_invoker
  -- view means the caller's RLS applies; the user_id filter is belt and braces.
  select coalesce(
           sum(
             case
               when btrim(body, E' \t\n\r\f\v') = '' then 0
               else coalesce(
                 array_length(
                   regexp_split_to_array(btrim(body, E' \t\n\r\f\v'), '\s+'),
                   1
                 ),
                 0
               )
             end
           ),
           0
         )
    into total
    from public.journal_entries
   where user_id = uid;

  return total;
end;
$$;

revoke all on function public.journal_word_total() from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.journal_word_total() from anon;
grant execute on function public.journal_word_total() to authenticated;

notify pgrst, 'reload schema';

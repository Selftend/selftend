-- Exact lifetime word total for the journal hero stat (#293).
--
-- The client list query is capped at 50 entries, so summing bodies on the device silently
-- became a "recent 50" figure once a heavy writer passed the cap - the hero read as a
-- lifetime total but wasn't. The sibling entries stat was already counted server-side, by
-- `countJournalEntries()` in src/features/journal/repository.ts (an exact PostgREST head
-- count); this is the same move for words, which need an aggregate rather than a count.
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
  -- whitespace. Trimming with the same `\s` class the split uses is what keeps the two in
  -- step - an ASCII-only btrim leaves a Unicode space (NBSP, U+2028, ideographic) sitting at
  -- the edge, which `\s+` then splits into an empty leading/trailing element and inflates the
  -- count by one per side. A blank body counts as zero words rather than one, since
  -- regexp_split_to_array returns a single empty element for an empty string.
  -- Reading through the security_invoker view means the caller's RLS applies; the user_id
  -- filter is belt and braces.
  select coalesce(
           sum(
             case
               when trimmed.body = '' then 0
               else coalesce(array_length(regexp_split_to_array(trimmed.body, '\s+'), 1), 0)
             end
           ),
           0
         )
    into total
    from public.journal_entries as entry
    cross join lateral (
      select regexp_replace(entry.body, '^\s+|\s+$', '', 'g')
    ) as trimmed (body)
   where entry.user_id = uid;

  return total;
end;
$$;

revoke all on function public.journal_word_total() from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.journal_word_total() from anon;
grant execute on function public.journal_word_total() to authenticated;

notify pgrst, 'reload schema';

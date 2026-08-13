-- Two write functions for widget_preferences, replacing two client read-then-write paths (#974).
--
-- Sequenced after 20260813000000 (the id collapse) on the same day: the version is
-- 20260813010000 so neither version is a prefix of the other and they cannot collide.
--
-- No schema change. Same table, same columns, same UNIQUE (user_id, widget_id), same RLS
-- policy. Both functions are `security invoker`, so the caller's own
-- "Users manage their own widget preferences" policy scopes every row they touch; the
-- explicit `user_id = uid` filters are belt and braces on top of that, exactly as in
-- 20260707_apply_widget_recommendations.sql.
--
--
-- 1. add_widget_preference(p_widget_id)
--
-- The client computed the next position by reading the list, taking `max(position) + 1`
-- and writing it back (`useAddWidget` in src/features/home/queries.ts). Two adds racing
-- each other read the same maximum and wrote the same position - the collision the
-- `created_at` tiebreak in `listWidgetPreferences` existed to paper over.
--
-- Computing `coalesce(max(position), -1) + 1` inside the INSERT closes the client-side
-- half of that race but NOT the server-side half: under READ COMMITTED two concurrent
-- transactions each take a snapshot before either commits, so both still see the same
-- maximum. One statement is not one serialization point. So the function takes a
-- transaction-scoped advisory lock keyed on the caller first, which makes concurrent adds
-- for the same user queue instead of interleave. READ COMMITTED takes a fresh snapshot per
-- statement, so the INSERT that runs after the lock is granted sees the row the previous
-- holder committed. (PostgREST runs at READ COMMITTED; under REPEATABLE READ the second
-- transaction would see its old snapshot and fail differently - it does not run there.)
--
-- The lock is per user, not global: two different users adding widgets never wait on each
-- other. `on conflict do nothing` keeps the call idempotent, matching the
-- `ignoreDuplicates` upsert it replaces.
--
--
-- 2. set_widget_order(p_widget_ids)
--
-- The client wrote positions 0..n-1 over the ids it named. That is a whole-list rewrite
-- dressed as a reorder: when the caller holds a filtered view of the list (and Home does -
-- `use-visible-widget-ids` drops ids the renderer suppresses) the unnamed rows keep stale
-- positions that the named rows have just been renumbered on top of.
--
-- This function instead collects the positions the named ids CURRENTLY HOLD, sorts them,
-- and hands them back out in the caller's order. The multiset of positions is preserved
-- exactly, so a row the caller did not name cannot move and cannot be landed on. Reorder
-- within a subset becomes the only expressible operation, which is what a renderer that
-- partitions one ordered list into tiers can actually honour.
--
-- Named ids the caller does not own are ignored rather than rejected: the set of ids a
-- client can name is its own rendered list, so an unowned id is a client bug, not a
-- user-visible condition, and failing the whole reorder over one stale id would lose a
-- real gesture. Duplicate ids in the array collapse to their first occurrence, as in
-- apply_widget_recommendations.
--
--
-- 3. The one-time renumber below
--
-- Dropping the `created_at` tiebreak from `listWidgetPreferences` is only safe once no
-- user holds two rows at the same position - otherwise the order between them stops being
-- deterministic, which is precisely what the tiebreak was covering. Rows written before
-- this migration were positioned by the racy client path, so the data has to be repaired
-- in the same change that removes the cover.
--
-- The renumber orders by `(position, created_at, widget_id)` - which IS the ordering the
-- tiebreak produced - so it cannot change any user's visible order. It only makes the
-- positions contiguous from 0 and distinct. `widget_id` is the final key so the result is
-- deterministic even for two rows sharing a position AND a `created_at`.

-- One-time repair of legacy duplicate/gapped positions. Idempotent: re-running it is a
-- no-op once positions are already 0..n-1 in this order.
with renumbered as (
  select
    id,
    (row_number() over (
      partition by user_id
      order by position, created_at, widget_id
    ))::integer - 1 as new_position
  from public.widget_preferences
)
update public.widget_preferences as preference
   set position = renumbered.new_position
  from renumbered
 where renumbered.id = preference.id
   and preference.position is distinct from renumbered.new_position;

create or replace function public.add_widget_preference(p_widget_id text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_widget_id is null or btrim(p_widget_id) = '' or char_length(p_widget_id) > 100 then
    raise exception 'Invalid widget id';
  end if;

  -- Serialize concurrent adds for this user only; released at transaction end.
  -- See the header: without it, one statement is still two snapshots.
  perform pg_advisory_xact_lock(hashtextextended('widget_preferences_order:' || uid::text, 0));

  insert into public.widget_preferences (user_id, widget_id, position)
  select uid, p_widget_id, coalesce(max(existing.position), -1) + 1
    from public.widget_preferences as existing
   where existing.user_id = uid
  on conflict (user_id, widget_id) do nothing;
end;
$$;

create or replace function public.set_widget_order(p_widget_ids text[])
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  widget_ids text[] := coalesce(p_widget_ids, array[]::text[]);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if cardinality(widget_ids) > 100 then
    raise exception 'Too many widgets';
  end if;
  if exists (
    select 1
      from unnest(widget_ids) as named(widget_id)
     where named.widget_id is null
        or btrim(named.widget_id) = ''
        or char_length(named.widget_id) > 100
  ) then
    raise exception 'Invalid widget id';
  end if;

  if cardinality(widget_ids) = 0 then
    return;
  end if;

  -- Serializes reorder against reorder. Two concurrent reorders would otherwise each
  -- plan against their own snapshot of the held positions and the later one would write
  -- a permutation of a list that no longer exists.
  --
  -- It is the same key as the add path, but the two paths do not actually contend:
  -- reordering is max-preserving (it only redistributes positions that already exist),
  -- so a concurrent add's `max(position) + 1` is correct either way. Sharing the key
  -- costs nothing and keeps the ordering of a single user's writes easy to reason about.
  perform pg_advisory_xact_lock(hashtextextended('widget_preferences_order:' || uid::text, 0));

  with requested as (
    -- Duplicate ids collapse to their first occurrence.
    select named.widget_id, min(named.ordinality) as requested_rank
      from unnest(widget_ids) with ordinality as named(widget_id, ordinality)
     group by named.widget_id
  ),
  owned as (
    -- Only rows the caller actually holds; unowned ids drop out here.
    select
      preference.widget_id,
      preference.position,
      row_number() over (order by requested.requested_rank) as target_rank
      from public.widget_preferences as preference
      join requested on requested.widget_id = preference.widget_id
     where preference.user_id = uid
  ),
  slots as (
    -- The positions those rows already hold, in ascending order. Nothing else is
    -- available to assign, which is what makes unnamed rows unreachable.
    select owned.position, row_number() over (order by owned.position) as slot_rank
      from owned
  ),
  assignment as (
    select owned.widget_id, slots.position
      from owned
      join slots on slots.slot_rank = owned.target_rank
  )
  update public.widget_preferences as preference
     set position = assignment.position
    from assignment
   where preference.user_id = uid
     and preference.widget_id = assignment.widget_id
     and preference.position is distinct from assignment.position;
end;
$$;

revoke all on function public.add_widget_preference(text) from public;
revoke all on function public.set_widget_order(text[]) from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.add_widget_preference(text) from anon;
revoke execute on function public.set_widget_order(text[]) from anon;
grant execute on function public.add_widget_preference(text) to authenticated;
grant execute on function public.set_widget_order(text[]) to authenticated;

notify pgrst, 'reload schema';

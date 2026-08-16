-- #986. `widget_preferences.position` has no uniqueness guarantee outside the two write
-- functions added in 20260813010000, and the `created_at` tiebreak that used to make the
-- read total regardless is gone. Two rows sharing a position now have no defined order at
-- all: the list can reshuffle between reads with no write in between.
--
-- No schema change. Same table, same columns, same UNIQUE (user_id, widget_id), same RLS
-- policy.
--
--
-- Why not UNIQUE (user_id, position)
--
-- It is the obvious fix and it is the one this migration does NOT take. A plain unique
-- constraint is impossible - `set_widget_order` swaps positions inside a single UPDATE,
-- which transiently collides - so it would have to be DEFERRABLE INITIALLY DEFERRED,
-- turning every colliding write into a commit-time error.
--
-- The blocker is that we cannot audit every writer. Builds up to v0.13.x are still
-- installed, there is no OTA channel to retire them, and they write `position` directly:
-- their reorder rewrites 0..n-1 over the ids it can see, while rows the renderer
-- suppressed keep positions in that same range. That is the defect #974 fixed, and under
-- a deferred constraint it stops being "the order sometimes looks wrong" and becomes "the
-- drag fails with a 409". Enforcing the invariant would break the clients that violate it
-- most, which is the wrong trade while those clients are the shipped ones.
--
-- So this migration closes the route it can close outright, and makes the route it cannot
-- close self-repairing instead of permanent.
--
--
-- 1. apply_widget_recommendations takes the per-user advisory lock
--
-- It writes its own contiguous run of positions but never took the lock
-- `add_widget_preference` uses, so the two did not mutually exclude. Interleaved on one
-- account across two devices - an add in flight while the suggestions wizard commits - the
-- add's `max(position) + 1` is computed against a snapshot the wizard has since replaced,
-- and can land on a position the wizard just wrote. Taking the same key first thing makes
-- the two queue instead of interleave; READ COMMITTED then gives each statement after the
-- lock a fresh snapshot, so whichever runs second sees what the first committed.
--
-- It is the same key both other functions use, so there is no lock ordering to get wrong.
--
-- Note for anyone who goes looking for the test: there is not one, and that is deliberate
-- rather than an oversight. Part 2 below repairs a duplicate on the next add, so route 1's
-- damage is already transient without this lock, and no observation available through
-- PostgREST tells a locked build from a lock-free one - measured, not assumed. The lock
-- earns its line by preventing the bad state rather than healing it afterwards; it is
-- reasoned, not covered.
--
--
-- 2. normalize_widget_positions() - and every write path calling it
--
-- RLS is `FOR ALL USING (auth.uid() = user_id)`, so a client can still write `position`
-- itself. Nothing stops a duplicate arriving that way, and until now nothing repaired one:
-- `set_widget_order` deliberately preserves the multiset of positions, so a duplicate it
-- inherited was handed straight back out. A duplicate that arrived was permanent. The
-- whole-list `0..n-1` rewrite that #974 removed used to heal duplicates as a side effect,
-- and that healing went with it.
--
-- This restores the healing without restoring the bug that made it necessary. The old
-- client-side rewrite was unsafe because the CLIENT held a filtered list and renumbered it
-- as if it were the whole thing. Done server-side over every row the user owns, ordered by
-- what the rows already say, a renumber cannot move anything relative to anything - it
-- only makes positions distinct and closes gaps.
--
-- The ordering is `(position, created_at, widget_id)`, which is exactly the order the read
-- returns (see `listWidgetPreferences`). That equality is the point: healing is invisible,
-- so a dashboard never reshuffles when a duplicate is repaired. `widget_id` is the final
-- key so the result is deterministic even for two rows sharing a position AND a
-- `created_at`. It is guarded by `widget-order-functions.integration.test.ts`, which reads
-- the list before and after a heal and compares the two.
--
-- Idempotent - `position is distinct from` means a list that is already 0..n-1 in this
-- order updates zero rows, which is the normal case on every add and every reorder.
--
-- Consequence worth stating: an unnamed row's guarantee under `set_widget_order` is now
-- that its RANK is untouched, not its literal position value, because healing may close a
-- gap beneath it. Nothing reads the value except as an ordering key.

-- The advisory lock key, in one place. Four functions now serialize on it, and the failure
-- mode of writing it out four times is silent in a way tests cannot reach: two writers
-- computing DIFFERENT keys still both "take a lock" and simply stop excluding each other.
-- Nothing observable distinguishes that from correct locking. Each writer still calls
-- `pg_advisory_xact_lock` visibly at its own call site - only the key derivation moves.
create or replace function public.widget_order_lock_key(p_user_id uuid)
returns bigint
language sql
immutable
set search_path = pg_catalog, public
as $$
  select hashtextextended('widget_preferences_order:' || p_user_id::text, 0);
$$;

create or replace function public.normalize_widget_positions()
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

  -- Held for the rest of the transaction. Re-requesting a lock this session already holds
  -- always succeeds, so callers that took it themselves are unaffected; the request here
  -- is for the case where this function is called on its own.
  perform pg_advisory_xact_lock(public.widget_order_lock_key(uid));

  with renumbered as (
    select
      id,
      (row_number() over (order by position, created_at, widget_id))::integer - 1 as new_position
      from public.widget_preferences
     where user_id = uid
  )
  update public.widget_preferences as preference
     set position = renumbered.new_position
    from renumbered
   where renumbered.id = preference.id
     and preference.user_id = uid
     and preference.position is distinct from renumbered.new_position;
end;
$$;

-- Unchanged from 20260813010000 except for the normalize call: any duplicate already in
-- the list is repaired before `max(position) + 1` is read off it, so the appended row
-- cannot be handed a position a healed row is about to take.
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
  -- Without it, one statement is still two snapshots (see 20260813010000).
  perform pg_advisory_xact_lock(public.widget_order_lock_key(uid));

  perform public.normalize_widget_positions();

  insert into public.widget_preferences (user_id, widget_id, position)
  select uid, p_widget_id, coalesce(max(existing.position), -1) + 1
    from public.widget_preferences as existing
   where existing.user_id = uid
  on conflict (user_id, widget_id) do nothing;
end;
$$;

-- Unchanged from 20260813010000 except for the normalize call. The multiset of positions
-- is still preserved exactly - it is just preserved from the NORMALIZED list rather than
-- from whatever a direct client write left behind, so the slots handed out are distinct.
-- Unnamed rows still cannot be landed on: named rows only ever receive positions that
-- named rows hold.
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

  -- Still a strict no-op: naming nothing writes nothing, healing included.
  if cardinality(widget_ids) = 0 then
    return;
  end if;

  -- Serializes reorder against reorder, and now against the suggestions wizard too.
  perform pg_advisory_xact_lock(public.widget_order_lock_key(uid));

  perform public.normalize_widget_positions();

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
    -- available to assign, which is what makes unnamed rows unreachable. Distinct now,
    -- because the list was normalized above.
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

-- Unchanged from 20260707_apply_widget_recommendations.sql except for the advisory lock.
-- No normalize call: this function deletes the whole list and rewrites it as a contiguous
-- run, so it cannot inherit a duplicate.
create or replace function public.apply_widget_recommendations(
  p_widget_ids text[],
  p_selected_concerns text[] default null,
  p_completion_mode text default null
)
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
  if p_completion_mode is not null and p_completion_mode not in ('finish', 'skip') then
    raise exception 'Invalid completion mode';
  end if;
  if cardinality(coalesce(p_widget_ids, array[]::text[])) > 100 then
    raise exception 'Too many widgets';
  end if;
  if exists (
    select 1
      from unnest(coalesce(p_widget_ids, array[]::text[])) as widget_id
     where btrim(widget_id) = '' or char_length(widget_id) > 100
  ) then
    raise exception 'Invalid widget id';
  end if;

  -- Taken before the delete, and the same key `add_widget_preference` uses: an add either
  -- commits fully before this runs (and is deleted below, which is what replacing the list
  -- means) or fully after it (and computes its `max(position) + 1` against the list this
  -- function committed). Interleaving is what produced a collision.
  perform pg_advisory_xact_lock(public.widget_order_lock_key(uid));

  delete from public.widget_preferences where user_id = uid;

  insert into public.widget_preferences (user_id, widget_id, position)
  select uid, widget_id, min(ordinality)::integer - 1
    from unnest(coalesce(p_widget_ids, array[]::text[])) with ordinality as picked(widget_id, ordinality)
   group by widget_id
   order by min(ordinality);

  insert into public.user_preferences (
    user_id,
    widgets_seeded,
    selected_concerns,
    app_onboarding_completed,
    app_onboarding_completed_via,
    app_onboarding_completed_at
  ) values (
    uid,
    true,
    coalesce(p_selected_concerns, array[]::text[]),
    p_completion_mode is not null,
    p_completion_mode,
    case when p_completion_mode is not null then timezone('utc', now()) else null end
  )
  on conflict (user_id) do update set
    widgets_seeded = true,
    selected_concerns = case
      when p_selected_concerns is null then public.user_preferences.selected_concerns
      else excluded.selected_concerns
    end,
    app_onboarding_completed = case
      when p_completion_mode is null then public.user_preferences.app_onboarding_completed
      else true
    end,
    app_onboarding_completed_via = case
      when p_completion_mode is null then public.user_preferences.app_onboarding_completed_via
      else excluded.app_onboarding_completed_via
    end,
    app_onboarding_completed_at = case
      when p_completion_mode is null then public.user_preferences.app_onboarding_completed_at
      else excluded.app_onboarding_completed_at
    end;
end;
$$;

-- One-time repair of anything that arrived between 20260813010000 and this migration.
-- Same ordering as `normalize_widget_positions()` above, expressed set-wise because a
-- migration runs with no `auth.uid()` and has to cover every user at once. Idempotent.
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

revoke all on function public.widget_order_lock_key(uuid) from public;
revoke execute on function public.widget_order_lock_key(uuid) from anon;
-- The `security invoker` callers execute as the caller, so `authenticated` needs EXECUTE
-- on both of these for the write functions to work at all. It grants nothing extra: the
-- key function is a pure hash of a uuid the caller already knows, and normalize is scoped
-- to `auth.uid()` and idempotent.
grant execute on function public.widget_order_lock_key(uuid) to authenticated;

revoke all on function public.normalize_widget_positions() from public;
-- Older Supabase images granted execute to `anon` directly, where `revoke ... from public`
-- does not reach it (see 20260718_security_advisor_hardening.sql).
revoke execute on function public.normalize_widget_positions() from anon;
grant execute on function public.normalize_widget_positions() to authenticated;

notify pgrst, 'reload schema';

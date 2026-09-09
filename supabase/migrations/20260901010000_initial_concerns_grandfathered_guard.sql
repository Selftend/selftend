-- The concern-at-intake write-once guard missed grandfathered accounts (#1648).
--
-- #1612 guards `initial_concerns` so it is written once, at a first onboarding
-- completion, and never again. The load-bearing half of that guard was:
--
--     or public.user_preferences.app_onboarding_completed_at is not null
--
-- ☠️ `app_onboarding_completed_at` is a PROXY for "has been through onboarding
-- before", and it has a backfill history that breaks the proxy.
-- `20260705_grandfather_widget_onboarding.sql` preserved every account that
-- existed on 2026-07-05 by writing:
--
--     app_onboarding_completed     = true
--     app_onboarding_completed_via = null
--     app_onboarding_completed_at  = null
--
-- so for a grandfathered row BOTH guard clauses are false. `initial_concerns`
-- is null, and `_at` is null. If such a user taps "Get suggestions" on an empty
-- Home - `useApplyWidgetSuggestions`, which passes `completionMode: null` and
-- still reaches this same upsert - their `initial_concerns` is filled from a
-- choice made months after they arrived.
--
-- That is precisely the survivorship bias the column exists to exclude, since
-- only a RETURNING user re-runs the wizard: the rows that get filled are exactly
-- the retained ones. #1612 refused a backfill for this reason; the hole let the
-- same backfill happen one row at a time instead.
--
-- The fix is to guard on the FLAG, which is what "has completed onboarding
-- before" actually means. `_at` is kept in the condition as well: it is still
-- true for every post-grandfather completion, and dropping it would narrow the
-- guard for no gain.
--
-- 📌 A write-once guard keyed on a proxy column is only as strong as that
-- column's own backfill history. Check every migration that ever wrote it.

-- Rows that already fell through the hole. Their `initial_concerns` holds a
-- LATER choice, not an intake record, and the value is not recoverable - nothing
-- records what those users originally declared. They belong in the explicit
-- `unknown` arm (scripts/analytics-segment.sql), which is exactly what NULL
-- means there, so they are returned to it rather than left as false intake data
-- in a report designed to be read in 2027.
--
-- ⚠️ This clears an analytics-only column. `selected_concerns` - the live value
-- that drives widget suggestions - is deliberately untouched, so nothing the
-- user sees changes. The predicate matches grandfathered rows only: a
-- post-grandfather account that completed onboarding always has `_at` set, and
-- an account that has not completed onboarding has the flag false.
update public.user_preferences
   set initial_concerns = null
 where initial_concerns is not null
   and app_onboarding_completed
   and app_onboarding_completed_at is null;


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
    initial_concerns,
    app_onboarding_completed,
    app_onboarding_completed_via,
    app_onboarding_completed_at
  ) values (
    uid,
    true,
    coalesce(p_selected_concerns, array[]::text[]),
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
    -- Written ONCE, at a first onboarding completion, and never again.
    --
    -- ☠️ The "has been here before" test is the whole point, and a plain
    -- `is null` guard would defeat it. Only a RETURNING user re-runs this wizard
    -- (#1633), so if a pre-column user's re-run were allowed to fill this in,
    -- the rows that got filled would be exactly the retained ones - re-importing
    -- the survivorship bias the column exists to remove, one row at a time
    -- instead of in a backfill. A user who has completed onboarding before
    -- therefore stays NULL and is reported in the explicit `unknown` arm (#1605).
    --
    -- ☠️ It tests `app_onboarding_completed`, the FLAG, and not only
    -- `app_onboarding_completed_at`. Accounts grandfathered by
    -- 20260705_grandfather_widget_onboarding.sql have the flag true and the
    -- timestamp NULL, so a timestamp-only guard let exactly the oldest users -
    -- the ones most likely to be retained - fall through (#1648).
    initial_concerns = case
      when public.user_preferences.initial_concerns is not null
        or public.user_preferences.app_onboarding_completed
        or public.user_preferences.app_onboarding_completed_at is not null
        then public.user_preferences.initial_concerns
      else excluded.initial_concerns
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

comment on column public.user_preferences.initial_concerns is
  'Concerns declared at first onboarding completion. Immutable: written once by apply_widget_recommendations and never updated, including for accounts grandfathered in by 20260705 whose app_onboarding_completed_at is NULL (#1648). NULL means never recorded, which is an explicit "unknown" arm rather than "no concerns".';

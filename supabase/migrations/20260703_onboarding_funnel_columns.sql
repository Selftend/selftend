-- Onboarding funnel analytics: track how and when the first-run wizard was completed.
--
-- Part 1: Add the two new columns to user_preferences.
-- Part 2: Repair + extend export_user_data() to include start_here_dismissed_at (which
--         was missed when that column was added in 20260701) and the two new funnel columns.
--         Uses the same append-only wrapper pattern as 20260582 / 20260584 so it can only
--         ADD keys to the preferences object, never silently drop existing ones.

-- ---------------------------------------------------------------------------
-- Part 1: Schema
-- ---------------------------------------------------------------------------

alter table public.user_preferences
  add column if not exists app_onboarding_completed_via text
    check (app_onboarding_completed_via in ('finish', 'skip')),
  add column if not exists app_onboarding_completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Part 2: Repair + extend export_user_data
-- ---------------------------------------------------------------------------

alter function public.export_user_data() rename to export_user_data_before_funnel_columns;
revoke execute on function public.export_user_data_before_funnel_columns() from public;
revoke execute on function public.export_user_data_before_funnel_columns() from authenticated;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
  funnel_prefs jsonb;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  result := public.export_user_data_before_funnel_columns()::jsonb;

  -- The three preference fields the prior chain does not already include:
  --   start_here_dismissed_at  (added in 20260701 but missed in the export)
  --   app_onboarding_completed_via  (new funnel column)
  --   app_onboarding_completed_at   (new funnel column)
  select to_jsonb(p) into funnel_prefs
  from (
    select
      start_here_dismissed_at,
      app_onboarding_completed_via,
      app_onboarding_completed_at
    from public.user_preferences
    where user_id = uid
  ) p;

  -- Merge into the existing 'preferences' object (append-only). Only when the user
  -- has a preferences row; otherwise the base export already carries a null 'preferences'.
  if funnel_prefs is not null then
    result := jsonb_set(
      result,
      '{preferences}',
      coalesce(result -> 'preferences', '{}'::jsonb) || funnel_prefs
    );
  end if;

  return result::json;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

notify pgrst, 'reload schema';

-- Apply a recommendation result as one transaction. A client disconnect or failed
-- preference write cannot leave Home changed while onboarding remains incomplete.
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

revoke all on function public.apply_widget_recommendations(text[], text[], text) from public;
grant execute on function public.apply_widget_recommendations(text[], text[], text) to authenticated;

notify pgrst, 'reload schema';

-- GDPR completeness: include the user's registered native push tokens in the data export.
-- Append pattern (rename current fn to a shadow, wrap, add the key) so it can only ADD keys.

alter function public.export_user_data() rename to export_user_data_before_push_tokens;
revoke execute on function public.export_user_data_before_push_tokens() from public;
revoke execute on function public.export_user_data_before_push_tokens() from authenticated;

create or replace function public.export_user_data()
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  result := public.export_user_data_before_push_tokens()::jsonb;

  result := result || jsonb_build_object(
    'devicePushTokens', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from (
        select id, platform, time_zone, enabled, last_success_at, last_failure_at,
          failure_count, created_at, updated_at
        from public.device_push_tokens
        where user_id = uid
        order by created_at asc
      ) t
    )
  );

  return result::json;
end;
$$;

grant execute on function public.export_user_data() to authenticated;

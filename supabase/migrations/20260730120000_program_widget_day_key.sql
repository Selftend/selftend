-- program_widget_task_status decided "did the user do X today" with a timestamp
-- range scan over the VIEWER's current local day. That buckets every entry by
-- where the user is standing now rather than by the civil day it was logged on,
-- so one entry can read as done on its module screen and not-done in the Home
-- programme widget at the same moment (#414, and #330's brief §7).
--
-- Mood is the only table this RPC reads that carries a captured occurrence
-- offset today (#250 landed mood, gratitude, sleep and journal; this RPC reads
-- only mood of the four). It moves onto the captured day here. Every other daily
-- leg - thought records, activities, meditation, and the five ACT tables - has
-- no offset column to read yet, so it stays explicitly viewer-local until its
-- own #330 slice lands. The two models coexist in this function on purpose: each
-- leg graduates when its column arrives, rather than the whole RPC waiting for a
-- flag day. No offset column is invented here - that is #330's job, one table
-- per PR.

-- The civil day an occurrence belongs to, as YYYY-MM-DD: the SQL twin of
-- `entryDayKey` (src/lib/occurrence-time.ts). A null offset means "not captured"
-- and propagates to a null day key, so callers fall back exactly as the client
-- does - to the viewer's local day - instead of asserting UTC. `timezone('utc',
-- ...)` pins the arithmetic to UTC so the answer never depends on the session's
-- TimeZone setting.
create or replace function public.occurrence_day_key(
  p_occurred_at timestamptz,
  p_offset_minutes integer
) returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select to_char(
           timezone('utc', p_occurred_at) + make_interval(mins => p_offset_minutes),
           'YYYY-MM-DD'
         );
$$;

revoke all on function public.occurrence_day_key(timestamptz, integer) from public;
grant execute on function public.occurrence_day_key(timestamptz, integer) to authenticated;

-- The signature gains p_day_key, so the old three-argument function has to go.
drop function if exists public.program_widget_task_status(text, timestamptz, timestamptz);

-- Lightweight completion data for Home programme widgets. This returns only task
-- keys and booleans; Home never downloads the user's module histories.
--
-- p_day_key defaults to null so a client predating this migration - one that
-- sends only the three original arguments - still resolves this function and
-- gets precisely its old behaviour: a null day key makes every leg fall back to
-- the viewer's window. It can be made required once no such client is in the
-- wild.
create or replace function public.program_widget_task_status(
  p_module text,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_day_key text default null
)
returns table(task_key text, done boolean)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  phase_index integer;
  phase_started_at timestamptz;
  -- Index-usable bounds for the captured-day legs; see the comment below.
  scan_start timestamptz;
  scan_end timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_module not in ('cbt', 'act') then
    raise exception 'Unsupported module';
  end if;
  if p_day_end <= p_day_start or p_day_end > p_day_start + interval '26 hours' then
    raise exception 'Invalid day range';
  end if;
  if p_day_key is not null and p_day_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Invalid day key';
  end if;

  -- A day-key predicate cannot drive an index on its own: the expression is
  -- STABLE (timezone conversion is not immutable), so it cannot be indexed. But
  -- a row whose captured day is D must have been logged within D plus or minus
  -- the largest legal offset - 14 hours, per the -840..840 check the offset
  -- columns carry - so bound the scan by that window, let the existing
  -- (user_id, logged_at) index serve it, and filter exactly inside. This matters
  -- more than usual here: mood_logs is a decrypting view, so an unbounded scan
  -- would decrypt the user's entire history to answer one boolean.
  if p_day_key is null then
    scan_start := p_day_start;
    scan_end := p_day_end;
  else
    scan_start := least(
      p_day_start,
      timezone('utc', p_day_key::date::timestamp) - interval '14 hours'
    );
    scan_end := greatest(
      p_day_end,
      timezone('utc', (p_day_key::date + 1)::timestamp) + interval '14 hours'
    );
  end if;

  if p_module = 'cbt' then
    select cbt_program_phase_index,
           coalesce(cbt_program_phase_started_at, cbt_program_started_at)
      into phase_index, phase_started_at
      from public.user_preferences
     where user_id = uid and cbt_program_started_at is not null;

    if not found then return; end if;

    case greatest(0, least(coalesce(phase_index, 0), 4))
      when 0 then
        return query values
          -- Captured day: mood carries logged_offset_minutes (#250). When the
          -- offset is null - legacy rows, or a client predating the column - the
          -- day key is null too and this falls back to the viewer's window,
          -- which is exactly where those rows already render.
          ('dailyNoticing', exists(
            select 1 from public.mood_logs
             where user_id = uid
               and logged_at >= scan_start and logged_at < scan_end
               and coalesce(
                     public.occurrence_day_key(logged_at, logged_offset_minutes) = p_day_key,
                     (logged_at >= p_day_start and logged_at < p_day_end)
                   )
               and (btrim(situation) <> '' or btrim(thoughts) <> '' or
                    btrim(behaviours) <> '' or btrim(bodily_sensations) <> '')
          )),
          ('setGoals', exists(
            select 1 from public.goals where user_id = uid and created_at >= phase_started_at
          )),
          ('clarifyValues', exists(
            select 1 from public.values_profile
             where user_id = uid and updated_at >= phase_started_at
               and jsonb_array_length(coalesce(priority_values, '[]'::jsonb)) > 0
          ));
      when 1 then
        return query values
          ('examineBelief', exists(
            select 1 from public.core_beliefs
             where user_id = uid and created_at >= phase_started_at
          ));
      when 2 then
        return query values
          -- Viewer-local: thought_records has no captured offset yet (#330 item 4).
          ('thoughtRecordDaily', exists(
            select 1 from public.thought_records
             where user_id = uid and created_at >= p_day_start and created_at < p_day_end
          )),
          ('thoughtRecordOnce', exists(
            select 1 from public.thought_records
             where user_id = uid and created_at >= phase_started_at
          ));
      when 3 then
        return query values
          -- Viewer-local: activity_logs has no captured offset yet (#330 item 5).
          ('activityDaily', exists(
            select 1 from public.activity_logs
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('activityOnce', exists(
            select 1 from public.activity_logs
             where user_id = uid and completed_at >= phase_started_at
          )),
          ('exposureLadder', exists(
            select 1 from public.exposure_hierarchies
             where user_id = uid and created_at >= phase_started_at
          ));
      when 4 then
        return query values
          -- Viewer-local: meditation_sessions has no captured offset yet
          -- (#330 item 3). Graduates to occurrence_day_key when that column lands.
          ('calmingDaily', exists(
            select 1 from public.meditation_sessions
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('resiliencePlan', exists(
            select 1 from public.recovery_plans
             where user_id = uid and updated_at >= phase_started_at and btrim(personal_slogan) <> ''
          )),
          ('calmingOnce', exists(
            select 1 from public.meditation_sessions
             where user_id = uid and completed_at >= phase_started_at
          ));
    end case;
  else
    select act_program_phase_index,
           coalesce(act_program_phase_started_at, act_program_started_at)
      into phase_index, phase_started_at
      from public.user_preferences
     where user_id = uid and act_program_started_at is not null;

    if not found then return; end if;

    -- Every ACT daily leg below is viewer-local: no ACT table has a captured
    -- offset yet (#330 item 6, the largest remaining slice).
    case greatest(0, least(coalesce(phase_index, 0), 3))
      when 0 then
        return query values
          ('dropAnchorDaily', exists(
            select 1 from public.act_connection_logs
             where user_id = uid and technique = 'dropAnchor'
               and created_at >= p_day_start and created_at < p_day_end
          )),
          ('mapChoicePoint', exists(
            select 1 from public.act_choice_points
             where user_id = uid and created_at >= phase_started_at
          ));
      when 1 then
        return query values
          ('bePresentDaily', exists(
            select 1 from public.act_connection_logs
             where user_id = uid and technique <> 'dropAnchor'
               and created_at >= p_day_start and created_at < p_day_end
          )),
          ('observeSelfOnce', exists(
            select 1 from public.act_observing_self_sessions
             where user_id = uid and created_at >= phase_started_at
          ));
      when 2 then
        return query values
          ('unhookOrMakeRoomDaily',
            exists(select 1 from public.act_defusion_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
            or exists(select 1 from public.act_expansion_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
            or exists(select 1 from public.act_urge_surf_logs where user_id = uid and created_at >= p_day_start and created_at < p_day_end)
          ),
          ('unhookOnce', exists(
            select 1 from public.act_defusion_logs
             where user_id = uid and created_at >= phase_started_at
          )),
          ('makeRoomOnce',
            exists(select 1 from public.act_expansion_logs where user_id = uid and created_at >= phase_started_at)
            or exists(select 1 from public.act_urge_surf_logs where user_id = uid and created_at >= phase_started_at)
          );
      when 3 then
        return query values
          ('valuesStepDaily', exists(
            select 1 from public.act_action_steps
             where user_id = uid and completed_at >= p_day_start and completed_at < p_day_end
          )),
          ('clarifyValue', exists(
            select 1 from public.act_value_entries
             where user_id = uid and updated_at >= phase_started_at
          )),
          ('commitActionOnce', exists(
            select 1 from public.act_committed_actions
             where user_id = uid and created_at >= phase_started_at
          ));
    end case;
  end if;
end;
$$;

revoke all on function public.program_widget_task_status(text, timestamptz, timestamptz, text) from public;
grant execute on function public.program_widget_task_status(text, timestamptz, timestamptz, text) to authenticated;

notify pgrst, 'reload schema';

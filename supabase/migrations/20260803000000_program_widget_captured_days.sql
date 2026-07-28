-- The last three CBT daily legs graduate onto the captured civil day (#425).
--
-- 20260730120000 moved `dailyNoticing` onto `occurrence_day_key` and left every
-- other leg explicitly viewer-local, because no other table this RPC reads had a
-- captured offset yet. Three have landed since:
--
--   meditation_sessions.completed_offset_minutes   20260729   (#416)
--   thought_records.created_offset_minutes         20260731   (#423)
--   activity_logs.completed_offset_minutes         20260731120000 (#424)
--
-- so `thoughtRecordDaily`, `activityDaily` and `calmingDaily` move here. Each
-- leg's CLIENT twin (src/features/cbt/program-definition.ts) moves in the same
-- commit. That lockstep is the whole point: the programme screen and the Home
-- widget answer "is today's practice done" from these two implementations, and a
-- module that graduates on one side only makes them contradict each other, which
-- is worse than the bug. `activityDaily` was already in exactly that state on
-- dev - #424 moved its client leg onto `completedDayKey` while this RPC kept
-- scanning `completed_at` through the viewer's window - so this migration closes
-- a live drift as well as opening none.
--
-- The five ACT legs stay viewer-local: no ACT table has a captured offset yet
-- (#330 item 6). After this migration that is the only viewer-local family left
-- in this function, and it is commented as such below.
--
-- The signature is unchanged, so this is a plain replace with no drop and no
-- client change: `p_day_key` has been sent by the app since 20260730120000 and
-- still defaults to null, so a client predating that migration keeps resolving
-- the function and keeps getting its old, viewer-local answer rather than an
-- error.
--
-- This declares no exportable column and deliberately does not touch
-- `export_user_data`; the offsets it reads were added to the export by the
-- migrations that introduced them (and #429).

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
  -- (user_id, <timestamp>) indexes serve it, and filter exactly inside. This
  -- matters more than usual here: mood_logs, thought_records and activity_logs
  -- are all decrypting views, so an unbounded scan would decrypt the user's
  -- entire history to answer one boolean.
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
          -- which is exactly where those rows already render. Every captured-day
          -- leg below follows the same shape.
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
          -- Captured day: thought_records carries created_offset_minutes (#423).
          ('thoughtRecordDaily', exists(
            select 1 from public.thought_records
             where user_id = uid
               and created_at >= scan_start and created_at < scan_end
               and coalesce(
                     public.occurrence_day_key(created_at, created_offset_minutes) = p_day_key,
                     (created_at >= p_day_start and created_at < p_day_end)
                   )
          )),
          ('thoughtRecordOnce', exists(
            select 1 from public.thought_records
             where user_id = uid and created_at >= phase_started_at
          ));
      when 3 then
        return query values
          -- Captured day: activity_logs carries completed_offset_minutes (#424).
          -- An activity that is still open has a null completed_at, which fails
          -- the scan bounds and is excluded exactly as it was before.
          ('activityDaily', exists(
            select 1 from public.activity_logs
             where user_id = uid
               and completed_at >= scan_start and completed_at < scan_end
               and coalesce(
                     public.occurrence_day_key(completed_at, completed_offset_minutes) = p_day_key,
                     (completed_at >= p_day_start and completed_at < p_day_end)
                   )
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
          -- Captured day: meditation_sessions carries completed_offset_minutes
          -- (#416).
          ('calmingDaily', exists(
            select 1 from public.meditation_sessions
             where user_id = uid
               and completed_at >= scan_start and completed_at < scan_end
               and coalesce(
                     public.occurrence_day_key(completed_at, completed_offset_minutes) = p_day_key,
                     (completed_at >= p_day_start and completed_at < p_day_end)
                   )
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

    -- Every ACT daily leg below is viewer-local, and after this migration they
    -- are the only ones left in this function: no ACT table has a captured
    -- offset yet (#330 item 6, the largest remaining slice). Each graduates with
    -- its own column, client and server together, the way the CBT legs did.
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

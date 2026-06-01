-- Performance: add the missing (user_id, <sort>) and foreign-key indexes to the early
-- CBT-phase table family + mood_logs. These tables predate the project's later convention
-- (every table from 20260521 onward shipped a (user_id, ts) index) and were left with no
-- index, so every per-user list query seq-scans + sorts all users' rows. Each index column
-- below matches the actual ORDER BY in the corresponding repository.ts list query, so the
-- planner can serve the ordered, user-scoped read straight from the index.
--
-- All idempotent (IF NOT EXISTS); additive only; no data change.

-- mood_logs: .eq(user_id).order(logged_at desc).limit(n) — Progress, mood widgets, insights.
create index if not exists mood_logs_user_logged_idx
  on public.mood_logs (user_id, logged_at desc);

-- thought_records: listThoughtRecords orders by updated_at desc.
create index if not exists thought_records_user_updated_idx
  on public.thought_records (user_id, updated_at desc);

-- goals + milestones (FK child).
create index if not exists goals_user_created_idx
  on public.goals (user_id, created_at desc);
create index if not exists milestones_user_created_idx
  on public.milestones (user_id, created_at);
create index if not exists milestones_goal_id_idx
  on public.milestones (goal_id);

-- core_beliefs, worry_entries, anger_logs: list by user, order created_at desc.
create index if not exists core_beliefs_user_created_idx
  on public.core_beliefs (user_id, created_at desc);
create index if not exists worry_entries_user_created_idx
  on public.worry_entries (user_id, created_at desc);
create index if not exists anger_logs_user_created_idx
  on public.anger_logs (user_id, created_at desc);

-- activity_logs: order scheduled_at asc.
create index if not exists activity_logs_user_scheduled_idx
  on public.activity_logs (user_id, scheduled_at);

-- exposure hierarchies / items / sessions (items + sessions are FK children).
create index if not exists exposure_hierarchies_user_created_idx
  on public.exposure_hierarchies (user_id, created_at desc);
create index if not exists exposure_items_user_created_idx
  on public.exposure_items (user_id, created_at desc);
create index if not exists exposure_items_hierarchy_id_idx
  on public.exposure_items (hierarchy_id);
create index if not exists exposure_sessions_user_completed_idx
  on public.exposure_sessions (user_id, completed_at desc);
create index if not exists exposure_sessions_item_id_idx
  on public.exposure_sessions (exposure_item_id);

-- procrastination tasks + task_steps (FK child).
create index if not exists procrastination_tasks_user_created_idx
  on public.procrastination_tasks (user_id, created_at desc);
create index if not exists task_steps_user_created_idx
  on public.task_steps (user_id, created_at);
create index if not exists task_steps_task_id_idx
  on public.task_steps (task_id);

-- recovery: challenge_plans list by user, order created_at desc; FK to recovery_plans.
create index if not exists challenge_plans_user_created_idx
  on public.challenge_plans (user_id, created_at desc);
create index if not exists challenge_plans_recovery_plan_id_idx
  on public.challenge_plans (recovery_plan_id);

-- self_care_logs: export + reads order by log_date.
create index if not exists self_care_logs_user_log_date_idx
  on public.self_care_logs (user_id, log_date desc);

-- plan_items: ordered by item_order within a user.
create index if not exists plan_items_user_order_idx
  on public.plan_items (user_id, item_order);

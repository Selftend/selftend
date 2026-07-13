-- The widget recommendation wizard is a new first-login experience. Preserve every
-- account that exists when this migration runs, including accounts that do not yet
-- have a user_preferences row. Accounts created afterward retain the column default
-- (false) and see the wizard on their first Home visit.
insert into public.user_preferences (
  user_id,
  app_onboarding_completed,
  app_onboarding_completed_via,
  app_onboarding_completed_at
)
select
  users.id,
  true,
  null,
  null
from auth.users as users
on conflict (user_id) do update
set app_onboarding_completed = true;

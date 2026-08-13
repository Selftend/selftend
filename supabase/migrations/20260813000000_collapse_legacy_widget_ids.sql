-- #973 (S3): three legacy widget ids collapse into the id that survives them.
--
--   cbt-module-shortcut -> cbt-programme
--   act-module-shortcut -> act-programme
--   mood-trend          -> mood-checkin
--
-- `widget_preferences` does not change shape: same columns, same
-- UNIQUE (user_id, widget_id), same RLS policy, same export. Only the stored
-- id values move.
--
-- ALL THREE are potentially a dedupe, not just `mood-trend`. The ticket
-- described the two shortcuts as plain renames, but the Add-Widget modal offers
-- every id in WIDGET_META, so nothing stopped a user from holding
-- `cbt-module-shortcut` AND `cbt-programme` at the same time. A bare UPDATE on
-- such a row violates UNIQUE (user_id, widget_id) mid-migration, and a failed
-- migration is exactly the kind that wedges a push. The constraint does not
-- care how the change was described, so every pair takes the same treatment.
--
-- `update ... on conflict` does not exist, so the shape is: give the survivor
-- the lower position, delete the loser, then rename whatever legacy rows are
-- left. Keeping min(position) is what stops the tool jumping down the user's
-- list when the pair merges.
--
-- Positions are left with gaps where a row was deleted, which is what every
-- other removal path already leaves behind - Home orders by position and never
-- reads it as a dense index. Merging can never create a TIE either: the
-- position the survivor keeps was held by one of the two merged rows, and the
-- other row is gone by the end of the statement.

do $$
declare
  pair record;
begin
  for pair in
    select *
      from (values
        ('cbt-module-shortcut', 'cbt-programme'),
        ('act-module-shortcut', 'act-programme'),
        ('mood-trend', 'mood-checkin')
      ) as t(legacy, survivor)
  loop
    -- 1. Both ids held: the survivor takes the lower of the two positions.
    update public.widget_preferences as survivor
       set position = legacy.position
      from public.widget_preferences as legacy
     where legacy.user_id = survivor.user_id
       and survivor.widget_id = pair.survivor
       and legacy.widget_id = pair.legacy
       and legacy.position < survivor.position;

    -- 2. Both ids held: the legacy row is the loser and goes.
    delete from public.widget_preferences as legacy
     where legacy.widget_id = pair.legacy
       and exists (
         select 1
           from public.widget_preferences as survivor
          where survivor.user_id = legacy.user_id
            and survivor.widget_id = pair.survivor
       );

    -- 3. Only the legacy id held: a plain rename, position untouched.
    update public.widget_preferences
       set widget_id = pair.survivor
     where widget_id = pair.legacy;
  end loop;
end;
$$;

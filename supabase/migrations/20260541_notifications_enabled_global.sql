alter table user_preferences
  add column if not exists notifications_enabled_global boolean not null default true;

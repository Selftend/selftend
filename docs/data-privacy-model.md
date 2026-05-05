# Shared Data And Privacy Model

Last updated: 2026-05-05

## Purpose

Selftend stores only the data needed to provide account-based guided self-help across devices. New modules must justify each persisted field before adding schema, export, deletion, notifications, or settings behavior.

## Data Classes

| Data class            | MVP storage decision                                             | Privacy rule                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account profile       | Supabase Auth plus `profiles.email` and optional avatar metadata | Keep account metadata separate from self-help content. Uploaded avatars stay in the private `profile-pics` bucket.                                                    |
| Preferences           | `user_preferences` row per user                                  | Store quiet defaults, enabled modules, policy consent, language, and notification settings. Do not infer sensitive traits from preferences.                           |
| Enabled modules       | `user_preferences.enabled_modules`                               | Use explicit user choice. Do not auto-enable new modules silently.                                                                                                    |
| CBT thought records   | `thought_records`                                                | Private user-owned tool records protected by RLS and included in export/delete.                                                                                       |
| Check-ins             | Planned dedicated user-owned records                             | Keep separate from CBT and journaling. Store only user-entered mood/check-in fields needed for the reviewed flow.                                                     |
| Journal entries       | Planned dedicated user-owned records                             | Keep free-text journal data separate from structured tool records. No social visibility in MVP.                                                                       |
| Future tool records   | Planned module-specific tables or a reviewed shared table        | Each module spec must define fields, privacy justification, export shape, deletion behavior, and RLS before implementation.                                           |
| Notification settings | Preferences plus local Expo notification scheduling              | Notifications stay explicit, quiet by default, and easy to disable. Reminder content should not expose sensitive details.                                             |
| Draft form content    | Local in-memory state for online-first flows                     | Preserve unsaved content after failed saves or temporary network loss. Clear drafts only after confirmed save or explicit discard. No cross-device draft sync in MVP. |
| Export data           | `export_user_data()`                                             | Include profile metadata, preferences, and all persisted private tool records. Add new modules to export in the same migration as their schema.                       |
| Deletion data         | `delete_user_account()` plus cascades and storage cleanup paths  | Delete user-owned records and auth account. New private tables must use `user_id` ownership and deletion coverage.                                                    |

## Implementation Rules

- All private user records must include a user ownership field, use RLS, and be queried through authenticated Supabase clients.
- Public policy, crisis, support, and legal routes must not require sign-in.
- User-visible strings for privacy, safety, errors, toasts, forms, and empty states must live in i18n JSON for every supported language.
- Failed saves must leave the form content in place and show a calm reusable failure message.
- Analytics, tracking, ads, social feeds, public posting, peer messaging, and user-facing AI remain out of MVP unless explicitly reviewed and added to the roadmap.

## Open Backend Verification

The linked Supabase project still needs sequential verification after the migration-history mismatch is resolved. Do not rely on `supabase db push` until the remote history and local migration files agree.

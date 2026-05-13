# Shared Data And Privacy Model

## Purpose

Selftend stores only the data needed to provide account-based guided self-help across devices. New modules must justify each persisted field before adding schema, export, deletion, notifications, or settings behavior.

## Data Classes

| Data class             | MVP storage decision                                                           | Privacy rule                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account profile        | Supabase Auth plus `profiles.email` and optional avatar metadata               | Keep account metadata separate from self-help content. Uploaded avatars stay in the private `profile-pics` bucket.                                                                             |
| Preferences            | `user_preferences` row per user                                                | Store quiet defaults, enabled modules, onboarding status, policy consent, language, and timestamped notification settings. Do not infer sensitive traits from preferences.                     |
| Enabled modules        | `user_preferences.enabled_modules`                                             | Use explicit user choice. Do not auto-enable new modules silently.                                                                                                                             |
| CBT thought records    | `thought_records`                                                              | Private user-owned tool records protected by RLS and included in export/delete. Treat as highly private because users may enter wellness or mental-health reflections.                         |
| Check-ins              | Planned dedicated user-owned records                                           | Keep separate from CBT and journaling. Store only user-entered mood/check-in fields needed for the reviewed flow.                                                                              |
| Journal entries        | Planned dedicated user-owned records                                           | Keep free-text journal data separate from structured tool records. No social visibility in MVP.                                                                                                |
| Future tool records    | Planned module-specific tables or a reviewed shared table                      | Each module spec must define fields, privacy justification, export shape, deletion behavior, and RLS before implementation.                                                                    |
| Notification settings  | Preferences plus local Expo notification scheduling and web push subscriptions | Notifications stay explicit, quiet by default, easy to disable, and store `reminder_consent_updated_at` when the consent choice changes. Reminder content should not expose sensitive details. |
| Web push subscriptions | `web_push_subscriptions` per browser subscription                              | Store only the endpoint, browser keys, user agent, timezone, delivery status, and ownership needed to send opted-in web reminders. Delete on account deletion or browser unsubscribe.          |
| Draft form content     | Local in-memory state for online-first flows                                   | Preserve unsaved content after failed saves or temporary network loss. Clear drafts only after confirmed save or explicit discard. No cross-device draft sync in MVP.                          |
| Export data            | `export_user_data()`                                                           | Include profile metadata, preferences, and all persisted private tool records. Add new modules to export in the same migration as their schema.                                                |
| Deletion data          | `delete_user_account()` plus cascades and storage cleanup paths                | Delete user-owned records and auth account. New private tables must use `user_id` ownership and deletion coverage.                                                                             |

## Implementation Rules

- All private user records must include a user ownership field, use RLS, and be queried through authenticated Supabase clients.
- Do not read or disclose private self-help records except for verified privacy requests, security incident handling, or legal obligations.
- Public policy, crisis, support, and legal routes must not require sign-in.
- User-visible strings for privacy, safety, errors, toasts, forms, and empty states must live in i18n JSON for every supported language.
- Failed saves must leave the form content in place and show a calm reusable failure message.
- Analytics, tracking, ads, social feeds, public posting, peer messaging, and user-facing AI remain out of MVP unless explicitly reviewed and added to the roadmap.

## Backend Status

The linked Supabase project migration history was repaired on 2026-05-05. The active project includes profile avatar storage, private `profile-pics` policies, `user_preferences.language` for language sync, and account-backed onboarding flags after applying `20260506_onboarding_flags.sql`.

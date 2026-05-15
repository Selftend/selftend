# Shared Data And Privacy Model

Selftend stores only what is needed for account-based guided self-help across devices. New modules must justify persisted fields before adding schema, export, deletion, notification, or settings behavior.

## Data Classes

| Data class              | Storage decision                                      | Privacy rule                                                                                                                      |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Account profile         | Supabase Auth, `profiles.email`, optional avatar data | Keep account metadata separate from self-help content. Avatars stay in private storage.                                           |
| Preferences             | `user_preferences`                                    | Store quiet defaults, enabled modules, onboarding, consent, language, and notification settings.                                  |
| Enabled modules         | `user_preferences.enabled_modules`                    | Use explicit user choice. Do not silently enable new modules.                                                                     |
| CBT guided tool records | `thought_records`, CBT strategy tables                | Private user-owned records protected by RLS. Store only fields needed for the selected exercise or plan.                          |
| Mood check-ins          | `mood_logs`                                           | Keep separate from journaling. Store mood score, optional emotions, notes, linked strategy, and timestamp.                        |
| Journal entries         | `journal_entries`                                     | Keep free text separate from structured tool records. No social visibility in MVP.                                                |
| Gratitude entries       | `gratitude_entries`                                   | Keep one-to-three item gratitude logs separate from free-text journaling and CBT self-care records. No social visibility in MVP.  |
| Future tool records     | Module tables or a reviewed shared table              | Specs must define fields, privacy justification, export, deletion, and RLS before implementation.                                 |
| Notifications           | Preferences, local schedules, web push subscriptions  | Explicit, quiet by default, easy to disable, and never exposing sensitive content.                                                |
| Web push subscriptions  | `web_push_subscriptions`                              | Store only endpoint, browser keys, browser metadata, timezone, delivery status, and ownership. Delete on unsubscribe or deletion. |
| Draft form content      | Local in-memory state                                 | Preserve after failed saves or network loss; clear only after confirmed save or explicit discard.                                 |
| Export data             | `export_user_data()`                                  | Include profile metadata, preferences, and persisted private tool records.                                                        |
| Deletion data           | `delete_user_account()` and cascades                  | New private tables need `user_id` ownership and deletion coverage.                                                                |

## Implementation Rules

- Private records need user ownership, RLS, and authenticated Supabase queries.
- Do not read or disclose private records except for verified privacy requests, security incidents, or legal obligations.
- Public policy, crisis, support, and legal routes must not require sign-in.
- User-visible privacy, safety, error, toast, form, and empty-state strings live in i18n JSON for every supported language.
- Failed saves keep form content in place and show a calm reusable failure message.
- Analytics, tracking, ads, social feeds, public posting, peer messaging, and user-facing AI stay out of MVP unless explicitly reviewed and added to the roadmap.

## Backend Status

The active Supabase project includes profile avatar storage, private `profile-pics` policies, `user_preferences.language`, and account-backed onboarding flags.

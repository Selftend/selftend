# CBT Module Spec

## Purpose

Ship one complete CBT section before expanding the app into broader mental-health scope.

The module should be:

- practical
- private
- quick to use
- calm in tone
- narrow enough to harden before adding adjacent features

## Current CBT implementation

- CBT dashboard with quick actions, strategy links, recovery slogan, and read-only insights
- one-page CBT onboarding, tracked in account preferences (the concern→strategy personalization scaffolding — `cbtWizardCompleted`, `selected_concerns`, `active_strategies` — is intentionally retained for a deferred personalization step, not yet surfaced in a wizard; mirrors the deferred ACT wizard)
- short distortion learn surface
- guided thought record flow
- full thought record prompts for evidence, before/after intensity, and outcome notes
- private history list
- detail view
- edit flow
- archive flow
- goal setting
- values clarification and activity scheduling
- mood logging
- weekly review
- core beliefs
- exposure hierarchy and worry journal
- guided meditation with mindfulness practices (shared meditation tool)
- procrastination tasks
- anger logs
- self-care logs
- recovery plan and challenge plans
- optional quiet reminders, default-off, with account-backed opt-in / withdrawal state

## Thought record flow

The guided record uses eight steps:

1. situation
2. automatic thoughts (each with an optional belief rating)
3. hot thought (mark the most distressing automatic thought)
4. emotions and intensity before (0–100)
5. evidence for and against
6. likely distortions
7. balanced thought (shown with a running summary of the record)
8. outcome — intensity after (0–100) and outcome notes

Validation:

- All prompts are optional at save time, so a partial record can be saved and completed later.
- The only in-flow requirement is at least one automatic thought (with text) before leaving the automatic-thoughts step.

## Data shape

Public implementation types:

- `ModuleKey`: `cbt`
- `UserPreferences`
- `ThoughtRecord`
- `DistortionDefinition`

Current persisted CBT reminder preference fields live on `user_preferences`:

- `reminder_consent`
- `reminder_consent_updated_at`
- `cbt_reminders_enabled`
- `cbt_reminder_hour`
- `cbt_reminder_minute`
- `cbt_reminder_timezone`

Web push reminder subscriptions live in `web_push_subscriptions`. Native Android and iOS reminders remain local device schedules through Expo Notifications. Browser reminders use the Push API, the app service worker, and the scheduled Supabase Edge Function; iOS and iPadOS web push requires the app to be installed to the Home Screen.

Current persisted `ThoughtRecord` fields:

All thought record prompts are optional at save time so a user can create a partial record and complete it later.

- `id`
- `userId`
- `situation`
- `automaticThought`
- `emotions[]`
- `emotionIntensityBefore`
- `distortions[]`
- `evidenceFor[]`
- `evidenceAgainst[]`
- `balancedThought`
- `emotionIntensityAfter`
- `outcomeNotes`
- `createdAt`
- `updatedAt`
- `archivedAt`

Additional CBT strategy records are stored in private user-owned tables:

- `goals`, `milestones`
- `values_profile`, `activity_logs`
- `mood_logs`
- `core_beliefs`
- `exposure_hierarchies`, `exposure_items`, `exposure_sessions`
- `worry_entries`
- `mindfulness_sessions`, `meditation_sessions`
- `procrastination_tasks`, `task_steps`
- `anger_logs`
- `self_care_logs`
- `recovery_plans`, `challenge_plans`

## Routes

Current route groups:

- auth
- protected app shell
- CBT routes
- settings / support / legal

Key CBT screens (under the protected app shell at `/modules/cbt`):

- `/modules/cbt`
- `/modules/cbt/learn`
- `/modules/cbt/new`
- `/modules/cbt/history`, `/modules/cbt/history/[id]`
- `/modules/cbt/goals`, `/modules/cbt/goals/new`, `/modules/cbt/goals/[id]`
- `/modules/cbt/activities`, `/modules/cbt/activities/new`, `/modules/cbt/activities/[id]`
- `/modules/cbt/values`
- `/modules/cbt/weekly-review`
- `/modules/cbt/beliefs`, `/modules/cbt/beliefs/new`, `/modules/cbt/beliefs/[id]`
- `/modules/cbt/exposure`, `/modules/cbt/exposure/new`, `/modules/cbt/exposure/[id]`
- `/modules/cbt/worry`, `/modules/cbt/worry/new`
- `/modules/cbt/tasks`, `/modules/cbt/tasks/new`, `/modules/cbt/tasks/[id]`
- `/modules/cbt/anger`, `/modules/cbt/anger/new`, `/modules/cbt/anger/[id]`
- `/modules/cbt/self-care`
- `/modules/cbt/recovery`

Mindfulness practice moved to the shared meditation tool at `/tools/meditation`; the former `/tools/mindfulness` route was removed. Other shared tools (mood, journal, gratitude, breathing, grounding, sleep, habits) live under `/tools/*`.

`/modules/cbt/[id]` redirects to `/modules/cbt/history/[id]` for older thought-record links.

## Non-goals for this slice

- generic journaling mixed into the CBT flow
- community features
- AI features

## Acceptance bar

This module is only ready to widen after:

- auth works across platforms
- records persist safely
- edit and archive flows are stable
- reminder defaults stay quiet
- accessibility baseline is acceptable
- tests cover the core logic and validation

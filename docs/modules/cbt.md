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
- one-page CBT onboarding, tracked in account preferences
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
- mindfulness exercises
- procrastination tasks
- anger logs
- self-care logs
- recovery plan and challenge plans
- optional quiet reminders, default-off, with account-backed opt-in / withdrawal state

## Thought record flow

The guided record uses five steps:

1. situation
2. automatic thought
3. emotions
4. likely distortions
5. balanced thought

Validation defaults:

- situation is required
- automatic thought is required
- at least one emotion is required
- at least one distortion is required
- balanced thought is required

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
- `mindfulness_sessions`
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

Key CBT screens:

- `/cbt`
- `/cbt/learn`
- `/cbt/new`
- `/cbt/history`
- `/cbt/history/[id]`
- `/cbt/goals`, `/cbt/goals/new`, `/cbt/goals/[id]`
- `/cbt/activities`, `/cbt/activities/new`, `/cbt/activities/[id]`
- `/cbt/values`
- `/cbt/weekly-review`
- `/cbt/beliefs`, `/cbt/beliefs/new`, `/cbt/beliefs/[id]`
- `/cbt/exposure`, `/cbt/exposure/new`, `/cbt/exposure/[id]`
- `/cbt/worry`, `/cbt/worry/new`
- `/tools/mindfulness`, `/tools/mindfulness/[slug]`
- `/cbt/tasks`, `/cbt/tasks/new`, `/cbt/tasks/[id]`
- `/cbt/anger`, `/cbt/anger/new`, `/cbt/anger/[id]`
- `/cbt/self-care`
- `/cbt/recovery`

`/history` is kept only as a compatibility redirect to `/cbt/history`. `/cbt/[id]` redirects to `/cbt/history/[id]` for older thought-record links.

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

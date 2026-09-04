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

- CBT overview: a header stat run (lifetime records, this month's records, and - when this month has records rating the hot thought both before and after - the signed mean belief shift), a "New thought record" button under the header, the programme card, the recovery slogan, active goals, the three most recent thought records, read-only insights (this month's thinking-pattern counts as bars, then the other insight cards), the Think · Act · Be pillars and their strategy links, review links, and a crisis-support callout at the foot
- one door to the record history, from the recent-records section
- one-page CBT onboarding, tracked in account preferences (the concern→strategy personalization scaffolding - `cbtWizardCompleted`, `selected_concerns`, `active_strategies` - is intentionally retained for a deferred personalization step, not yet surfaced in a wizard; mirrors the deferred ACT wizard)
- short distortion learn surface, opened by two framework cards: "Use gently", and the pacing-and-mode card ("How much, and how") that teaches that "too much" is a way of using rather than an amount and carries the one-sentence professional door - the app's whole over-use answer, static by ruling (#1659, ADR-0004); the FAQ answers the same question in public
- guided thought record flow
- full thought record prompts for evidence, before/after intensity, and outcome notes
- private history list
- detail view
- edit flow
- delete flow (labelled Delete in the UI; stored as a soft archive via `archivedAt`, with no restore surface)
- goal setting
- values clarification and activity scheduling
- mood logging
- weekly review
- core beliefs
- exposure ladder and worry journal
- guided meditation with mindfulness practices (shared meditation tool)
- procrastination tasks
- anger logs
- self-care logs
- recovery plan and challenge plans
- optional quiet reminders, default-off, with account-backed opt-in / withdrawal state

## Thought record flow

The guided record is one scrolling form with a sticky progress rail that names six parts (in
this order - naming the pattern before hunting evidence is deliberate):

1. situation
2. thoughts - the automatic-thoughts list (each with an optional belief rating) and the hot
   thought (the most distressing one; defaults to the highest-rated and can be overridden once
   there are at least two)
3. feelings - emotions and intensity before (0-100)
4. patterns - likely distortions
5. evidence for and against
6. balanced - the balanced thought, belief in the hot thought now (0-100), intensity after
   (0-100), and outcome notes

Every part is on screen at once: parts can be answered in any order, and the rail's segments
light per part as they hold something. "Finish later" leaves the screen over the persisted
draft autosave; returning restores what was typed (drafts expire after 24 hours).

Validation:

- All prompts are optional at save time, so a partial record can be saved and completed later.
- The only requirement, enforced at save, is at least one automatic thought (with text).

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
- `nats[]` - each with `text`, an optional `beliefRating` (0-100) and an `isHotThought` flag
- `emotions[]`
- `emotionIntensityBefore`
- `distortions[]`
- `evidenceFor[]`
- `evidenceAgainst[]`
- `balancedThought`
- `emotionIntensityAfter`
- `outcomeNotes`
- `beliefAfter` - belief in the hot thought after working the record (0-100), null when unrated
- `createdAt`
- `createdOffsetMinutes` - minutes east of UTC where the record was written; null when never captured
- `updatedAt`
- `archivedAt`

`beliefAfter` is stored plaintext, unlike the narrative fields: it exists to be
aggregated across records, and the per-thought `beliefRating` it is compared
against lives inside the encrypted thoughts blob where SQL cannot reach it. Null
means "not rated" and is never the same as 0, which means "I no longer believe
this at all".

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
- edit and delete flows are stable
- reminder defaults stay quiet
- accessibility baseline is acceptable
- tests cover the core logic and validation

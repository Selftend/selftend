# CBT Module Spec

Last updated: 2026-05-06

## Purpose

Ship one complete CBT section before expanding the app into broader mental-health scope.

The module should be:

- practical
- private
- quick to use
- calm in tone
- narrow enough to harden before adding adjacent features

## Included in the first CBT slice

- CBT section home
- one-page CBT onboarding, tracked in account preferences
- short distortion learn surface
- guided thought record flow
- private history list
- detail view
- edit flow
- archive flow
- optional quiet local reminders, default-off

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

Current persisted `ThoughtRecord` fields:

- `id`
- `userId`
- `situation`
- `automaticThought`
- `emotions[]`
- `distortions[]`
- `balancedThought`
- `createdAt`
- `updatedAt`
- `archivedAt`

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
- `/cbt/[id]`
- `/cbt/history`

`/history` is kept only as a compatibility redirect to `/cbt/history`.

## Non-goals for this slice

- mood tracking mixed into the CBT flow
- generic journaling mixed into the CBT flow
- predictions / experiments / broader exercise library
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

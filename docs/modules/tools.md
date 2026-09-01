# Tools Navigation Spec

The product stays modular without implying planned tools are already ready.

## Current State

The protected app sidebar (`src/components/app/sidebar-nav.tsx`) groups navigation as:

- Home, Progress, Routines
- Modules: CBT, ACT, DBT
- Tools: Mood tracker, Journal, Breathing, Grounding, Gratitude log, Meditation, Sleep, Habits
- Account: Notifications, Settings, Support

**There is no Mindfulness entry.** The mindfulness library was absorbed into meditation in `bb5e7a9a` (2026-06-03) and its routes were deleted. Its practices are now an info-only reference section inside meditation (`/tools/meditation/practices`), and `5-4-3-2-1` is a grounding technique under `/tools/grounding`. Nothing in the app serves `/tools/mindfulness` or `/cbt/mindfulness`.

The app shell introduction is tracked in `user_preferences`; module introductions are opened explicitly from their info actions and Settings does not reset per-module flags. Legacy module-onboarding columns remain temporarily for compatibility with supported mobile builds.

Meditation and ACT are no longer placeholders - both shipped with reviewed module specs (`meditation-tmi.md`, `act-harris-happiness-trap.md`) and both persist their own data (`meditation_sessions` / `meditation_program_state`; the ACT exercise tables). The conditions the placeholder rule set have been met, so the standing product guardrails apply to them as they do to every shipped module: reminders stay opt-in and quiet by default, no streak pressure, no implied therapeutic outcomes.

## Routes

Working CBT routes (all under the `/modules/cbt` prefix - there is no top-level `/cbt` route):

- `/modules/cbt`
- `/modules/cbt/learn`
- `/modules/cbt/history`, `/modules/cbt/history/[id]`
- `/modules/cbt/new`
- `/modules/cbt/[id]`, `/modules/cbt/saved/[id]`
- `/modules/cbt/goals`, `/modules/cbt/goals/new`, `/modules/cbt/goals/[id]`
- `/modules/cbt/activities`, `/modules/cbt/activities/new`, `/modules/cbt/activities/[id]`
- `/modules/cbt/values`
- `/modules/cbt/weekly-review`
- `/modules/cbt/beliefs`, `/modules/cbt/beliefs/new`, `/modules/cbt/beliefs/[id]`
- `/modules/cbt/exposure`, `/modules/cbt/exposure/new`, `/modules/cbt/exposure/[id]`
- `/modules/cbt/worry`, `/modules/cbt/worry/new`, `/modules/cbt/worry/[id]`
- `/modules/cbt/tasks`, `/modules/cbt/tasks/new`, `/modules/cbt/tasks/[id]`
- `/modules/cbt/anger`, `/modules/cbt/anger/new`, `/modules/cbt/anger/[id]`
- `/modules/cbt/self-care`
- `/modules/cbt/recovery`

There is no `/modules/cbt/mindfulness`. Strategy 5 is served by the shared meditation, breathing, and grounding tools; see the note in Current State.

Working tool routes:

- `/tools/check-in`, `/tools/check-in/new`, `/tools/check-in/[id]`, `/tools/check-in/[id]/edit`, `/tools/check-in/history`
- `/tools/journal`, `/tools/journal/new`, `/tools/journal/[id]`, `/tools/journal/[id]/edit`, `/tools/journal/entries`
- `/tools/breathing`, `/tools/breathing/new`, `/tools/breathing/session`, `/tools/breathing/history`
- `/tools/grounding`, `/tools/grounding/history`, `/tools/grounding/[slug]`
- `/tools/mood-tracker`, `/tools/mood-tracker/new`, `/tools/mood-tracker/[id]`, `/tools/mood-tracker/[id]/edit`
- `/tools/sleep`, `/tools/sleep/new`, `/tools/sleep/[id]`, `/tools/sleep/[id]/edit`, `/tools/sleep/history`
- `/tools/gratitude-log`, `/tools/gratitude-log/new`, `/tools/gratitude-log/[id]`, `/tools/gratitude-log/[id]/edit`, `/tools/gratitude-log/entries`, `/tools/gratitude-log/favorites` (these are the live routes; the `/modules/gratitude/*` move below is still planned, and nothing redirects there yet)
- `/tools/habits`, `/tools/habits/new`, `/tools/habits/[id]`, `/tools/habits/[id]/edit`, `/tools/habits/[id]/log`, `/tools/habits/history`, `/tools/habits/learn`, `/tools/habits/learn/[slug]`

Working gratitude routes (planned - Phase 1):

- `/modules/gratitude` - home (new-entry CTA, insights, recent entries, break card)
- `/modules/gratitude/onboarding` - onboarding modal fallback / revisit
- `/modules/gratitude/new` - create gratitude journal entry
- `/modules/gratitude/entries`, `/modules/gratitude/entries/[id]`, `/modules/gratitude/entries/[id]/edit`
- `/modules/gratitude/favorites` - Favorite Moments collection for starred entries
- `/modules/gratitude/breaks/[slug]` - individual exercise or science card

Working meditation routes (all under `/tools/meditation`; there is no `/modules/meditation`):

- `/tools/meditation` - home (stage-aware)
- `/tools/meditation/learn` - framework primer
- `/tools/meditation/session` - pre-sit primer, timer, post-sit reflection
- `/tools/meditation/sessions`, `/tools/meditation/sessions/[id]`
- `/tools/meditation/stages`, `/tools/meditation/stages/[n]` (the `[n]` route is a compatibility redirect to the list)
- `/tools/meditation/practices` - info-only reference for the practices
- `/tools/meditation/daily-life` - daily-life mindfulness notes

`meditation-tmi.md` is the module spec; its §5 lists the same routes.

Compatibility redirects: `/tools/act` → `/modules/act`.

## Expansion Rule

Before a placeholder becomes real, add a module spec covering:

- user problem and feature boundary
- data fields, privacy justification, RLS, export, and deletion
- safety copy and non-medical framing
- reminder behavior, if any
- tests and acceptance criteria

## Module Contract

Every real module must use the shared app foundation:

- stable `ModuleKey`, route group, settings label, and i18n keys
- shared loading, empty, error, toast, safety/crisis, and mobile form patterns
- online-first drafts that survive failed saves and clear after confirmed save or explicit discard
- reminders off by default, explicit, local where possible, and non-punitive
- repository fetch-by-route-id functions validate the id with `isValidUuid` (`src/utils/uuid.ts`) and return their normal not-found result (`null` / `[]`) without a network call
- user-triggered async save handlers wrap in `useSingleFlight` (`src/lib/use-single-flight.ts`) so a rapid double-press cannot insert twice; upserts that merge on a unique index may skip it
- free-text fields are sanitized exactly once, on WRITE: `userText(max, ...)` (`src/lib/zod-fields.ts`) when the flow is zod-validated, otherwise `sanitizeUserText` (`src/utils/sanitize-text.ts`) in the repository's create/update; never sanitize on read - see "Free-text sanitization" in [architecture.md](../architecture.md)
- multi-step wizards persist drafts through `createWizardDraftStore("<flow-key>")` + `useWizardDraft` (24h TTL, versioned envelope, sign-out wipes disk) - see "Wizard draft persistence contract" in [architecture.md](../architecture.md)
- schema/repository tests plus one component state test for user-facing flows

Planned boundaries:

- **CBT:** self-help strategies under the Gillihan CBT program, private history, recovery planning, pattern insights, and optional quiet reminders
- **Check-in:** check-ins only; do not mix in generic journaling
- **Journaling:** private free-text reflection, separate from CBT and check-ins. Spec: [journaling.md](journaling.md)
- **ACT:** focused exercises after a spec
- **Meditation:** the ten-stage Mind Illuminated program with onboarding, stage-aware sits, private session history, and optional quiet reminders. Spec: [meditation-tmi.md](meditation-tmi.md)
- **Gratitude:** three-level practice (Noticing → Reflecting → Practicing), 9 named exercises from the Kurzgesagt Gratitude Journal, private history, no reminders or streak pressure. Spec: [gratitude.md](gratitude.md)
- **Habits:** Atomic Habits four-law strategies, identity-based framing, tap-to-tick today list, calendar heat-strip on detail, "Never Miss Twice" copy, no streaks. Spec: [habits.md](habits.md)

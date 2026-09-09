# Module Contract

The product stays modular without implying planned tools are already ready.

## Current State

**There is no Mindfulness tool.** The mindfulness library was absorbed into meditation in `bb5e7a9a` (2026-06-03) and its routes were deleted. Its practices are now an info-only reference section inside meditation (`/tools/meditation/practices`), and `5-4-3-2-1` is a grounding technique under `/tools/grounding`. Nothing in the app serves `/tools/mindfulness` or `/modules/cbt/mindfulness`.

The app shell introduction is tracked in `user_preferences`; module introductions are opened explicitly from their info actions and Settings does not reset per-module flags. Legacy module-onboarding columns remain temporarily for compatibility with supported mobile builds.

Meditation and ACT are no longer placeholders - both shipped with reviewed module specs (`meditation-tmi.md`, `act-harris-happiness-trap.md`) and both persist their own data (`meditation_sessions` / `meditation_program_state`; the ACT exercise tables). The conditions the placeholder rule set have been met, so the standing product guardrails apply to them as they do to every shipped module: reminders stay opt-in and quiet by default, no streak pressure, no implied therapeutic outcomes.

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
- **ACT:** the Happiness Trap module - six principle tools, a four-phase programme, optional quiet reminders. Spec: [act-harris-happiness-trap.md](act-harris-happiness-trap.md)
- **DBT:** skills for when feelings run high - a coping plan read as a card, a flow that records nothing, one timed session, five kinds of dated record, a four-phase programme on the shared machinery, learn pages, one opt-in reminder; nothing branches on the person's input, Stop saves nothing, and self-harm is named on the crisis page only. Spec: [dbt-mckay-skills-workbook.md](dbt-mckay-skills-workbook.md)
- **Meditation:** the ten-stage Mind Illuminated program with onboarding, stage-aware sits, private session history, and optional quiet reminders. Spec: [meditation-tmi.md](meditation-tmi.md)
- **Gratitude:** three-level practice (Noticing → Reflecting → Practicing), 9 named exercises from the Kurzgesagt Gratitude Journal, private history, no reminders or streak pressure. Spec: [gratitude.md](gratitude.md)
- **Habits:** Atomic Habits four-law strategies, identity-based framing, tap-to-tick today list, calendar heat-strip on detail, "Never Miss Twice" copy, no streaks. Spec: [habits.md](habits.md)

# Habits Module Spec — Clear: Atomic Habits

**Sources:**

- _Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones_ — James Clear (Avery / Penguin Random House, 2018, ISBN 9780735211292)
- _The Atomic Habits Workbook_ — James Clear (Penguin Publishing Group, 2025)

**Status:** Canonical spec for the habits module — replaces the lightweight `/tools/habits` placeholder
**Audience:** Developers and product contributors

---

## 1. Framework Overview

### The Habit Loop

The book models every habit as a four-stage feedback loop. The Four Laws of Behaviour Change attach a design rule to each stage. Together they form the operating system of the module.

| Stage        | What it is                                      | Law (build a habit) | Inverse (break a habit) |
| ------------ | ----------------------------------------------- | ------------------- | ----------------------- |
| **Cue**      | The trigger that initiates the behaviour        | Make It Obvious     | Make It Invisible       |
| **Craving**  | The motivational pull that makes the cue matter | Make It Attractive  | Make It Unattractive    |
| **Response** | The actual behaviour performed                  | Make It Easy        | Make It Difficult       |
| **Reward**   | The payoff that closes the loop                 | Make It Satisfying  | Make It Unsatisfying    |

### The Foundational Mindset

The product copy and onboarding rest on four ideas that the book treats as load-bearing:

- **The 1% Compounding Effect** — improving by 1% a day compounds to ~37× over a year; the symmetric 1% slip compounds toward near-zero. Small consistent actions, not heroic effort, are what move the curve.
- **Systems Over Goals** — _"You do not rise to the level of your goals; you fall to the level of your systems."_ The module captures behaviours and routines, not outcome targets.
- **Identity-Based Habits** — durable change is identity change. Every habit is an opportunity to cast a vote for the kind of person the user wants to become. Habits are stored with an optional `identity` statement (e.g., _"I'm a person who reads."_).
- **Never Miss Twice** — a single missed day is data, not failure; missing twice begins a new habit (of not doing it). The product surfaces this rule explicitly so a slip never becomes a streak-shaming moment.

### Core Principles (product posture)

- **Non-punitive** — missing a day is normal, expected, and never produces shame copy, red colour, broken-chain animations, or warnings.
- **Identity-first, outcome-last** — the home screen frames habits by the identity they reinforce, not by a numeric goal.
- **Two-minute floor** — every habit must be expressible in a two-minute starter version. The form encourages this directly.
- **Private** — habit lists, identities, and check-ins are personal and never shared or aggregated.
- **Non-clinical** — habit tracking is a life-design tool, not a medical or therapeutic intervention. Copy must not imply treatment of mental-health conditions.

### The Four Laws — Strategy Table (from the workbook)

These five workbook strategies become the editable strategy fields on every habit. They are optional but encouraged, and they double as the prompts in the new-habit flow.

| Law                           | Stage    | Core principle                                      | Key strategy                    | Application method                                                                | Intended outcome                                                                  |
| ----------------------------- | -------- | --------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **First Law**                 | Cue      | Make It Obvious                                     | Implementation Intention        | _I will \[BEHAVIOUR] at \[TIME] in \[LOCATION]._                                  | A concrete plan and specific trigger so the habit is initiated, not left to mood. |
| **First Law**                 | Cue      | Make It Obvious                                     | Habit Stacking                  | _After \[CURRENT HABIT], I will \[NEW HABIT]._                                    | Pair the new habit with an existing, reliable trigger.                            |
| **Second Law**                | Craving  | Make It Attractive                                  | Temptation Bundling             | Link an action you _want_ to do with one you _need_ to do.                        | Borrow anticipation from the wanted action to power the needed one.               |
| **Third Law**                 | Response | Make It Easy                                        | The Two-Minute Rule             | Scale the habit down until it takes < 2 minutes to start (e.g., _Read one page_). | Reduce friction; ensure the habit is easy to start.                               |
| **Fourth Law**                | Reward   | Make It Satisfying                                  | Habit Tracking                  | Make progress visible. Apply _Never Miss Twice_ if a day is missed.               | Immediate satisfaction; visible proof of consistency.                             |
| _Inverse laws (for breaking)_ | —        | Invisible / Unattractive / Difficult / Unsatisfying | (Mirror of each strategy above) | Hide the cue; reframe the craving; add friction; add a witness or cost.           | Lower the probability of the unwanted behaviour.                                  |

The product ships with the four positive laws; the inverse laws are introduced as an optional **"Break a habit"** variant on the new-habit form (Phase 3+).

---

## 2. Entry Data Shape

The module persists two related private tables: one for the habit definition, one for the daily ticks.

### `public.habits`

| column             | type        | notes                                                                                  |
| ------------------ | ----------- | -------------------------------------------------------------------------------------- |
| id                 | uuid        | primary key                                                                            |
| user_id            | uuid        | FK auth.users, on delete cascade                                                       |
| name               | text        | NOT NULL, ≤ 120 chars, required                                                        |
| kind               | text        | NOT NULL, default `'build'`, one of `'build' \| 'break'`                               |
| identity           | text        | NOT NULL, default `''`, ≤ 200 chars — optional _"I'm the kind of person who…"_         |
| cue_plan           | text        | NOT NULL, default `''`, ≤ 240 chars — implementation intention text                    |
| stack_after        | text        | NOT NULL, default `''`, ≤ 120 chars — anchor habit for habit stacking                  |
| craving_pairing    | text        | NOT NULL, default `''`, ≤ 240 chars — temptation bundling note                         |
| two_minute_version | text        | NOT NULL, default `''`, ≤ 200 chars — the < 2 min starter form                         |
| reward_note        | text        | NOT NULL, default `''`, ≤ 200 chars — immediate satisfaction the user gives themselves |
| cadence            | text        | NOT NULL, default `'daily'`, one of `'daily' \| 'weekdays' \| 'custom'`                |
| custom_days        | smallint[]  | NOT NULL, default `'{}'`, values 0–6 (Sun–Sat); used only when `cadence = 'custom'`    |
| color              | text        | NOT NULL, default `'primary'`, palette token name (no free-form hex)                   |
| archived_at        | timestamptz | nullable; archived habits stay in history but disappear from today's list              |
| created_at         | timestamptz | default now() UTC                                                                      |
| updated_at         | timestamptz | trigger-maintained                                                                     |

Indexes: `(user_id, archived_at, created_at desc)` for today's list; `(user_id, created_at desc)` for history.

### `public.habit_logs`

| column     | type        | notes                                                                                      |
| ---------- | ----------- | ------------------------------------------------------------------------------------------ |
| id         | uuid        | primary key                                                                                |
| user_id    | uuid        | FK auth.users, on delete cascade — denormalised for RLS performance                        |
| habit_id   | uuid        | FK habits, on delete cascade                                                               |
| logged_on  | date        | NOT NULL — the local calendar date this tick represents (not a timestamp; one row per day) |
| note       | text        | NOT NULL, default `''`, ≤ 500 chars — optional reflection                                  |
| created_at | timestamptz | default now() UTC                                                                          |
| updated_at | timestamptz | trigger-maintained                                                                         |

Unique index: `(habit_id, logged_on)` — one tick per habit per local day. Tap-to-toggle deletes the row instead of marking it false; storage stays sparse and "missed" is the default.

Indexes: `(user_id, logged_on desc)`, `(habit_id, logged_on desc)`.

**No "missed" rows.** Absence of a row for a day means the user didn't tick it. This avoids both a punitive presence-of-absence record and a need for nightly backfill.

---

## 3. Module Contract

This module follows the contract in `tools.md`:

- The habit module remains a **Tool**, not a clinical Module — habit formation is life-design, not a psychotherapy framework. Routes live under `/tools/habits/*`. The sidebar continues to list it under **Tools** (the existing `sidebar.habits` entry, with the **Soon** badge removed once Phase 1 ships).
- No new `ModuleKey` is required; the feature ships under the existing tool route group. (If a future product decision elevates habits to its own enabled-modules toggle, add `"habits"` to `ModuleKey` in `src/features/modules/types.ts` and to `VALID_MODULES`.)
- i18n namespace: `habits:*` — add `src/i18n/locales/en/habits.json` and `src/i18n/locales/bg/habits.json`. Both languages ship together.
- New `user_preferences` field: `habitsOnboardingCompleted: boolean` (default `false`). Added to `UserPreferences`, `defaultUserPreferences`, the Supabase column, and the `export_user_data()` projection.
- Settings can reset the onboarding flag (same pattern as CBT, meditation, gratitude).
- No reminder fields in Phase 1. Reminders are explicitly out of scope until the broader reminder posture is reviewed (AGENTS.md: _"Streaks, quests, reminders, and gamification must always be optional and non-punitive."_). If reminders are added later, they must be off by default and use the existing reminder-consent gate.

---

## 4. Routes

| Route                        | Purpose                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/tools/habits`              | Home — today's habits with tap-to-tick, identity-grouped, recent activity, week strip, _Never Miss Twice_ banner if applicable. |
| `/tools/habits/onboarding`   | Full-screen fallback / revisit route for the onboarding modal.                                                                  |
| `/tools/habits/new`          | Create a habit — guided form covering identity, the Four Laws, and the two-minute version.                                      |
| `/tools/habits/[id]`         | Detail — habit overview, calendar heat-strip, recent notes, edit / archive / delete.                                            |
| `/tools/habits/[id]/edit`    | Edit a habit.                                                                                                                   |
| `/tools/habits/[id]/log`     | Quick log a note for today (used when the user taps the tick and chooses _Add note_).                                           |
| `/tools/habits/history`      | Private history — chronological log of ticks across all habits.                                                                 |
| `/tools/habits/learn/[slug]` | Single learn card (1% compounding, Four Laws, Two-Minute Rule, Never Miss Twice, Identity-Based Habits).                        |

Existing placeholder `app/(app)/tools/habits/index.tsx` (the `ToolPlaceholderScreen`) is replaced by the real home screen. No compat redirect is needed because the placeholder is unreleased.

---

## 5. Onboarding Flow (Modal Wizard)

Mirrors `src/components/app/gratitude-onboarding-modal.tsx` and `meditation-onboarding-modal.tsx`. Four steps; only Step 1 is mandatory. Completion is tracked via `habitsOnboardingCompleted` on `user_preferences`. A `?` icon next to the module title re-opens the modal (same pattern as gratitude and meditation).

**Step 1 — Welcome: Small Habits, Remarkable Results**

- Hero illustration adapted from the supplied infographic (the four-law habit loop circle + 1% compounding curve). Asset path: `assets/images/onboarding/habits-loop.png`.
- Two-sentence summary attributing the framework to _Atomic Habits_ by James Clear and explaining that the practice is about small, repeatable systems — not motivation spikes.
- Two cards:
  - **The 1% Compounding Effect** — improving 1% daily compounds ~37× in a year; symmetrically, 1% worse decays toward zero.
  - **Systems Over Goals** — quote the line; explain that the app captures the system (the daily action), not the target.
- Continue / Skip available.

**Step 2 — The Habit Loop & Four Laws**

- Hero illustration adapted from the habit-loop circle infographic (Cue → Craving → Response → Reward). Asset path: `assets/images/onboarding/habits-four-laws.png`.
- One short paragraph per Law (Make It Obvious / Attractive / Easy / Satisfying), each with a one-line example pulled from the workbook strategy table.
- Footer line introduces the **inverse laws** for breaking habits in a single sentence — full inverse-law support arrives in Phase 3.

**Step 3 — Identity-Based Habits**

- Hero illustration adapted from the "Identity" silhouette in the supplied infographic. Asset path: `assets/images/onboarding/habits-identity.png`.
- Body: every habit is a vote for an identity. Instead of _"I want to run a marathon,"_ frame it as _"I'm a runner."_ The new-habit form has a dedicated identity prompt.
- Note: this prompt is always optional. Leaving it blank is fine.

**Step 4 — Never Miss Twice & The Two-Minute Rule**

- Two cards:
  - **The Two-Minute Rule** — scale the habit until it takes < 2 minutes to start. _"Read one page,"_ not _"Read for an hour."_ The new-habit form will ask for the two-minute version.
  - **Never Miss Twice** — missing once is data; missing twice starts a new habit. Selftend will never punish a missed day, but the home screen quietly notes when you're at risk of missing twice so you can choose to come back.
- Confirm writes `habitsOnboardingCompleted: true` to `user_preferences`.

There is no goal-target picker, streak commitment, or reminder-time prompt in the shipped onboarding flow.

---

## 6. Home Screen

- **Title row** — `Habits` with the standard back button. A `?` icon next to the title re-opens the onboarding modal (same pattern as gratitude/meditation, calling `setForceOnboarding(true)`).
- **Identity banner** (only when at least one habit has an identity set) — rotates through the distinct identities, e.g., _"You're becoming someone who reads."_ Pure affirmation; no metric.
- **New habit button** — always visible, opens `/tools/habits/new`.
- **Today** — list of active habits scheduled for today, grouped by identity when present. Each row is a tap-to-tick. Tapping the tick:
  - inserts a `habit_logs` row for today (or deletes it if already ticked),
  - shows a quiet "Done" microcopy state — no celebration animation by default, but a tiny check transition for reduce-motion-off users.
  - Long-press / "more" opens the optional note sheet (`/tools/habits/[id]/log`).
- **Week strip** — seven small cells per habit (Mon–Sun), each cell filled or empty. No streak number. No flame. No red.
- **Never Miss Twice note** — _"You skipped yesterday. Today is a great day to tick this once."_ Surfaces only when the user has missed exactly the previous day. Disappears the moment the user ticks today or two-or-more days have passed.
- **Recent activity** — last 5 ticks across all habits with relative time.
- **Learn cards** — one rotating learn card (Compounding, Four Laws, Two-Minute Rule, Never Miss Twice, Identity-Based Habits). Tapping opens `/tools/habits/learn/[slug]`. Cards cycle in a fixed order; the user can dismiss the current card to advance (mirrors the gratitude break-card cycling pattern in `src/features/gratitude/gratitude-home-screen.tsx`).

---

## 7. New / Edit Habit Form

Single-screen guided form. All fields except `name` are optional, but each field is anchored to a Law and includes the workbook prompt as placeholder text so the form doubles as a teaching surface.

| Section                               | Field                    | Placeholder / prompt                                                      |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| **Identity**                          | `identity`               | _"I'm the kind of person who…"_                                           |
| **Habit name**                        | `name` (required)        | e.g., _"Read"_, _"Walk after lunch"_                                      |
| **Build or break**                    | `kind`                   | Segmented control. Phase 1 ships with `build` only; Phase 3 adds `break`. |
| **Two-Minute Version (Make It Easy)** | `two_minute_version`     | _"Make the starter version under two minutes. e.g., Read one page."_      |
| **Cue (Make It Obvious)**             | `cue_plan`               | _"I will \[BEHAVIOUR] at \[TIME] in \[LOCATION]."_                        |
| **Stack After (Make It Obvious)**     | `stack_after`            | _"After \[CURRENT HABIT], I will…"_                                       |
| **Pairing (Make It Attractive)**      | `craving_pairing`        | _"Only do \[want] while doing \[need]."_                                  |
| **Reward (Make It Satisfying)**       | `reward_note`            | _"How will you mark this as a small win?"_                                |
| **Cadence**                           | `cadence`, `custom_days` | Default daily. Custom is a seven-day toggle row.                          |
| **Colour**                            | `color`                  | Palette tokens only.                                                      |

Save inserts a row in `public.habits`. The form persists drafts to AsyncStorage so a failed save survives (same pattern as the CBT thought record).

---

## 8. Insights (Phase 3)

Quiet, private, frequency-based. Surfaces on `/tools/habits` and on each habit detail.

- **Weekly rhythm** — number of ticks per weekday over the last 4 weeks. No streak language.
- **Identity round-up** — for each distinct identity, the count of ticks contributing to it this month.
- **Two-minute floor adoption** — share of habits with a two-minute version filled in. Information, not a score.

No leaderboards, no comparisons across users, no AI-derived recommendations.

---

## 9. Privacy and Safety

- RLS owner-only on `public.habits` and `public.habit_logs`; mirrors CBT, gratitude, and meditation. Policies: `select`, `insert`, `update`, `delete` each scoped to `auth.uid() = user_id`.
- Both tables are included in `export_user_data()` under `habits` and `habitLogs`.
- Account deletion removes habits and logs via FK cascade.
- Repository never logs habit names, identities, or note text. Telemetry, if any, is limited to counts.
- No medical framing. Habit tracking is a self-design tool, not therapy or treatment. Copy must not imply that habits fix depression, anxiety, ADHD, or substance use.
- Empty states invite naming one small two-minute habit; must never reference missed days, broken streaks, or behind-schedule status.
- Crisis and emergency guidance remain in the existing public crisis route.

---

## 10. Non-Goals

- Push reminders or daily notifications (Phase 1).
- Streak counters with flames, decay animations, or "X days lost" copy.
- Public sharing, friend lists, accountability partners, leaderboards, or any social surface.
- AI-suggested habits, sentiment analysis on notes, or auto-generated identities.
- Quantified goal targets ("run 100 km this month"). The module captures the system, not the target.
- Paid coaching, premium habit packs, or anything that gates the existing free product.
- Mood correlation overlays. Mood remains in the mood tracker.

---

## 11. Implementation Sequencing

| Phase                                           | Scope                                                                                                                                                                                                                                                           | Notes                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **0 — Spec & plan** ✅                          | This document. Data shape finalised. Asset paths decided. Onboarding copy drafted in both languages.                                                                                                                                                            | Shipped.                                                                       |
| **1 — Foundation** ✅                           | DB migration for `habits` + `habit_logs` + `habitsOnboardingCompleted`. `habits` i18n namespace. Onboarding modal (4 steps). `?` re-open icon. Home with new-habit CTA, tap-to-tick, week strip, recent activity. Build-only.                                   | Shipped. Replaces the `/tools/habits` placeholder.                             |
| **2 — Notes & history** ✅                      | Optional note per tick. `/tools/habits/history` chronological list. Edit and archive flows. Calendar heat-strip on detail.                                                                                                                                      | Shipped.                                                                       |
| **3 — Inverse laws (break a habit)** ✅         | `kind = 'break'` variant on the form. Inverse-law prompts (Make It Invisible / Unattractive / Difficult / Unsatisfying). Detail strategies card adapts labels.                                                                                                  | Shipped. Tick semantics: a "tick" on a break habit means "I avoided it today." |
| **4 — Learn cards** ✅                          | Learn-card carousel on home. Ten cards: Compounding, Systems Over Goals, Habit Loop, Make It Obvious/Attractive/Easy/Satisfying, Two-Minute Rule, Never Miss Twice, Identity-Based Habits. `/tools/habits/learn/[slug]` detail and `/tools/habits/learn` index. | Shipped. Cards cycle locally; dismissal is session-only.                       |
| **5 — Insights** ✅                             | Weekly rhythm chart (last 4 weeks), identity round-up (this month), two-minute floor adoption. All private and on-device-derived.                                                                                                                               | Shipped. Pure helpers in `src/features/habits/insights.ts`.                    |
| **6 — Reminders (out of scope until reviewed)** | If approved later, off by default; piggyback on the existing reminder-consent gate.                                                                                                                                                                             | Explicitly _not_ shipped.                                                      |

---

## 12. Acceptance Bar (Phase 1)

Phase 1 is ready to ship when:

- DB migration creates `habits`, `habit_logs`, and the `habitsOnboardingCompleted` column with the documented RLS policies, triggers, and indexes.
- `UserPreferences`, `defaultUserPreferences`, and `export_user_data()` include the new field and tables.
- Onboarding modal renders all 4 steps, both in English and Bulgarian; `?` icon re-opens it; completion is persisted.
- Home screen shows the new-habit CTA, today's habits with tap-to-tick, the seven-day week strip, recent activity, and a learn card.
- The `Never Miss Twice` quiet note appears only when the user missed exactly the previous day and disappears when ticked or two-or-more days elapse.
- New-habit form persists with all documented fields and supports edit / archive.
- Tap-to-tick is idempotent: tapping twice on the same day toggles the tick (no duplicate rows; uniqueness enforced at the DB level).
- RLS policies scoped to `auth.uid()` cover insert, select, update, delete on both tables.
- Empty and list states contain no streak, missed-day, or shame language.
- Schema tests, one repository round-trip test, and one component state test for tap-to-tick toggling.
- Asset attribution noted in `assets/images/onboarding/README.md` (or equivalent licence note) for any infographic-derived imagery.

---

## 13. Asset & Localisation Notes

- Three onboarding illustrations adapted from the supplied infographic (background-free variant):
  - `assets/images/onboarding/habits-loop.png` — habit-loop circle.
  - `assets/images/onboarding/habits-four-laws.png` — four-law cycle with icons.
  - `assets/images/onboarding/habits-identity.png` — identity silhouette.
- Both languages ship together. Translations land in `src/i18n/locales/{en,bg}/habits.json` and the relevant nav keys (`sidebar.habits`, `today.tools.habits`, `today.tools.habitsSub`) already exist — drop the `badgeSoon` once Phase 1 ships.

---

## 14. Decisions

| Question                      | Decision                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module vs tool                | **Tool**, under `/tools/habits/*`. Habit formation is a life-design practice, not a psychotherapy framework; CBT/ACT/DBT remain the clinical-framework `Module` group.                                                      |
| Streaks                       | **Not surfaced**. The week strip shows last-7 ticks visually but never displays a streak number, flame, or "X days in a row" copy.                                                                                          |
| Never Miss Twice surfacing    | **Quiet single-line note**, shown only after exactly one missed day. Removed the moment the user ticks today or two-plus days have passed. No notifications, no escalation.                                                 |
| Build vs break in Phase 1     | **Build only**. Inverse-law support (break a habit) ships in Phase 3 so the form remains simple and the four-law prompts stay consistent.                                                                                   |
| Reminders                     | **Out of scope** until the broader reminder posture is reviewed. If added, off by default and consented per AGENTS.md.                                                                                                      |
| Goals / targets               | **Not collected.** Systems over goals. The module captures the system (the daily action), not the outcome.                                                                                                                  |
| One row per day vs cumulative | **One `habit_logs` row per `(habit_id, logged_on)`**, enforced by a unique index. Tap-to-untick deletes the row. Absence of a row is the canonical "missed" state — no nightly backfill, no punitive "missed: true" record. |
| Localisation                  | **Both languages from the start** — English and Bulgarian translations ship together, matching the existing app coverage (gratitude precedent).                                                                             |

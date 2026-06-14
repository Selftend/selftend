# Gratitude Module Spec - Kurzgesagt Gratitude Journal

**Source:** _Gratitude Journal_ - Kurzgesagt / in a nutshell (kurzgesagt GmbH, 2021, ISBN 9783000635205)
**Status:** Canonical spec for the gratitude module - replaces the lightweight `gratitude-log.md`
**Audience:** Developers and product contributors

---

## 1. Framework Overview

### The Three Levels of Practice

The book structures gratitude practice as three progressive levels, each building on the last. Unlike the meditation module's ten stages, these levels are not mutually exclusive - a user may operate at all three simultaneously once they reach Level 3.

| Level | Name                      | Core skill                                        |
| ----- | ------------------------- | ------------------------------------------------- |
| **1** | Noticing                  | Observe daily events without judgment             |
| **2** | Reflecting & Appreciating | Mentally subtract positives to feel their value   |
| **3** | Practicing Gratitude      | Write "I'm grateful for..." sentences 1-3× weekly |

### Core Principles

- **Non-competitive** - nobody is watching; there is no failure mode.
- **Frequency** - 1-3 times per week outperforms daily in several studies (hedonic adaptation). The tool must never pressure daily entries.
- **Small things count** - a croissant, sunshine, sleeping in. Copy must never imply that only big events qualify.
- **Non-clinical** - gratitude practice is a private reflection tool, not therapy or treatment.

### Science Basis (from the book and the supplied data table)

| Finding                                                                                              | Source                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------- |
| Gratitude journaling produces significantly better mental health than psychotherapy alone            | Wong et al., 2018       |
| Gratitude letters have far more positive impact than writers expect; recipients rate happiness 4/5   | Kumar & Epley, 2018     |
| Acting selflessly activates brain reward areas and cingulate cortex, producing feelings of gratitude | Yu et al., 2018         |
| High gratitude correlates with greater patience and tolerance for delayed rewards                    | Dickens & DeSteno, 2016 |
| Writing 1× per week can prevent hedonic adaptation better than daily writing                         | Armenta et al., 2014    |
| Temporarily giving up enjoyable things fights habituation and renews appreciation                    | Quoidbach & Dunn, 2013  |
| Gratitude makes people more social and more likely to include others in activities                   | Bartlett et al., 2011   |
| Gratitude exercises have lower dropout rates than other psychotherapy interventions                  | Geraghty et al., 2010   |
| Writing gratitude before bed leads to longer, better-quality sleep                                   | Wood et al., 2009       |
| Mental subtraction of positive events increases happiness and positive life outlook                  | Koo & Algoe, 2008       |
| Gratitude reduces stress and depression and builds resilience                                        | Wood et al., 2008       |
| Higher gratitude correlates with healthier food choices                                              | Fritz et al., 2019      |

---

## 2. Exercises (Break Cards)

The book interleaves seven named exercises and six science-input cards throughout its journaling pages. These become the interactive "breaks" inside the module - surfaced in the home or as optional prompts.

### Exercises from Positive Psychology

| Exercise              | Description                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gratitude Letter**  | Write a letter to someone you are grateful for. Detail how they affect your life. You don't have to send it - writing it alone shifts mindset. |
| **Acts of Kindness**  | Perform deliberate small acts of kindness for others and note them. Extends gratitude outward.                                                 |
| **The I-Did-It List** | At day's end, write everything you accomplished - big or small - instead of a to-do list. Counteracts the feeling of never doing enough.       |

### Exercises from Stoicism

| Exercise                         | Description                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **You Get to Choose**            | Identify something you got stressed about that is outside your control. Practice distinguishing what you can and cannot change. |
| **Don't Make Things Harder**     | When the list feels hard, notice simple things nearby: color of your shirt, sunshine, sleep quality. Nothing is off-limits.     |
| **Instructions for Unhappiness** | Notice "conditional happiness" thinking (I'll be happy once X). Write down what past-you wanted that present-you already has.   |

### Exercise from Positive Psychology / Mental Subtraction

| Exercise                        | Description                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What if That Didn't Happen?** | Pick a positive life event. Imagine the circumstances that prevented it. Appreciate that it happened. (Mental Subtraction of Events, Koo & Algoe 2008.) |
| **Give It Up**                  | Pick something you enjoy regularly. Give it up for a week. Reintroduce it. Notice renewed appreciation. (Fights hedonic adaptation.)                    |

---

## 3. Entry Data Shape

The book introduces gratitude as three progressive training levels. The app explains that progression during onboarding, then uses the ongoing journaling form for actual entries. `level` remains stored internally as `3` for compatibility with earlier migrations and exports, but users do not choose levels per entry.

### Level 1 - Noticing

| Prompt                                | Field                                  |
| ------------------------------------- | -------------------------------------- |
| What happened today? (up to 3 events) | `events[]` (text[], max 3 × 240 chars) |
| Did something good happen?            | `good_moment` (text, 240 chars)        |
| What could you be grateful for?       | `item_1` (text, 240 chars, required)   |

### Level 2 - Reflecting & Appreciating

| Prompt                                         | Field                                |
| ---------------------------------------------- | ------------------------------------ |
| What would you be sad about if it was missing? | `miss_if_gone` (text, 240 chars)     |
| Things you usually don't think about?          | `hidden_good` (text, 240 chars)      |
| What are you grateful for today?               | `item_1` (text, 240 chars, required) |

### Level 3 - Practicing Gratitude

| Prompt                                    | Field                                                    |
| ----------------------------------------- | -------------------------------------------------------- |
| I'm grateful for... (today, up to 5)      | `items[]` (text[], 1-5 × 240 chars, at least 1 required) |
| I'm grateful for... (in my life, up to 3) | `life_items[]` (text[], 0-3 × 240 chars)                 |
| Optional note                             | `note` (text, 2000 chars)                                |

New entries are saved with `level = 3`. Level 1 and Level 2 columns remain in the table as compatibility fields and are exported if present, but the user-facing editor does not expose separate Level 1/2 modes.

### Full Table - `public.gratitude_entries`

| column       | type        | notes                                              |
| ------------ | ----------- | -------------------------------------------------- |
| id           | uuid        | primary key                                        |
| user_id      | uuid        | FK auth.users, on delete cascade                   |
| level        | smallint    | 1, 2, or 3                                         |
| events       | text[]      | NOT NULL, default `{}`, Level 1                    |
| good_moment  | text        | NOT NULL, default `''`, Level 1                    |
| miss_if_gone | text        | NOT NULL, default `''`, Level 2                    |
| hidden_good  | text        | NOT NULL, default `''`, Level 2                    |
| item_1       | text        | NOT NULL, required, ≤ 240 chars                    |
| item_2       | text        | NOT NULL, default `''`, ≤ 240 chars                |
| item_3       | text        | NOT NULL, default `''`, ≤ 240 chars                |
| item_4       | text        | NOT NULL, default `''`, ≤ 240 chars (Level 3 only) |
| item_5       | text        | NOT NULL, default `''`, ≤ 240 chars (Level 3 only) |
| life_item_1  | text        | NOT NULL, default `''`, ≤ 240 chars (Level 3 only) |
| life_item_2  | text        | NOT NULL, default `''`, ≤ 240 chars (Level 3 only) |
| life_item_3  | text        | NOT NULL, default `''`, ≤ 240 chars (Level 3 only) |
| note         | text        | NOT NULL, default `''`, ≤ 2000 chars               |
| starred      | boolean     | NOT NULL, default `false`, Favorite Moments        |
| logged_at    | timestamptz | default now() UTC                                  |
| created_at   | timestamptz | default now() UTC                                  |
| updated_at   | timestamptz | trigger-maintained                                 |

Indexes: `(user_id, logged_at desc)` and `(user_id, starred, logged_at desc)` for the Favorite Moments collection.

**Migration note:** existing `gratitude_entries` rows (written under the old lightweight spec) have `level = 3` and their `item_1`-`item_3` values backfilled. All new Level-1/2 columns, Level-3 `item_4`/`item_5`, and `starred` default to empty or false values, so existing rows remain valid.

---

## 4. Module Contract

This module follows the contract in `tools.md`:

- `ModuleKey`: `"gratitude"` - added to the union in `src/features/modules/types.ts`.
- Default `enabledModules` stays `["cbt"]`; gratitude is opt-in via the modules discovery screen.
- i18n namespace: `gratitude:*`.
- Route group: `/modules/gratitude/*` (see §6). Existing `/tools/gratitude-log/*` routes become compatibility redirects.
- New `user_preferences` fields:
  - `gratitudeOnboardingCompleted: boolean` (default `false`)
- No reminder fields - reminders remain out of scope for this module.
- Settings can reset the onboarding flag (same pattern as CBT and meditation).

---

## 5. Routes

| Route                                  | Purpose                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `/modules/gratitude`                   | Home: new-entry CTA, insights, recent entries, break card carousel   |
| `/modules/gratitude/onboarding`        | Full-screen fallback / revisit route for the onboarding modal        |
| `/modules/gratitude/new`               | Create entry - ongoing gratitude journal form                        |
| `/modules/gratitude/entries`           | Private history list                                                 |
| `/modules/gratitude/entries/[id]`      | Entry detail; edit / delete                                          |
| `/modules/gratitude/entries/[id]/edit` | Edit an entry                                                        |
| `/modules/gratitude/favorites`         | Favorite Moments collection for starred entries                      |
| `/modules/gratitude/breaks/[slug]`     | Single exercise or science card (Gratitude Letter, Give It Up, etc.) |
| `/tools/gratitude-log`                 | Compat redirect → `/modules/gratitude`                               |
| `/tools/gratitude-log/new`             | Compat redirect → `/modules/gratitude/new`                           |
| `/tools/gratitude-log/[id]`            | Compat redirect → `/modules/gratitude/entries/[id]`                  |
| `/tools/gratitude-log/[id]/edit`       | Compat redirect → `/modules/gratitude/entries/[id]/edit`             |

---

## 6. Onboarding Flow (Modal Wizard)

Mirrors `src/components/app/meditation-onboarding-modal.tsx`. Three steps; only Step 1 is mandatory. Completion tracked via `gratitudeOnboardingCompleted` on `user_preferences`. A `?` icon next to the module title re-opens the modal (same pattern as meditation).

**Step 1 - Welcome: The Science of Gratitude**

- Infographic (the supplied "Science of Gratitude: A Guide to a Happier Mind" image).
- Two-sentence summary: gratitude is one of the strongest predictors of happiness, friendship, and resilience - and it is backed by peer-reviewed research.
- Continue / Skip available.

**Step 2 - The Three Levels**

- Show the three-levels illustration (Level 1: noticing the small things; Level 2: mental subtraction; Level 3: building the habit).
- One short paragraph per level.
- Emphasis: no pressure, no failure, no competition.

**Step 3 - How Often**

- Science says 1-3× per week works better than daily (hedonic adaptation).
- No frequency commitment required - this is information only, not a goal the app will track.

Confirm writes `gratitudeOnboardingCompleted: true` to `user_preferences`. There is no level picker in the shipped product flow.

---

## 7. Home Screen

- **New Entry button** - always visible, opens the ongoing gratitude journal form.
- **Recent entries** - last 5-7 entries, each showing date, first item, and item count.
- **Insights** - quiet local frequency, common themes, and Favorite Moments entry points. No streak language.
- **Break Card** - one rotating exercise card (from the 9 named exercises above). Tapping opens the full break screen at `/modules/gratitude/breaks/[slug]`. Cards cycle in a fixed order; the user can dismiss the current card to advance.
- **`?` icon** in the title row - re-opens the onboarding modal.

---

## 8. Privacy and Safety

- RLS owner-only on all tables; mirrors CBT and meditation.
- Included in `export_user_data()` under `gratitudeEntries`.
- Account deletion removes entries via FK cascade.
- Repository never logs entry text.
- No medical framing. Gratitude logging is a private reflection practice, not therapy or treatment. Copy must not imply that it fixes depression, anxiety, or trauma.
- Empty states invite noticing one small thing; must not reference missed days or broken streaks.
- Crisis and emergency guidance remain in the existing public crisis route.

---

## 9. Non-Goals

- Push reminders or daily notifications.
- Streaks, badges, progress bars, or missed-day language.
- AI prompts, sentiment analysis, or recommendations.
- Social sharing, public posting, or peer interaction.
- Attachments, images, audio, tags, or search.
- Mood scoring or automatic mood correlation.

---

## 10. Implementation Sequencing

| Phase                        | Scope                                                                                                                                                                                                                                                          | Notes                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **0 - Spec & plan**          | This document. Data model finalized. Asset paths decided.                                                                                                                                                                                                      | Done when this file is merged.                                                                                             |
| **1 - Foundation**           | Module contract (`ModuleKey: "gratitude"`, `UserPreferences` fields, i18n namespace). Onboarding modal, `?` re-open icon. Home screen with new-entry CTA and recent entries. Ongoing gratitude entry form. Compat redirects from old `/tools/gratitude-log/*`. | Migrates the existing feature into the module pattern.                                                                     |
| **2 - Compatibility fields** | DB migration adding `events`, `good_moment`, `miss_if_gone`, `hidden_good`, `level` columns and backfilling existing rows to `level = 3`. These fields remain compatibility/export fields rather than separate product modes.                                  | Reflects the book's progression without making levels a permanent switcher.                                                |
| **3 - Break Cards**          | Break card carousel on home screen. Individual break screens for all 9 exercises. Card dismissal / rotation state (local, not persisted).                                                                                                                      | Can ship incrementally - start with 3 cards (Gratitude Letter, What if That Didn't Happen?, Instructions for Unhappiness). |
| **4 - Journal enhancements** | 5-item today list + 3-item "in my life" list. Pre-fill suggestions on some prompts (e.g., rotating variant questions from the book: "What made you laugh?", "Who was kind to you?", "What simple pleasure did you enjoy?").                                    | Enriches the core journaling experience.                                                                                   |
| **5 - Insights**             | Entry frequency chart (quiet, no streak language). Most-common gratitude themes (word frequency, private, never uploaded). Favorite Moments collection (surfaced from highest-rated or starred entries).                                                       | Deferred - same posture as meditation insights.                                                                            |

---

## 11. Acceptance Bar

Phase 1 is ready to ship when:

- `ModuleKey: "gratitude"` is added and type-checks pass.
- Onboarding modal renders all 3 steps; `?` icon re-opens it; completion is persisted.
- Home screen shows new-entry CTA, insights, and recent entries.
- Ongoing gratitude entry form works end-to-end (create, list, detail, edit, delete).
- Compat redirects return HTTP 301 to new routes.
- RLS policies scoped to `auth.uid()`.
- Exported data includes `gratitudeEntries`.
- Empty and list states contain no streak or missed-day language.
- Schema tests and one component state test.

The full module is ready to widen after all five phases pass their own per-phase acceptance checks and the meditation module has demonstrated the pattern is stable.

---

## 12. Decisions

| Question                   | Decision                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Level picker               | **Removed** - levels are onboarding education only. New entries use the ongoing gratitude journal form and persist `level = 3` internally for compatibility. |
| Break card cycling         | **Explicit dismiss only** - card stays until the user taps an X or "Next". State stored locally (session). Phase 3 will wire up AsyncStorage persistence.    |
| Favorite Moments (Phase 5) | **Separate collection page** - `/modules/gratitude/favorites` route showing starred entries. Mirrors the book's "Favorite Moments" section.                  |
| Localization               | **Both languages from the start** - English and Bulgarian translations ship together, matching the existing app coverage.                                    |

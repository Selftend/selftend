# Gratitude Log Module

**Status:** Legacy lightweight spec. The current canonical module spec is [gratitude.md](gratitude.md), which expands this log into the gratitude module, three-level onboarding education, and Favorite Moments collection.

Private one-to-three item gratitude entries. Lightweight by design: notice something, save it, come back later if useful. Separate from journaling, mood check-ins, and CBT self-care logs. No streaks, no required daily cadence, no reminders.

## User Problem

Some users want a small place to capture what was still good, kind, steady, or meaningful without writing a full journal entry or completing a CBT form.

## Feature Boundary

In scope:

- create / read / update / delete gratitude entries
- one to three short gratitude lines per entry
- optional short note for context
- list of recent entries with date, first item, item count, and note preview
- inclusion in account data export
- deletion when the account is deleted through FK cascade

Out of scope:

- streaks, daily goals, missed-day language, rewards, or completion pressure
- push reminders
- mood scoring or automatic mood correlation
- AI prompts, sentiment analysis, or recommendations
- social sharing, public posting, or peer interaction
- attachments, images, audio, tags, search, or templates

## Data Fields

Table `public.gratitude_entries`:

| column     | type        | notes                                                    |
| ---------- | ----------- | -------------------------------------------------------- |
| id         | uuid        | primary key                                              |
| user_id    | uuid        | FK to `auth.users(id) on delete cascade`                 |
| item_1     | text        | NOT NULL, required, non-blank after trim, <= 240 chars   |
| item_2     | text        | NOT NULL, default `''`, non-blank if set, <= 240 chars   |
| item_3     | text        | NOT NULL, default `''`, non-blank if set, <= 240 chars   |
| note       | text        | NOT NULL, default `''`, <= 2000 chars                    |
| logged_at  | timestamptz | default `timezone('utc', now())`                         |
| created_at | timestamptz | default `timezone('utc', now())`                         |
| updated_at | timestamptz | maintained by `set_current_timestamp_updated_at` trigger |

Indexed by `(user_id, logged_at desc)`.

## Privacy And Ownership

- Row-level security is enabled. Policies allow authenticated users to `select / insert / update / delete` only rows where `auth.uid() = user_id`.
- Entries are included in `export_user_data()` under `gratitudeEntries`.
- Account deletion removes entries through the `auth.users` FK cascade.
- The repository never logs entry text.
- Gratitude entries stay separate from `journal_entries` and CBT `self_care_logs.gratitude` so each tool keeps its own purpose and privacy contract.

## Safety And Framing

- No medical framing. Gratitude logging is a private reflection practice, not therapy or treatment.
- Copy must not imply that gratitude practice fixes depression, anxiety, trauma, or any diagnosis.
- Empty states should invite noticing one small thing. They must not say the user missed days or broke a streak.
- Crisis and emergency guidance stay in the existing public crisis route and broader safety surfaces.

## Reminders

None. The tool can appear in navigation and the tools overview, but it must not schedule notifications or create daily pressure.

## Acceptance Criteria

- A signed-in user can create an entry with at least one gratitude item.
- A signed-in user can list, open, edit, and delete their own entries.
- Save is disabled until at least one non-whitespace gratitude item exists.
- Exported data includes a `gratitudeEntries` array.
- Deleting the account removes gratitude rows.
- Entries are not visible to other users because RLS scopes access to `auth.uid()`.
- Empty and list states avoid streaks, guilt, or missed-day copy.

## Tests

- `src/features/gratitude/schemas.test.ts` - zod validation for empty items, item count, item length, and note length.
- `src/features/gratitude/repository.test.ts` - list, get, save insert/update, delete, trim and blank filtering.
- `src/features/gratitude/gratitude-list-screen.test.tsx` - empty state, populated state, and CTA routing.
- `src/features/gratitude/gratitude-entry-editor-screen.test.tsx` - create-mode render, save flow, blank filtering, edit prefill.

## Routes

- `/tools/gratitude-log` - list of recent entries
- `/tools/gratitude-log/new` - create a new entry
- `/tools/gratitude-log/[id]` - entry detail
- `/tools/gratitude-log/[id]/edit` - edit an entry

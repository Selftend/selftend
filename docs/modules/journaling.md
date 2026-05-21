# Journaling Module

Private free-text reflection. Lightweight by design: write something, save it, come back later. Separate from CBT thought records and from mood-tracker notes. No streaks, no required structure, no reminders.

## User problem

People often have one of:

- a thought they want out of their head before bed,
- a small noticing they don't want to lose,
- something that doesn't fit a CBT thought record or a mood check-in.

CBT and mood entries already have specific shapes. Journaling is the place to write without a frame.

## Feature boundary

In scope:

- create / read / update / delete free-text journal entries
- optional short title
- list of recent entries with date, title (or "Untitled"), and a one-line preview
- inclusion in account data export
- deletion when the account is deleted (cascade)

Out of scope (for now):

- search, tags, categories
- linking entries to mood logs, thought records, activities
- attachments, images, audio
- prompts, prefilled templates, or guided structures
- streaks, weekly counts
- push reminders (per project roadmap - opt-in journal notifications are not planned for MVP)

## Data fields

Table `public.journal_entries`:

| column     | type        | notes                                                    |
| ---------- | ----------- | -------------------------------------------------------- |
| id         | uuid        | primary key                                              |
| user_id    | uuid        | FK → `auth.users(id) on delete cascade`                  |
| title      | text        | NOT NULL, default `''`, ≤ 120 chars                      |
| body       | text        | NOT NULL, ≥ 1 char after trim, ≤ 20 000 chars            |
| created_at | timestamptz | default `timezone('utc', now())`                         |
| updated_at | timestamptz | maintained by `set_current_timestamp_updated_at` trigger |

Indexed by `(user_id, created_at desc)`. Body is checked non-blank at the DB layer with `length(btrim(body)) > 0`.

## Privacy and ownership

- Row-level security enabled. Policies allow each authenticated user to `select / insert / update / delete` only rows where `auth.uid() = user_id`. Anon access is denied.
- Entries are included in the user's `export_user_data()` payload under `journalEntries`.
- Account deletion removes entries via FK cascade - no extra `delete from` needed in `delete_user_account()`.
- No server-side analytics on entry content. The repository never logs entry text.

## Safety and framing

- No medical framing. Journaling is a private personal practice, not therapy.
- No emergency or crisis routing inside the journal flow - users in crisis are guided by the existing crisis route (`/crisis`) and the safety callout shown elsewhere.
- Empty state is gentle: "Write a few words about how today felt." Never "you haven't journaled in N days."

## Reminders

None. The roadmap explicitly defers any opt-in journaling push reminder. The in-app Today screen surfaces a "New journal entry" quick action; that is the only nudge.

## Acceptance criteria

- A signed-in user can create a journal entry with a body and an optional title, see it on the list, open it, edit it, and delete it (with a confirm modal).
- Exported data includes a `journalEntries` array in the JSON.
- Deleting the account removes the user's journal rows.
- Entries are not visible to any other user; this is verified by RLS (covered indirectly by the existing pattern; no new integration tests required for MVP).
- The editor disables Save until the body has non-whitespace content.

## Tests

- `src/features/journal/schemas.test.ts` - zod validation: empty / whitespace-only body rejected; overlong title / body rejected; valid entry accepted.
- `src/features/journal/repository.test.ts` - list, get, save (insert + update), delete; trim title/body.
- `src/features/journal/journal-list-screen.test.tsx` - empty state, populated state with title and preview, "Untitled" fallback, CTA routing.
- `src/features/journal/journal-entry-editor-screen.test.tsx` - create-mode render, save flow, edit-mode prefill from cache.

## Routes

- `/tools/journal` - list of recent entries
- `/tools/journal/new` - create a new entry
- `/tools/journal/[id]` - entry detail (read + delete)
- `/tools/journal/[id]/edit` - entry edit

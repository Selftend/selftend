# Journaling Module

Private free-text reflection. Lightweight by design: write something, save it, come back later. Separate from CBT thought records and from check-in notes. No streaks, no required structure, no reminders.

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
- overview with an exact 14-day words-per-day chart and five recent entries grouped by civil day
- recent rows with date, title (or "Untitled"), one-line preview, and word count
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

Both home hero stats are counted server-side, because the list query is capped at 50 entries and deriving them on the device would silently turn each into a "recent 50" figure once a user passes the cap. The entry count uses an exact PostgREST `head` count; the word count uses the `journal_word_total()` RPC, which sums word counts over the decrypting view and returns a single number. No word count is stored - it is derived per call - and no entry bodies cross the wire for the stat.

The overview's 14-day chart is also server-derived through `journal_writing_days()`. It returns a dense run of civil-day keys and exact word totals, using each entry's captured occurrence offset (or the viewer's time zone for legacy rows). It decrypts only bodies inside the requested window and never sends those bodies to the client.

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
- `src/features/journal/repository.test.ts` - list, get, save (insert + update), delete; trim title/body; word-total and writing-days RPC calls, coercion, and errors.
- `src/features/journal/journal-overview.test.ts` - 14-day chart shaping, civil-day groups, preview extraction, and writing-range labels.
- `src/features/journal/journal-list-screen.test.tsx` - split stats, exact chart, five grouped recent rows, empty state, fallback titles, and overview routing.
- `test/integration/journal-word-total.integration.test.ts` - `journal_word_total()` past the 50-entry cap, agreement with `countWords()`, per-user scoping, unauthenticated rejection.
- `test/integration/journal-writing-days.integration.test.ts` - dense 14-day output, captured civil-day bucketing, per-user scoping, and unauthenticated rejection.
- `test/e2e/journal-overview.e2e.test.ts` - English and Bulgarian overview at 360dp in light and dark themes, including overflow checks.
- `src/features/journal/journal-entry-editor-screen.test.tsx` - create-mode render, save flow, edit-mode prefill from cache.

## Routes

- `/tools/journal` - overview with writing chart and five recent entries
- `/tools/journal/new` - create a new entry
- `/tools/journal/[id]` - entry detail (read + delete)
- `/tools/journal/[id]/edit` - entry edit

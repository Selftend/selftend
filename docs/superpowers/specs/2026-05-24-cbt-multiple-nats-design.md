# CBT Thought Record — Multiple NATs Design

**Date:** 2026-05-24
**Status:** Approved

## Problem

The current thought record captures a single `automaticThought` string. The Think CBT Workbook (Exercise 12) expects multiple Negative Automatic Thoughts (NATs), each with an individual belief rating (0–100 %), and one marked as the "hot thought" — the most distressing thought that the rest of the exercise focuses on. This gap means users cannot replicate the full workbook exercise in the app.

## Decision

Replace `automaticThought: string` with `nats: NegativeAutomaticThought[]` throughout the stack. Each NAT carries its own belief rating and an `isHotThought` flag. Existing records are backfilled: the single `automatic_thought` value becomes `nats[0]` with `isHotThought: true` and `beliefRating: null`.

Hot-thought selection uses a dedicated form step (not inline marking) so the therapeutic intent is explicit: users first list all their thoughts, then are asked which distresses them most.

## Data Model

### TypeScript — `src/features/cbt/types.ts`

```typescript
export interface NegativeAutomaticThought {
  text: string;
  beliefRating: number | null; // 0–100; how strongly the user believes this thought
  isHotThought: boolean;
}

export interface ThoughtRecord {
  id: string;
  userId: string;
  situation: string;
  nats: NegativeAutomaticThought[]; // replaces automaticThought: string
  emotions: string[];
  emotionIntensityBefore: number | null;
  distortions: string[];
  evidenceFor: string[];
  evidenceAgainst: string[];
  balancedThought: string;
  emotionIntensityAfter: number | null;
  outcomeNotes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// ThoughtRecordInput and ThoughtRecordFormValues updated identically
```

`emotionIntensityBefore` / `emotionIntensityAfter` remain at record level — they measure overall emotional shift, not per-thought belief.

### Zod schema — `src/features/cbt/schemas.ts`

```typescript
const natSchema = z.object({
  text: z.string(),
  beliefRating: z.number().min(0).max(100).nullable(),
  isHotThought: z.boolean(),
});

export const thoughtRecordFormSchema = z.object({
  situation: z.string(),
  nats: z.array(natSchema), // replaces automaticThought: z.string()
  emotions: z.array(z.string()),
  emotionIntensityBefore: z.number().min(0).max(100).nullable(),
  distortions: z.array(z.string()),
  evidenceFor: z.array(z.string()),
  evidenceAgainst: z.array(z.string()),
  balancedThought: z.string(),
  emotionIntensityAfter: z.number().min(0).max(100).nullable(),
  outcomeNotes: z.string(),
});
```

## Database Migration

New file: `supabase/migrations/20260524_thought_records_multiple_nats.sql`

```sql
-- 1. Add nats column
ALTER TABLE public.thought_records
  ADD COLUMN IF NOT EXISTS nats jsonb NOT NULL DEFAULT '[]';

-- 2. Backfill existing records
UPDATE public.thought_records
SET nats = jsonb_build_array(
  jsonb_build_object(
    'text',        automatic_thought,
    'beliefRating', NULL,
    'isHotThought', true
  )
)
WHERE automatic_thought <> '';

-- 3. Drop legacy column
ALTER TABLE public.thought_records
  DROP COLUMN IF EXISTS automatic_thought;
```

Update `export_user_data()` RPC: replace `automatic_thought` with `nats` in the `thoughtRecords` select block.

## Form Flow

The single "Automatic thought" step is replaced by two new steps. Total becomes 8 steps.

| Step | Key                | Change                                                                     |
| ---- | ------------------ | -------------------------------------------------------------------------- |
| 1    | `situation`        | Unchanged                                                                  |
| 2    | `nats` ✦ new       | Add multiple thoughts; belief % slider per thought; remove button per card |
| 3    | `hotThought` ✦ new | Tap to select which NAT is most distressing; selected card highlighted     |
| 4    | `emotions`         | Unchanged                                                                  |
| 5    | `evidence`         | Hint text updated to reference the hot thought                             |
| 6    | `distortions`      | Unchanged                                                                  |
| 7    | `balancedThought`  | Summary card shows hot thought text instead of `automaticThought`          |
| 8    | `outcome`          | Unchanged                                                                  |

### Step 2 — NAT Entry UX

- Existing NATs rendered as cards: text + belief slider (0–100, step 10) + Remove link
- Inline add form below the list: text input + belief slider + "Add thought" button
- At least one NAT required to advance
- `ThoughtRecordStepKey` union gains `"nats"` and `"hotThought"`, loses `"automaticThought"`

### Step 3 — Hot Thought Selection UX

- Lists all NATs entered in Step 2
- Each is a tappable card showing text + belief %
- Selected card gets visual highlight (border + 🔥 indicator)
- Exactly one must be selected to advance; defaults to the NAT with the highest `beliefRating` (or first if tied/null)
- Selection sets `isHotThought: true` on that NAT and `false` on all others

## Detail Screen

`thought-record-detail-screen.tsx`:

- Replace the single `automaticThought` card with a NAT list
- Hot thought rendered first with a "Hot thought" label/badge
- Each NAT shows belief rating beneath the text
- Summary line in the `balancedThought` step references hot thought text

## Draft Store

`cbt-draft-store.ts`:

- No structural change — the store serialises the form schema as-is
- Bump the draft version/cache key so stale drafts containing `automaticThought` are discarded rather than hydrated into the new `nats` shape

## Repository & Queries

`src/features/cbt/repository.ts`:

- DB→TS mapping: `automatic_thought` → `nats` (parse jsonb array)
- Insert/update payload: `automatic_thought` → `nats` (serialise array to jsonb)

## i18n

Both `en/cbt.json` and `bg/cbt.json`:

- Remove: `automaticThought`, `automaticThoughtHint`, `automaticThoughtPlaceholder`, `automaticThoughtExample`
- Add under `record`:
  - `nats`, `natsHint`, `natsPlaceholder`, `addThought`, `removeThought`, `beliefRating`, `beliefRatingHint`
  - `hotThought`, `hotThoughtHint`, `hotThoughtInstruction`, `hotThoughtBadge`
  - Update `step2` label text to "2. Your thoughts"; add `step3` key "3. Hot thought"; shift existing `step3`–`step5` label text to `step4`–`step6`
- Update: `summaryThought` to reference hot thought

## Out of Scope

- Reordering form steps to match workbook column order (emotions before NATs)
- Adding missing cognitive distortions (separate spec)
- Adding missing workbook exercises/tools (separate spec)

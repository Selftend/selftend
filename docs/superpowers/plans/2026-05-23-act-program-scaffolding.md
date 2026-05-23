# ACT Program Scaffolding + Choice Point Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the guided four-week ACT program engine (mirroring the CBT program) plus the Choice Point tool and the Drop Anchor technique that the program's foundation week depends on.

**Architecture:** This is Phase 1 of the ACT 2nd-edition reconciliation in `docs/modules/act-harris-happiness-trap.md`. We add a new `act_choice_points` table and three `act_program_*` preference flags, a Choice Point CRUD feature (types -> repository -> queries -> screens -> routes), and the program machinery (`program-definition.ts` -> `derive-act-program.ts` -> `use-act-program.ts`) that exactly mirrors `src/features/cbt/`. We parameterize the shared `ProgramHero`/`ProgramGraduation` components by i18n namespace so both CBT and ACT reuse them. The four-week `ACT_PROGRAM` is defined here against the data that exists today; week-3 self-compassion and the week-4 maintenance-plan capstone are added in later phases (Phase 2/3), so this plan uses an interim week-4 capstone (a committed-action plan).

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase (Postgres + RLS), TanStack Query, react-i18next, NativeWind, Jest.

**Reference patterns (read before starting):**

- CBT program: `src/features/cbt/program-definition.ts`, `derive-program.ts`, `use-cbt-program.ts`
- ACT repository/queries: `src/features/act/repository.ts`, `src/features/act/queries.ts`, `src/features/act/repository.test.ts`
- Migration shape: `supabase/migrations/20260535_act_module.sql`, `20260545_cbt_program.sql`
- Preferences wiring: `src/features/modules/types.ts`, `src/features/settings/repository.ts`
- Shared program UI: `src/components/app/program-hero.tsx`, `program-graduation.tsx`

**Conventions:** camelCase in TS, snake*case in DB. All `act*\*` tables use RLS owner-only policies. Repository read functions swallow missing-schema errors. Do NOT commit unless the operator explicitly approves (project preference); the commit steps below are written for when approval is given.

---

### Task 1: Migration - choice points table, program flags, connection technique

**Files:**

- Create: `supabase/migrations/20260550_act_program_choice_point.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260550_act_program_choice_point.sql`:

```sql
-- ACT Phase 1: Choice Point map, program flags, and Drop Anchor connection technique.

-- 1. Choice Point maps (hooks / away moves / toward moves).
CREATE TABLE IF NOT EXISTS act_choice_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hooks TEXT[] NOT NULL DEFAULT '{}',
  away_moves TEXT[] NOT NULL DEFAULT '{}',
  toward_moves TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE act_choice_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ACT choice points"
  ON act_choice_points
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS act_choice_points_user_created
  ON act_choice_points (user_id, created_at DESC);

-- 2. Program lifecycle flags on user_preferences (mirror cbt_program_*).
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS act_program_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS act_program_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS act_program_prompt_dismissed_at timestamptz;

-- 3. Allow new connection techniques (Drop Anchor / body scan).
ALTER TABLE act_connection_logs
  DROP CONSTRAINT IF EXISTS act_connection_logs_technique_check;

ALTER TABLE act_connection_logs
  ADD CONSTRAINT act_connection_logs_technique_check
  CHECK (technique IN (
    'noticeFiveThings', 'mindfulActivity', 'tenDeepBreaths', 'dropAnchor', 'bodyScan'
  ));
```

> Note: `act_connection_logs` was created without a named technique CHECK in `20260537_act_presence.sql`. If `DROP CONSTRAINT IF EXISTS act_connection_logs_technique_check` finds no constraint, it is a harmless no-op; the `ADD CONSTRAINT` then installs the named one. Verify the original constraint name with the next step and adjust the `DROP` line if it differs.

- [ ] **Step 2: Verify the existing connection technique constraint name**

Run: `grep -n "technique" supabase/migrations/20260537_act_presence.sql`
Expected: shows how `technique` was constrained. If a different constraint name is present, update the `DROP CONSTRAINT IF EXISTS` line in the migration to match. If the column was created with an inline `CHECK (...)` without a name, Postgres auto-names it `act_connection_logs_technique_check` (table_column_check), so the migration as written is correct.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260550_act_program_choice_point.sql
git commit -m "feat(act): migration for choice points, program flags, drop anchor"
```

---

### Task 2: Types - ChoicePoint, ProgramPillar, extended ConnectionTechnique

**Files:**

- Modify: `src/features/act/types.ts`
- Test: `src/features/act/types.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/act/types.test.ts`:

```typescript
import { ACT_PROGRAM_PILLARS, CONNECTION_TECHNIQUES } from "@/src/features/act/types";

describe("ACT connection techniques", () => {
  it("includes dropAnchor and bodyScan", () => {
    expect(CONNECTION_TECHNIQUES).toContain("dropAnchor");
    expect(CONNECTION_TECHNIQUES).toContain("bodyScan");
  });
});

describe("ACT program pillars", () => {
  it("lists the four 2nd-edition pillars in order", () => {
    expect(ACT_PROGRAM_PILLARS).toEqual(["foundation", "bePresent", "openUp", "doWhatMatters"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/act/types.test.ts`
Expected: FAIL - `ACT_PROGRAM_PILLARS` is not exported and `CONNECTION_TECHNIQUES` lacks the new values.

- [ ] **Step 3: Implement the type changes**

In `src/features/act/types.ts`, change the `ConnectionTechnique` type and `CONNECTION_TECHNIQUES` array:

```typescript
export type ConnectionTechnique =
  | "noticeFiveThings"
  | "mindfulActivity"
  | "tenDeepBreaths"
  | "dropAnchor"
  | "bodyScan";
```

```typescript
export const CONNECTION_TECHNIQUES: ConnectionTechnique[] = [
  "noticeFiveThings",
  "mindfulActivity",
  "tenDeepBreaths",
  "dropAnchor",
  "bodyScan",
];
```

Append the program pillar type, the pillar list, and the ChoicePoint entity at the end of the file:

```typescript
export type ProgramPillar = "foundation" | "bePresent" | "openUp" | "doWhatMatters";

export const ACT_PROGRAM_PILLARS: ProgramPillar[] = [
  "foundation",
  "bePresent",
  "openUp",
  "doWhatMatters",
];

export interface ChoicePoint {
  id: string;
  userId: string;
  hooks: string[];
  awayMoves: string[];
  towardMoves: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChoicePointInput {
  hooks?: string[];
  awayMoves?: string[];
  towardMoves?: string[];
  notes?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/act/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/act/types.ts src/features/act/types.test.ts
git commit -m "feat(act): add ChoicePoint, ProgramPillar, drop-anchor technique types"
```

---

### Task 3: Preferences - wire act*program*\* flags through modules + settings

**Files:**

- Modify: `src/features/modules/types.ts`
- Modify: `src/features/settings/repository.ts`
- Test: `src/features/settings/repository.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/settings/repository.test.ts` (inside the existing top-level `describe` or as a new one):

```typescript
import { defaultUserPreferences } from "@/src/features/modules/types";

describe("act program preference flags", () => {
  it("defaults the three act program flags to null", () => {
    expect(defaultUserPreferences.actProgramStartedAt).toBeNull();
    expect(defaultUserPreferences.actProgramCompletedAt).toBeNull();
    expect(defaultUserPreferences.actProgramPromptDismissedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/settings/repository.test.ts`
Expected: FAIL - `actProgramStartedAt` does not exist on `defaultUserPreferences`.

- [ ] **Step 3: Add the fields to `UserPreferences` and defaults**

In `src/features/modules/types.ts`, add to the `UserPreferences` interface (next to the `cbtProgram*` fields, after line 36):

```typescript
actProgramStartedAt: string | null;
actProgramCompletedAt: string | null;
actProgramPromptDismissedAt: string | null;
```

And to `defaultUserPreferences` (after line 80):

```typescript
  actProgramStartedAt: null,
  actProgramCompletedAt: null,
  actProgramPromptDismissedAt: null,
```

- [ ] **Step 4: Wire the columns in settings/repository.ts**

In `src/features/settings/repository.ts`:

In the `UserPreferenceRow` interface (after the `act_reminder_timezone` line):

```typescript
act_program_started_at: string | null;
act_program_completed_at: string | null;
act_program_prompt_dismissed_at: string | null;
```

In `mapPreferences` (after the `actReminderTimezone` line):

```typescript
    actProgramStartedAt: row.act_program_started_at ?? null,
    actProgramCompletedAt: row.act_program_completed_at ?? null,
    actProgramPromptDismissedAt: row.act_program_prompt_dismissed_at ?? null,
```

In `isMissingOptionalPreferenceColumn`, extend the message check to include the new prefix (the columns may not exist on older DBs):

```typescript
maybeError.message.includes("act_") ||
  maybeError.message.includes("cbt_program_") ||
  maybeError.message.includes("shown_button_tours");
```

> `act_program_*` already matches `includes("act_")`, so no change is required here. Confirm by reading the function; leave it unchanged.

In `omitOptionalPreferenceColumns` (after the `cbt_program_prompt_dismissed_at` delete):

```typescript
delete fallbackPayload.act_program_started_at;
delete fallbackPayload.act_program_completed_at;
delete fallbackPayload.act_program_prompt_dismissed_at;
```

In `updateUserPreferences`'s `payload` (after the `act_reminder_timezone` line):

```typescript
    act_program_started_at: preferences.actProgramStartedAt,
    act_program_completed_at: preferences.actProgramCompletedAt,
    act_program_prompt_dismissed_at: preferences.actProgramPromptDismissedAt,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/features/settings/repository.test.ts`
Expected: PASS

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/modules/types.ts src/features/settings/repository.ts src/features/settings/repository.test.ts
git commit -m "feat(act): wire act_program_* preference flags"
```

---

### Task 4: Choice Point repository

**Files:**

- Modify: `src/features/act/repository.ts`
- Test: `src/features/act/repository.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/features/act/repository.test.ts`. First add `saveChoicePoint` and `listChoicePoints` to the import block at the top:

```typescript
import {
  // ...existing imports...
  listChoicePoints,
  saveChoicePoint,
} from "@/src/features/act/repository";
```

Then add:

```typescript
describe("act repository - choice points", () => {
  it("saveChoicePoint trims notes and defaults arrays", async () => {
    const row = {
      id: "cp-1",
      user_id: "u1",
      hooks: ["work deadline"],
      away_moves: ["doomscroll"],
      toward_moves: ["take one small step"],
      notes: "first map",
      created_at: "2026-05-23T08:00:00.000Z",
      updated_at: "2026-05-23T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { insert } }));

    const result = await saveChoicePoint("u1", {
      hooks: ["work deadline"],
      awayMoves: ["doomscroll"],
      towardMoves: ["take one small step"],
      notes: "  first map  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      hooks: ["work deadline"],
      away_moves: ["doomscroll"],
      toward_moves: ["take one small step"],
      notes: "first map",
    });
    expect(result.towardMoves).toEqual(["take one small step"]);
    expect(result.notes).toBe("first map");
  });

  it("listChoicePoints returns an empty list when the table is missing", async () => {
    const limit = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: "relation act_choice_points missing" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    mockRequireSupabase.mockReturnValue(buildClient({ act_choice_points: { select } }));

    expect(await listChoicePoints("u1")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/act/repository.test.ts -t "choice points"`
Expected: FAIL - `saveChoicePoint`/`listChoicePoints` are not exported.

- [ ] **Step 3: Implement the repository functions**

In `src/features/act/repository.ts`, add `ChoicePoint`/`ChoicePointInput` to the type import block, then append a new section at the end of the file:

```typescript
// ─── Choice Points ────────────────────────────────────────────────────────────

interface ChoicePointRow {
  id: string;
  user_id: string;
  hooks: string[] | null;
  away_moves: string[] | null;
  toward_moves: string[] | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapChoicePoint(row: ChoicePointRow): ChoicePoint {
  return {
    id: row.id,
    userId: row.user_id,
    hooks: row.hooks ?? [],
    awayMoves: row.away_moves ?? [],
    towardMoves: row.toward_moves ?? [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listChoicePoints(userId: string, limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_choice_points")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingACTSchemaError(error)) return [];
    throw error;
  }
  return (data as ChoicePointRow[]).map(mapChoicePoint);
}

export async function getChoicePoint(userId: string, choicePointId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_choice_points")
    .select("*")
    .eq("user_id", userId)
    .eq("id", choicePointId)
    .maybeSingle();

  if (error) {
    if (isMissingACTSchemaError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return mapChoicePoint(data as ChoicePointRow);
}

export async function saveChoicePoint(userId: string, input: ChoicePointInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("act_choice_points")
    .insert({
      user_id: userId,
      hooks: input.hooks ?? [],
      away_moves: input.awayMoves ?? [],
      toward_moves: input.towardMoves ?? [],
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapChoicePoint(data as ChoicePointRow);
}

export async function deleteChoicePoint(userId: string, choicePointId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("act_choice_points")
    .delete()
    .eq("user_id", userId)
    .eq("id", choicePointId);

  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/act/repository.test.ts -t "choice points"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/act/repository.ts src/features/act/repository.test.ts
git commit -m "feat(act): choice point repository CRUD"
```

---

### Task 5: Choice Point query hooks

**Files:**

- Modify: `src/features/act/queries.ts`

- [ ] **Step 1: Add the query key and hooks**

In `src/features/act/queries.ts`:

Add imports for the new repository functions to the existing import block:

```typescript
  deleteChoicePoint,
  getChoicePoint,
  listChoicePoints,
  saveChoicePoint,
```

Add to the `actKeys` object:

```typescript
  choicePointList: (userId: string | null) => ["act", "choicePoint", "list", u(userId)] as const,
  choicePointDetail: (userId: string | null, id: string | null) =>
    ["act", "choicePoint", "detail", u(userId), u(id)] as const,
```

Add `ChoicePointInput` to the type import block, then add hooks (a `// ─── Choice Points ───` section is fine):

```typescript
export function useChoicePoints(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: actKeys.choicePointList(userId),
    queryFn: () => listChoicePoints(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useChoicePoint(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointDetail(userId, id),
    queryFn: () => getChoicePoint(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveChoicePoint(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChoicePointInput) => saveChoicePoint(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.choicePointList(userId) });
    },
  });
}

export function useDeleteChoicePoint(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChoicePoint(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.choicePointList(userId) });
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/act/queries.ts
git commit -m "feat(act): choice point query hooks"
```

---

### Task 6: Program definition (`ACT_PROGRAM`)

**Files:**

- Create: `src/features/act/program-definition.ts`

This mirrors `src/features/cbt/program-definition.ts`. The signal data reads only ACT data that exists today. The week-3 "be kind or surf an urge" task uses urge-surf logs only (self-compassion is added in Phase 2). The week-4 capstone uses "committed action created" (the maintenance plan replaces it in Phase 3).

- [ ] **Step 1: Write the program definition**

Create `src/features/act/program-definition.ts`:

```typescript
import type { Href } from "expo-router";

import type {
  ChoicePoint,
  CommittedAction,
  ActionStep,
  ConnectionLog,
  DefusionLog,
  ExpansionLog,
  ObservingSelfSession,
  ProgramPillar,
  UrgeSurfLog,
  ValueEntry,
} from "@/src/features/act/types";
import type { MoodLog } from "@/src/features/mood/types";

/** All data the signal functions may read. Arrays are the user's full history. */
export interface ActProgramSignalData {
  since: number; // Date.now() of program start; only data created at/after counts
  choicePoints: ChoicePoint[];
  valueEntries: ValueEntry[];
  connectionLogs: ConnectionLog[];
  observingSessions: ObservingSelfSession[];
  defusionLogs: DefusionLog[];
  expansionLogs: ExpansionLog[];
  urgeSurfLogs: UrgeSurfLog[];
  committedActions: CommittedAction[];
  actionSteps: ActionStep[];
  moodLogs: MoodLog[];
}

export interface SignalResult {
  current: number;
  target: number;
}

export interface ProgramTaskDef {
  key: string;
  labelKey: string; // i18n key under act:program.tasks
  route: Href;
  signal: (data: ActProgramSignalData) => SignalResult;
}

export interface ProgramWeek {
  key: string;
  themeLabelKey: string; // i18n key under act:program.weeks
  pillar: ProgramPillar;
  tasks: ProgramTaskDef[];
}

export const atOrAfter = (iso: string | null | undefined, since: number) =>
  iso != null && new Date(iso).getTime() >= since;

const countSince = (items: { createdAt: string }[], since: number) =>
  items.filter((item) => atOrAfter(item.createdAt, since)).length;

// Number of distinct calendar days (UTC) on which a qualifying event occurred
// at or after the program start. Used for recurring "daily practice" tasks so
// they cannot be completed in a single sitting.
const distinctDays = (timestamps: (string | null | undefined)[], since: number) => {
  const days = new Set<string>();
  for (const ts of timestamps) {
    if (atOrAfter(ts, since)) days.add(new Date(ts as string).toISOString().slice(0, 10));
  }
  return days.size;
};

const DAILY_PRACTICE_TARGET = 4;

export const ACT_PROGRAM: ProgramWeek[] = [
  {
    key: "foundation",
    themeLabelKey: "program.weeks.foundation",
    pillar: "foundation",
    tasks: [
      {
        key: "mapChoicePoint",
        labelKey: "program.tasks.mapChoicePoint",
        route: "/modules/act/choice-point/new",
        signal: ({ choicePoints, since }) => ({
          current: countSince(choicePoints, since),
          target: 1,
        }),
      },
      {
        key: "clarifyValue",
        labelKey: "program.tasks.clarifyValue",
        route: "/modules/act/values",
        signal: ({ valueEntries, since }) => ({
          current: valueEntries.filter((v) => atOrAfter(v.updatedAt, since)).length,
          target: 1,
        }),
      },
      {
        key: "dailyMoodCheckIn",
        labelKey: "program.tasks.dailyMoodCheckIn",
        route: "/tools/mood-tracker/new",
        signal: ({ moodLogs, since }) => ({
          current: distinctDays(
            moodLogs.map((m) => m.loggedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
        }),
      },
    ],
  },
  {
    key: "bePresent",
    themeLabelKey: "program.weeks.bePresent",
    pillar: "bePresent",
    tasks: [
      {
        key: "dropAnchorDays",
        labelKey: "program.tasks.dropAnchorDays",
        route: "/modules/act/connection",
        signal: ({ connectionLogs, since }) => ({
          current: distinctDays(
            connectionLogs.map((c) => c.createdAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
        }),
      },
      {
        key: "observeSelf",
        labelKey: "program.tasks.observeSelf",
        route: "/modules/act/observing-self",
        signal: ({ observingSessions, since }) => ({
          current: countSince(observingSessions, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "openUp",
    themeLabelKey: "program.weeks.openUp",
    pillar: "openUp",
    tasks: [
      {
        key: "unhookThoughtDays",
        labelKey: "program.tasks.unhookThoughtDays",
        route: "/modules/act/defusion",
        signal: ({ defusionLogs, since }) => ({
          current: distinctDays(
            defusionLogs.map((d) => d.createdAt),
            since,
          ),
          target: 3,
        }),
      },
      {
        key: "makeRoom",
        labelKey: "program.tasks.makeRoom",
        route: "/modules/act/expansion",
        signal: ({ expansionLogs, since }) => ({
          current: countSince(expansionLogs, since),
          target: 1,
        }),
      },
      {
        // Phase 2 adds self-compassion logs to this signal; for now: urge surfing.
        key: "kindOrSurf",
        labelKey: "program.tasks.kindOrSurf",
        route: "/modules/act/expansion/urge-surfing",
        signal: ({ urgeSurfLogs, since }) => ({
          current: countSince(urgeSurfLogs, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "doWhatMatters",
    themeLabelKey: "program.weeks.doWhatMatters",
    pillar: "doWhatMatters",
    tasks: [
      {
        key: "valuesStepDays",
        labelKey: "program.tasks.valuesStepDays",
        route: "/modules/act/committed-action",
        signal: ({ actionSteps, since }) => ({
          current: distinctDays(
            actionSteps.map((s) => s.completedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
        }),
      },
      {
        // Phase 3 replaces this capstone with the maintenance plan.
        key: "buildActionPlan",
        labelKey: "program.tasks.buildActionPlan",
        route: "/modules/act/committed-action/new",
        signal: ({ committedActions, since }) => ({
          current: countSince(committedActions, since),
          target: 1,
        }),
      },
    ],
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (all referenced types exist; routes are valid `Href` strings).

- [ ] **Step 3: Commit**

```bash
git add src/features/act/program-definition.ts
git commit -m "feat(act): four-week ACT_PROGRAM definition"
```

---

### Task 7: Derive program view

**Files:**

- Create: `src/features/act/derive-act-program.ts`
- Test: `src/features/act/derive-act-program.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/act/derive-act-program.test.ts`:

```typescript
import {
  deriveActProgram,
  type DeriveActProgramInput,
} from "@/src/features/act/derive-act-program";

const empty: Omit<DeriveActProgramInput, "startedAt" | "completedAt" | "now"> = {
  choicePoints: [],
  valueEntries: [],
  connectionLogs: [],
  observingSessions: [],
  defusionLogs: [],
  expansionLogs: [],
  urgeSurfLogs: [],
  committedActions: [],
  actionSteps: [],
  moodLogs: [],
};

describe("deriveActProgram", () => {
  it("returns not_started when there is no start date", () => {
    const view = deriveActProgram({
      startedAt: null,
      completedAt: null,
      now: Date.now(),
      ...empty,
    });
    expect(view.status).toBe("not_started");
    expect(view.weeks).toEqual([]);
    expect(view.totalWeeks).toBe(4);
  });

  it("marks the foundation choice-point task done after one map is created since start", () => {
    const startedAt = "2026-05-01T00:00:00.000Z";
    const view = deriveActProgram({
      startedAt,
      completedAt: null,
      now: new Date("2026-05-02T00:00:00.000Z").getTime(),
      ...empty,
      choicePoints: [
        {
          id: "cp1",
          userId: "u1",
          hooks: [],
          awayMoves: [],
          towardMoves: [],
          notes: "",
          createdAt: "2026-05-01T09:00:00.000Z",
          updatedAt: "2026-05-01T09:00:00.000Z",
        },
      ],
    });
    const foundation = view.weeks[0];
    const task = foundation.tasks.find((t) => t.key === "mapChoicePoint")!;
    expect(task.current).toBe(1);
    expect(task.done).toBe(true);
  });

  it("reports graduated when completedAt is set", () => {
    const view = deriveActProgram({
      startedAt: "2026-05-01T00:00:00.000Z",
      completedAt: "2026-05-28T00:00:00.000Z",
      now: new Date("2026-05-28T00:00:00.000Z").getTime(),
      ...empty,
    });
    expect(view.status).toBe("graduated");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/act/derive-act-program.test.ts`
Expected: FAIL - module `derive-act-program` does not exist.

- [ ] **Step 3: Implement the derive logic**

Create `src/features/act/derive-act-program.ts` (mirrors `src/features/cbt/derive-program.ts`):

```typescript
import {
  atOrAfter,
  ACT_PROGRAM,
  type ActProgramSignalData,
  type ProgramPillar,
} from "@/src/features/act/program-definition";
import type { Href } from "expo-router";

import type {
  ChoicePoint,
  CommittedAction,
  ActionStep,
  ConnectionLog,
  DefusionLog,
  ExpansionLog,
  ObservingSelfSession,
  UrgeSurfLog,
  ValueEntry,
} from "@/src/features/act/types";
import type { MoodLog } from "@/src/features/mood/types";

export type ProgramStatus = "not_started" | "in_progress" | "graduated";

export interface DeriveActProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  now: number;
  choicePoints: ChoicePoint[];
  valueEntries: ValueEntry[];
  connectionLogs: ConnectionLog[];
  observingSessions: ObservingSelfSession[];
  defusionLogs: DefusionLog[];
  expansionLogs: ExpansionLog[];
  urgeSurfLogs: UrgeSurfLog[];
  committedActions: CommittedAction[];
  actionSteps: ActionStep[];
  moodLogs: MoodLog[];
}

export interface ProgramTaskView {
  key: string;
  labelKey: string;
  route: Href;
  current: number;
  target: number;
  done: boolean;
}

export interface ProgramWeekView {
  key: string;
  themeLabelKey: string;
  pillar: ProgramPillar;
  tasks: ProgramTaskView[];
  done: boolean;
}

export interface ActProgramSummaryStats {
  choicePoints: number;
  defusionLogs: number;
  expansionLogs: number;
  committedActions: number;
}

export interface ActProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  currentWeekIndex: number;
  totalWeeks: number;
  weeks: ProgramWeekView[];
  weeksComplete: number;
  allWeeksComplete: boolean;
  summaryStats: ActProgramSummaryStats;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function deriveActProgram(inputData: DeriveActProgramInput): ActProgramView {
  const { startedAt, completedAt, now } = inputData;
  const totalWeeks = ACT_PROGRAM.length;

  const emptyStats: ActProgramSummaryStats = {
    choicePoints: 0,
    defusionLogs: 0,
    expansionLogs: 0,
    committedActions: 0,
  };

  if (!startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      currentWeekIndex: 0,
      totalWeeks,
      weeks: [],
      weeksComplete: 0,
      allWeeksComplete: false,
      summaryStats: emptyStats,
    };
  }

  const since = new Date(startedAt).getTime();
  const signalData: ActProgramSignalData = {
    since,
    choicePoints: inputData.choicePoints,
    valueEntries: inputData.valueEntries,
    connectionLogs: inputData.connectionLogs,
    observingSessions: inputData.observingSessions,
    defusionLogs: inputData.defusionLogs,
    expansionLogs: inputData.expansionLogs,
    urgeSurfLogs: inputData.urgeSurfLogs,
    committedActions: inputData.committedActions,
    actionSteps: inputData.actionSteps,
    moodLogs: inputData.moodLogs,
  };

  const weeks: ProgramWeekView[] = ACT_PROGRAM.map((week) => {
    const tasks: ProgramTaskView[] = week.tasks.map((task) => {
      const { current, target } = task.signal(signalData);
      return {
        key: task.key,
        labelKey: task.labelKey,
        route: task.route,
        current,
        target,
        done: current >= target,
      };
    });
    return {
      key: week.key,
      themeLabelKey: week.themeLabelKey,
      pillar: week.pillar,
      tasks,
      done: tasks.every((t) => t.done),
    };
  });

  const weeksComplete = weeks.filter((w) => w.done).length;
  const allWeeksComplete = weeksComplete === totalWeeks;

  const daysSinceStart = Math.floor((now - since) / MS_PER_DAY);
  const currentWeekIndex = Math.min(Math.max(Math.floor(daysSinceStart / 7), 0), totalWeeks - 1);

  const summaryStats: ActProgramSummaryStats = {
    choicePoints: inputData.choicePoints.filter((c) => atOrAfter(c.createdAt, since)).length,
    defusionLogs: inputData.defusionLogs.filter((d) => atOrAfter(d.createdAt, since)).length,
    expansionLogs: inputData.expansionLogs.filter((e) => atOrAfter(e.createdAt, since)).length,
    committedActions: inputData.committedActions.filter((a) => atOrAfter(a.createdAt, since))
      .length,
  };

  return {
    status: completedAt ? "graduated" : "in_progress",
    startedAt,
    currentWeekIndex,
    totalWeeks,
    weeks,
    weeksComplete,
    allWeeksComplete,
    summaryStats,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/act/derive-act-program.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/act/derive-act-program.ts src/features/act/derive-act-program.test.ts
git commit -m "feat(act): derive ACT program view from user data"
```

---

### Task 8: Program hook (`useActProgram`)

**Files:**

- Create: `src/features/act/use-act-program.ts`

Mirrors `src/features/cbt/use-cbt-program.ts`. Reads ACT queries + preferences; latches graduation by persisting `actProgramCompletedAt` once.

- [ ] **Step 1: Implement the hook**

Create `src/features/act/use-act-program.ts`:

```typescript
import { useEffect } from "react";

import {
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
  useValueEntries,
} from "@/src/features/act/queries";
import { deriveActProgram, type ActProgramView } from "@/src/features/act/derive-act-program";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";

export interface UseActProgramResult {
  program: ActProgramView;
  isLoading: boolean;
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  promptDismissedAt: string | null;
  isUpdating: boolean;
}

export function useActProgram(userId: string | null): UseActProgramResult {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const choicePoints = useChoicePoints(userId);
  const valueEntries = useValueEntries(userId);
  const connectionLogs = useConnectionLogs(userId);
  const observingSessions = useObservingSelfSessions(userId);
  const defusionLogs = useDefusionLogs(userId);
  const expansionLogs = useExpansionLogs(userId);
  const urgeSurfLogs = useUrgeSurfLogs(userId);
  const committedActions = useCommittedActions(userId);
  const moodLogs = useMoodLogs(userId, 180);

  // Action steps for the daily "values step" signal: flatten steps across plans.
  // The committed-action list does not embed steps, so we approximate by reading
  // completedAt from the plans' own steps via the existing query is not available
  // here; instead the signal counts steps the user has completed. For Phase 1 we
  // pass an empty array and refine in Phase 5 when a cross-plan step query exists.
  const actionSteps: never[] = [];

  const program = deriveActProgram({
    startedAt: preferences?.actProgramStartedAt ?? null,
    completedAt: preferences?.actProgramCompletedAt ?? null,
    now: Date.now(),
    choicePoints: choicePoints.data ?? [],
    valueEntries: valueEntries.data ?? [],
    connectionLogs: connectionLogs.data ?? [],
    observingSessions: observingSessions.data ?? [],
    defusionLogs: defusionLogs.data ?? [],
    expansionLogs: expansionLogs.data ?? [],
    urgeSurfLogs: urgeSurfLogs.data ?? [],
    committedActions: committedActions.data ?? [],
    actionSteps,
    moodLogs: moodLogs.data ?? [],
  });

  useEffect(() => {
    if (!preferences) return;
    if (updatePreferences.isPending) return;
    if (preferences.actProgramCompletedAt) return;
    if (program.status === "in_progress" && program.allWeeksComplete) {
      void updatePreferences
        .mutateAsync(
          mergeUserPreferences(preferences, {
            actProgramCompletedAt: new Date().toISOString(),
          }),
        )
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences, program.status, program.allWeeksComplete]);

  const startProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: new Date().toISOString(),
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: null,
          actOnboardingCompleted: true,
        }),
      )
      .catch(() => undefined);
  };

  const dismissProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const showProgramPrompt = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(mergeUserPreferences(preferences, { actProgramPromptDismissedAt: null }))
      .catch(() => undefined);
  };

  const abandonProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: null,
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: new Date().toISOString(),
        }),
      )
      .catch(() => undefined);
  };

  const replayProgram = () => {
    if (!preferences) return;
    void updatePreferences
      .mutateAsync(
        mergeUserPreferences(preferences, {
          actProgramStartedAt: new Date().toISOString(),
          actProgramCompletedAt: null,
          actProgramPromptDismissedAt: null,
        }),
      )
      .catch(() => undefined);
  };

  return {
    program,
    isLoading: prefsLoading,
    startProgram,
    dismissProgramPrompt,
    showProgramPrompt,
    abandonProgram,
    replayProgram,
    promptDismissedAt: preferences?.actProgramPromptDismissedAt ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
```

> The `actionSteps: never[] = []` interim leaves the week-4 daily "values step" task at 0 until Phase 5 adds a cross-plan completed-steps query. The capstone task ("build an action plan") still lets week 4 progress. Confirm `useMoodLogs(userId, 180)` matches the CBT usage in `use-cbt-program.ts` (it does).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/act/use-act-program.ts
git commit -m "feat(act): useActProgram hook with graduation latch"
```

---

### Task 9: Parameterize the shared program UI by namespace

**Files:**

- Modify: `src/components/app/program-hero.tsx`
- Modify: `src/components/app/program-graduation.tsx`

The CBT call sites must keep working unchanged (the new props default to CBT behavior). `CbtProgramView`/`ActProgramView` are structurally identical, so we widen the prop types to a shared shape.

- [ ] **Step 1: Make `ProgramHero` accept a namespace and a structural program type**

In `src/components/app/program-hero.tsx`:

Replace the `CbtProgramView`/`ProgramTaskView` import with the structural types and add a namespace prop. Change the import line:

```typescript
import type { CbtProgramView, ProgramTaskView } from "@/src/features/cbt/derive-program";
```

to:

```typescript
import type { ProgramTaskView } from "@/src/features/cbt/derive-program";

// Structural shape shared by CbtProgramView and ActProgramView.
type ProgramView = {
  status: "not_started" | "in_progress" | "graduated";
  weeks: {
    key: string;
    themeLabelKey: string;
    tasks: ProgramTaskView[];
  }[];
  currentWeekIndex: number;
  totalWeeks: number;
  weeksComplete: number;
};
```

Update `ProgramHeroProps`:

```typescript
interface ProgramHeroProps {
  isPending?: boolean;
  program: ProgramView;
  namespace?: string;
  onAbandon?: () => void;
  onDismissStart?: () => void;
  onStart: () => void;
}
```

Thread `namespace` into `useTranslation` and `TaskRow`. Change `TaskRow`:

```typescript
function TaskRow({ task, namespace }: { task: ProgramTaskView; namespace: string }) {
  const { t } = useTranslation(namespace);
  const label = t(task.labelKey);
  // ...rest unchanged...
}
```

In `ProgramHero`, accept and use the namespace:

```typescript
export function ProgramHero({
  isPending = false,
  program,
  namespace = "cbt",
  onAbandon,
  onDismissStart,
  onStart,
}: ProgramHeroProps) {
  const { t } = useTranslation(namespace);
  // ...
```

and pass `namespace` to each `<TaskRow ... />` (both render sites):

```typescript
<TaskRow key={task.key} task={task} namespace={namespace} />
```

- [ ] **Step 2: Make `ProgramGraduation` accept a namespace and explicit lines**

In `src/components/app/program-graduation.tsx`, replace the `stats`-driven internals with caller-supplied lines so each module can label its own stats. Change the import:

```typescript
import type { ProgramSummaryStats } from "@/src/features/cbt/derive-program";
```

to (remove it) and update props:

```typescript
interface ProgramGraduationProps {
  lines: string[];
  namespace?: string;
  dismissed: boolean;
  onDismiss: () => void;
  onReplay: () => void;
}

export function ProgramGraduation({
  lines,
  namespace = "cbt",
  dismissed,
  onDismiss,
  onReplay,
}: ProgramGraduationProps) {
  const { t } = useTranslation(namespace);
```

Delete the internal `const lines = [...]` block (lines 41-46) since `lines` is now a prop.

- [ ] **Step 3: Update the CBT call site to pass the new props**

In `src/features/cbt/cbt-home-screen.tsx`, find the `<ProgramGraduation .../>` usage (around line 548) and pass `lines` built from the CBT stats plus an explicit `namespace="cbt"` (optional since it defaults). Locate the existing block:

```tsx
<ProgramGraduation
  stats={program.summaryStats}
  ...
/>
```

Replace `stats={program.summaryStats}` with a `lines` array built inline from the same i18n keys it used before:

```tsx
<ProgramGraduation
  lines={[
    t("program.statThoughtRecords", { count: program.summaryStats.thoughtRecords }),
    t("program.statActivities", { count: program.summaryStats.activitiesCompleted }),
    t("program.statGoals", { count: program.summaryStats.goalsSet }),
    t("program.statBeliefs", { count: program.summaryStats.beliefsExamined }),
  ]}
  namespace="cbt"
  dismissed={/* unchanged */}
  onDismiss={/* unchanged */}
  onReplay={/* unchanged */}
/>
```

> `t` is already in scope in `cbt-home-screen.tsx` via `useTranslation("cbt")`. Confirm by reading the file; if the translation function is named differently, use that name. The `<ProgramHero .../>` call site needs no change (namespace defaults to "cbt").

- [ ] **Step 4: Typecheck and run the program-hero tests**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm test -- src/components/app/program-hero.test.tsx src/components/app/program-graduation.test.tsx`
Expected: PASS. If these tests pass `stats={...}` to `ProgramGraduation`, update them to pass `lines={[...]}` instead (same values they asserted before).

- [ ] **Step 5: Commit**

```bash
git add src/components/app/program-hero.tsx src/components/app/program-graduation.tsx src/features/cbt/cbt-home-screen.tsx
git commit -m "refactor(program): parameterize program hero/graduation by namespace"
```

---

### Task 10: i18n - program + choice-point strings

**Files:**

- Modify: `src/i18n/locales/en/act.json`
- Modify: `src/i18n/locales/bg/act.json`

- [ ] **Step 1: Add the English strings**

In `src/i18n/locales/en/act.json`, add a `program` object and a `choicePoint` object (match the existing top-level structure; reference `src/i18n/locales/en/cbt.json`'s `program` block for shape):

```json
"program": {
  "startTitle": "Start the ACT program",
  "startDescription": "A guided four-week path: notice your choice points, be present, open up, and do what matters.",
  "startCta": "Start the program",
  "dismissStartLabel": "Dismiss program invitation",
  "heroTitle": "ACT program",
  "weekProgress": "Week {{current}} of {{total}}",
  "weekTasksDone": "{{done}}/{{total}} this week",
  "otherWeeks": "Other weeks",
  "abandon": "Leave the program",
  "replay": "Replay the ACT program",
  "graduationTitle": "You finished the ACT program",
  "graduationBody": "You built skills to be present, open up, and do what matters. Keep using them.",
  "graduationDismiss": "Done",
  "statChoicePoints": "{{count}} choice point mapped",
  "statChoicePoints_other": "{{count}} choice points mapped",
  "statDefusion": "{{count}} thought unhooked",
  "statDefusion_other": "{{count}} thoughts unhooked",
  "statExpansion": "{{count}} feeling made room for",
  "statExpansion_other": "{{count}} feelings made room for",
  "statActions": "{{count}} committed action",
  "statActions_other": "{{count}} committed actions",
  "weeks": {
    "foundation": "Foundation",
    "bePresent": "Be present",
    "openUp": "Open up",
    "doWhatMatters": "Do what matters"
  },
  "tasks": {
    "mapChoicePoint": "Map your choice point",
    "clarifyValue": "Clarify one value",
    "dailyMoodCheckIn": "Daily mood check-in",
    "dropAnchorDays": "Drop anchor on several days",
    "observeSelf": "Notice from the observing self",
    "unhookThoughtDays": "Unhook from a thought on several days",
    "makeRoom": "Make room for a feeling",
    "kindOrSurf": "Be kind or surf an urge",
    "valuesStepDays": "Take a values-guided step on several days",
    "buildActionPlan": "Build a committed-action plan"
  }
},
"choicePoint": {
  "title": "Choice point",
  "listTitle": "Your choice points",
  "empty": "Map your first choice point to see what hooks you and where you want to go.",
  "newCta": "New choice point",
  "hooksLabel": "What hooks you?",
  "hooksHint": "Difficult situations, thoughts, feelings, urges, or memories.",
  "awayLabel": "Away moves",
  "awayHint": "What you do that makes things worse in the long run.",
  "towardLabel": "Toward moves",
  "towardHint": "What you'd do as the person you want to be.",
  "notesLabel": "Notes",
  "save": "Save",
  "addItem": "Add",
  "primer": "At any moment you can move toward the life you want or away from it. When difficult thoughts and feelings hook you, you get pulled into away moves. Unhooking skills give you the choice."
}
```

- [ ] **Step 2: Add the Bulgarian strings**

In `src/i18n/locales/bg/act.json`, add the same `program` and `choicePoint` keys with Bulgarian translations. If a translation is uncertain, copy the English value as a placeholder-free fallback (the app ships with English fallback enabled); do not leave keys missing. Mirror the exact key structure from Step 1.

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "require('./src/i18n/locales/en/act.json'); require('./src/i18n/locales/bg/act.json'); console.log('ok')"`
Expected: prints `ok` (no JSON parse error).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en/act.json src/i18n/locales/bg/act.json
git commit -m "feat(act): program and choice-point i18n strings"
```

---

### Task 11: Choice Point screens + routes

**Files:**

- Create: `src/features/act/act-choice-point-list-screen.tsx`
- Create: `src/features/act/act-choice-point-new-screen.tsx`
- Create: `src/features/act/act-choice-point-detail-screen.tsx`
- Create: `app/(app)/modules/act/choice-point/index.tsx`
- Create: `app/(app)/modules/act/choice-point/new.tsx`
- Create: `app/(app)/modules/act/choice-point/[id].tsx`

Follow the existing ACT screen + route pattern. Read `src/features/act/act-defusion-list-screen.tsx`, `act-defusion-new-screen.tsx`, `act-defusion-detail-screen.tsx` and the matching route files under `app/(app)/modules/act/defusion/` to copy the exact layout, imports (auth user via the same hook the defusion screens use), `SafeAreaView`/scroll structure, header, and styling. The route files are thin wrappers that render the screen component.

- [ ] **Step 1: Read the defusion screen + route pattern**

Run: `sed -n '1,60p' src/features/act/act-defusion-new-screen.tsx && echo '---ROUTE---' && cat app/\(app\)/modules/act/defusion/new.tsx`
Expected: shows the imports, the `useAuth`/user hook, the form scaffold, and how the route file wraps the screen. Mirror these exactly.

- [ ] **Step 2: Build the list screen**

Create `src/features/act/act-choice-point-list-screen.tsx`: a screen that calls `useChoicePoints(user?.id ?? null)`, renders the `act:choicePoint.primer` text, a "New choice point" button routing to `/modules/act/choice-point/new`, and a list of saved maps (each row routes to `/modules/act/choice-point/[id]`). Use the same list/empty-state components the defusion list screen uses. Show `act:choicePoint.empty` when the list is empty.

- [ ] **Step 3: Build the new screen**

Create `src/features/act/act-choice-point-new-screen.tsx`: three string-array editors (hooks / away moves / toward moves) using the same add/remove pattern present in other ACT array inputs (e.g. the recovery/values screens), a notes field, and a Save button calling `useSaveChoicePoint`. On success, `router.back()`. Labels/hints come from `act:choicePoint.*`.

- [ ] **Step 4: Build the detail screen**

Create `src/features/act/act-choice-point-detail-screen.tsx`: reads `useChoicePoint(user?.id ?? null, id)`, renders hooks/away/toward lists read-only, and a delete action via `useDeleteChoicePoint` (with the same confirm pattern the defusion detail screen uses).

- [ ] **Step 5: Build the three route files**

Create the three files under `app/(app)/modules/act/choice-point/` mirroring the defusion route wrappers:

`index.tsx`:

```tsx
import { ActChoicePointListScreen } from "@/src/features/act/act-choice-point-list-screen";

export default function Screen() {
  return <ActChoicePointListScreen />;
}
```

`new.tsx`:

```tsx
import { ActChoicePointNewScreen } from "@/src/features/act/act-choice-point-new-screen";

export default function Screen() {
  return <ActChoicePointNewScreen />;
}
```

`[id].tsx`:

```tsx
import { ActChoicePointDetailScreen } from "@/src/features/act/act-choice-point-detail-screen";

export default function Screen() {
  return <ActChoicePointDetailScreen />;
}
```

> Match the actual export names and default-export style used by the existing defusion route files (some use named screen exports, some default). Adjust the imports above to match what Step 1 revealed.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/act/act-choice-point-*.tsx "app/(app)/modules/act/choice-point"
git commit -m "feat(act): choice point list, new, and detail screens"
```

---

### Task 12: Drop Anchor flow + render the program on the ACT home

**Files:**

- Create: `src/features/act/act-drop-anchor-screen.tsx`
- Create: `app/(app)/modules/act/connection/drop-anchor.tsx`
- Modify: `src/features/act/act-connection-new-screen.tsx` (add `dropAnchor`/`bodyScan` to the technique picker)
- Modify: `src/features/act/act-home-screen.tsx` (render `ProgramHero`/`ProgramGraduation`)

- [ ] **Step 1: Add the new techniques to the connection picker**

In `src/features/act/act-connection-new-screen.tsx`, the technique selector iterates `CONNECTION_TECHNIQUES`. Since Task 2 added `dropAnchor` and `bodyScan` to that array, they will appear automatically IF the screen reads labels from i18n by key. Add labels under `act:connection.techniques` (en + bg): `"dropAnchor": "Drop anchor (ACE)"`, `"bodyScan": "Body scan"`. Read the screen first:

Run: `grep -n "CONNECTION_TECHNIQUES\|technique" src/features/act/act-connection-new-screen.tsx`
Expected: shows how technique labels are resolved. Add the two missing i18n labels to match that scheme.

- [ ] **Step 2: Build the guided Drop Anchor screen**

Create `src/features/act/act-drop-anchor-screen.tsx`: a guided three-step flow (Acknowledge / Connect with body / Engage) using `act:dropAnchor.*` strings, with a "Log this practice" button that calls `useSaveConnectionLog` with `technique: "dropAnchor"` and routes back. Add the `dropAnchor` strings to `en/act.json` and `bg/act.json`:

```json
"dropAnchor": {
  "title": "Drop anchor",
  "intro": "When you feel pulled off course, drop anchor to steady yourself. Repeat the cycle as many times as you need.",
  "acknowledge": "Acknowledge your thoughts and feelings. Silently name what's here: \"I'm noticing anxiety.\"",
  "connect": "Connect with your body. Press your feet into the floor, straighten your spine, and breathe.",
  "engage": "Engage with the world. Notice where you are, what you can see and hear, and refocus.",
  "logCta": "Log this practice"
}
```

- [ ] **Step 3: Build the route**

Create `app/(app)/modules/act/connection/drop-anchor.tsx` wrapping the screen, matching the route-wrapper style from Task 11 Step 1.

- [ ] **Step 4: Render the program hero/graduation on the ACT home**

In `src/features/act/act-home-screen.tsx`, mirror the CBT home wiring (see `src/features/cbt/cbt-home-screen.tsx:548-565`):

Add imports:

```typescript
import { ProgramHero } from "@/src/components/app/program-hero";
import { ProgramGraduation } from "@/src/components/app/program-graduation";
import { useActProgram } from "@/src/features/act/use-act-program";
```

Inside the component, get the program (use the same `user?.id` source the screen already uses):

```typescript
const {
  program,
  startProgram,
  dismissProgramPrompt,
  abandonProgram,
  replayProgram,
  promptDismissedAt,
  isUpdating,
} = useActProgram(user?.id ?? null);
```

Near the top of the scrollable content, render the program block (mirror the CBT layout):

```tsx
{
  program.status === "graduated" ? (
    <ProgramGraduation
      namespace="act"
      lines={[
        t("program.statChoicePoints", { count: program.summaryStats.choicePoints }),
        t("program.statDefusion", { count: program.summaryStats.defusionLogs }),
        t("program.statExpansion", { count: program.summaryStats.expansionLogs }),
        t("program.statActions", { count: program.summaryStats.committedActions }),
      ]}
      dismissed={Boolean(promptDismissedAt)}
      onDismiss={dismissProgramPrompt}
      onReplay={replayProgram}
    />
  ) : program.status === "not_started" && promptDismissedAt ? null : (
    <ProgramHero
      namespace="act"
      isPending={isUpdating}
      program={program}
      onStart={startProgram}
      onDismissStart={program.status === "not_started" ? dismissProgramPrompt : undefined}
      onAbandon={program.status === "in_progress" ? abandonProgram : undefined}
    />
  );
}
```

> `t` must be the `act` namespace translator. Confirm the screen uses `useTranslation("act")`; if it uses a different namespace, add `const { t } = useTranslation("act")` scoped for these lines or use the existing one. Match the exact conditional the CBT home uses for the not_started/dismissed prompt.

- [ ] **Step 5: Typecheck, lint, full test run**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 6: Manual verification (web)**

Run the app (`npm run web` or the project's start command), enable the ACT module, open `/modules/act`, and confirm: the program hero shows "Start the ACT program"; starting it shows Week 1 with the three foundation tasks; tapping "Map your choice point" opens the new-choice-point form; saving a map returns and marks the task 1/1; the Drop Anchor flow logs a connection entry. If you cannot run the UI, state that explicitly rather than claiming success.

- [ ] **Step 7: Commit**

```bash
git add src/features/act/act-drop-anchor-screen.tsx "app/(app)/modules/act/connection/drop-anchor.tsx" src/features/act/act-connection-new-screen.tsx src/features/act/act-home-screen.tsx src/i18n/locales/en/act.json src/i18n/locales/bg/act.json
git commit -m "feat(act): drop anchor flow and program on the ACT home"
```

---

## Self-Review Notes

**Spec coverage (Phase 1 scope):**

- Choice Point primer + map -> Tasks 1, 4, 5, 11 (primer string in i18n; map CRUD + screens).
- Drop Anchor / ACE -> Tasks 1 (technique CHECK), 2 (type), 12 (guided flow + log).
- Program scaffolding (program-definition / derive / hook) -> Tasks 6, 7, 8.
- Parameterized hero/graduation -> Task 9; rendered on ACT home -> Task 12.
- `act_program_*` flags -> Tasks 1, 3.

**Deferred to later phases (noted inline, not gaps in this plan):**

- Creative-hopelessness reflection, 2nd-ed onboarding rewrite, learn-screen rewrite -> Phase 1b (own plan).
- Self-compassion in the week-3 signal -> Phase 2.
- Maintenance-plan capstone replacing the interim week-4 "build action plan" task, and the cross-plan completed-steps query for the week-4 daily signal -> Phase 3 / Phase 5.

**Type consistency:** `ActProgramSignalData`, `ProgramTaskDef`, `ProgramWeek` (Task 6) are consumed unchanged by `deriveActProgram` (Task 7); `ActProgramView` (Task 7) is consumed by `useActProgram` (Task 8) and structurally satisfies `ProgramView` in `ProgramHero` (Task 9). `ChoicePoint`/`ChoicePointInput` (Task 2) are used identically across repository (Task 4), queries (Task 5), and program-definition (Task 6).

**Open confirmations the implementer must make from the codebase (called out inline):** the existing connection-technique constraint name (Task 1 Step 2); the defusion screen/route export style (Task 11 Step 1); the `t`/namespace setup on the CBT and ACT home screens (Tasks 9, 12).

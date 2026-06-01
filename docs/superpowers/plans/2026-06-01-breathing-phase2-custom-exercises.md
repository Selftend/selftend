# Breathing — Phase 2: Custom Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create, edit, delete, list, and run their own breathing exercises (custom phase durations + cycles + a card color), saved to their database, with fractional-second phase precision.

**Architecture:** A new `breathing_exercises` table + repository + React Query layer mirrors the existing `habits` feature. A pure `schedule.ts` module computes the active phase at any (fractional) elapsed time so the runner can support decimal durations via a timestamp-driven ticker. A `resolve-exercise.ts` layer unifies built-in patterns and custom rows into one `ResolvedExercise` shape the runner consumes, so the runner screen runs both by route id. The list screen gains custom cards + a "New exercise" entry, and the editor screen mirrors `HabitEditorScreen`.

**Tech Stack:** React Native, Expo Router, Supabase (PostgREST via supabase-js), TanStack Query, Zod, `react-native-reanimated` (mocked in tests), Jest + Testing Library.

> **Plan scope note:** Plan 2 of 3 for spec `docs/superpowers/specs/2026-06-01-breathing-sounds-and-custom-exercises-design.md`. Phase 1 (cycle runner) is already implemented. Plan 3 (audio engine + Sounds sheet + prefs) follows.

> **Git rule (project standing rule):** Do NOT `git add`, `git commit`, or stage. Each task ends at a verification checkpoint; the user manages all git.

> **DB rule (project standing rule):** Do NOT run `supabase db reset` (it wipes local data). The new migration is fully idempotent (`create table if not exists`); the USER applies it. Jest tests mock `requireSupabase`, so they pass without the table existing.

---

## Decisions baked into this plan

- **Routing:** breathing already has a dynamic `app/(app)/tools/breathing/[slug].tsx`. To avoid a second dynamic segment, the editor is a STATIC `app/(app)/tools/breathing/new.tsx` that reads an optional `?id=` query param for edit mode. A custom exercise runs at `/tools/breathing/<uuid>` (the existing `[slug]` route resolves it as custom when the param isn't a built-in slug). Static `new` wins over `[slug]` in Expo Router, so `/tools/breathing/new` opens the editor, not the runner.
- **Phase shape:** the canonical 4 slots Inhale → Hold → Exhale → Hold-out, decimals allowed in **0.5s** steps, `0` skips a slot. At least one of inhale/exhale must be > 0.
- **Card color** applies to the LIST card only; the runner circle stays aqua (pulling token HSLs into JS animation is out of scope).
- **Export RPC:** adding `breathing_exercises` to `export_user_data()` is deferred (spec §14 open item) to keep the migration idempotent and small.
- **Decimals in the runner** are handled by the pure `schedule.ts` module + a 250ms timestamp ticker that replaces Phase 1's 1s integer interval.

## File Structure

| File                                                               | Responsibility                                                | C/M                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------- |
| `supabase/migrations/20260572_breathing_exercises.sql`             | `breathing_exercises` table, constraints, index, trigger, RLS | Create                |
| `src/features/breathing/exercise-types.ts`                         | `BreathingExercise`, `BreathingExerciseInput`, color list     | Create                |
| `src/features/breathing/exercise-schema.ts`                        | Zod input schema, bounds, suggested patterns                  | Create                |
| `src/features/breathing/exercise-schema.test.ts`                   | Schema unit tests                                             | Create                |
| `src/features/breathing/exercise-colors.ts`                        | `breathingColorClass(color)` → NativeWind class strings       | Create                |
| `src/features/breathing/exercises-repository.ts`                   | Supabase CRUD + row mapping                                   | Create                |
| `src/features/breathing/exercises-repository.test.ts`              | Repository unit tests (mock supabase)                         | Create                |
| `src/features/breathing/exercises-queries.ts`                      | React Query hooks (list/get/save/delete)                      | Create                |
| `src/features/breathing/exercises-queries.test.tsx`                | Query hook tests                                              | Create                |
| `src/features/breathing/schedule.ts`                               | Pure phase scheduler (fractional)                             | Create                |
| `src/features/breathing/schedule.test.ts`                          | Scheduler unit tests                                          | Create                |
| `src/features/breathing/resolve-exercise.ts`                       | Built-in + custom → `ResolvedExercise`; `useResolvedExercise` | Create                |
| `src/features/breathing/resolve-exercise.test.ts`                  | Resolver unit tests                                           | Create                |
| `src/features/breathing/breathing-exercise-editor-screen.tsx`      | Builder/editor UI                                             | Create                |
| `src/features/breathing/breathing-exercise-editor-screen.test.tsx` | Editor component tests                                        | Create                |
| `app/(app)/tools/breathing/new.tsx`                                | Route → editor (create + `?id` edit)                          | Create                |
| `app/(app)/tools/breathing/[slug].tsx`                             | Runner: consume `ResolvedExercise` + `schedule.ts`            | Modify (full rewrite) |
| `app/(app)/tools/breathing/index.tsx`                              | Custom cards + "New exercise" + edit nav                      | Modify                |
| `src/features/breathing/queries.ts`                                | Sessions query includes custom ids                            | Modify                |
| `src/features/breathing/queries.test.tsx`                          | Update expectation for custom ids                             | Modify                |
| `src/i18n/locales/en/cbt.json`                                     | Builder/editor/list i18n keys                                 | Modify                |

---

## Task 1: Database migration

**Files:** Create `supabase/migrations/20260572_breathing_exercises.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Custom breathing exercises: a user-authored single cycle (inhale/hold/exhale/hold-out,
-- decimals allowed, 0 = skip) repeated for `cycles`, with a list-card color. Built-in
-- patterns stay in code (src/constants/breathing.ts); only user-created ones live here.
-- Idempotent (create ... if not exists). Sessions continue to log into mindfulness_sessions
-- with exercise_name = this row's id.

create table if not exists public.breathing_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  inhale_seconds numeric not null default 0,
  hold_in_seconds numeric not null default 0,
  exhale_seconds numeric not null default 0,
  hold_out_seconds numeric not null default 0,
  cycles integer not null default 6,
  color text not null default 'aqua',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint breathing_exercises_name_not_blank check (length(btrim(name)) > 0),
  constraint breathing_exercises_name_length check (length(name) <= 80),
  constraint breathing_exercises_inhale_valid check (inhale_seconds >= 0 and inhale_seconds <= 60),
  constraint breathing_exercises_hold_in_valid check (hold_in_seconds >= 0 and hold_in_seconds <= 60),
  constraint breathing_exercises_exhale_valid check (exhale_seconds >= 0 and exhale_seconds <= 60),
  constraint breathing_exercises_hold_out_valid check (hold_out_seconds >= 0 and hold_out_seconds <= 60),
  constraint breathing_exercises_active_phase check (inhale_seconds > 0 or exhale_seconds > 0),
  constraint breathing_exercises_cycles_valid check (cycles between 1 and 999),
  constraint breathing_exercises_color_length check (length(color) between 1 and 32)
);

create index if not exists breathing_exercises_user_created_idx
  on public.breathing_exercises (user_id, created_at desc);

drop trigger if exists set_breathing_exercises_updated_at on public.breathing_exercises;
create trigger set_breathing_exercises_updated_at
before update on public.breathing_exercises
for each row execute function public.set_current_timestamp_updated_at();

alter table public.breathing_exercises enable row level security;

drop policy if exists "breathing_exercises_select_own" on public.breathing_exercises;
create policy "breathing_exercises_select_own" on public.breathing_exercises
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "breathing_exercises_insert_own" on public.breathing_exercises;
create policy "breathing_exercises_insert_own" on public.breathing_exercises
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "breathing_exercises_update_own" on public.breathing_exercises;
create policy "breathing_exercises_update_own" on public.breathing_exercises
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "breathing_exercises_delete_own" on public.breathing_exercises;
create policy "breathing_exercises_delete_own" on public.breathing_exercises
  for delete to authenticated using (auth.uid() = user_id);
```

- [ ] **Step 2: Verify SQL is well-formed and applies locally (no reset)**

The migration is idempotent. Apply it to the local DB WITHOUT a reset — e.g. `psql "$LOCAL_DB_URL" -f supabase/migrations/20260572_breathing_exercises.sql` (the `set_current_timestamp_updated_at` function already exists from earlier migrations; `auth.users` exists locally). If you cannot reach the local DB, STOP and report — do not run `supabase db reset`. Expected: applies cleanly, re-running is a no-op. Do NOT commit.

---

## Task 2: Types + color classes

**Files:** Create `src/features/breathing/exercise-types.ts`, `src/features/breathing/exercise-colors.ts`

- [ ] **Step 1: Types**

`src/features/breathing/exercise-types.ts`:

```ts
export const BREATHING_EXERCISE_COLORS = [
  "aqua",
  "mist",
  "iris",
  "clay",
  "amber",
  "emerald",
  "violet",
  "rose",
] as const;

export type BreathingExerciseColor = (typeof BREATHING_EXERCISE_COLORS)[number];

export interface BreathingExercise {
  id: string;
  userId: string;
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
  createdAt: string;
  updatedAt: string;
}

export interface BreathingExerciseInput {
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
}
```

- [ ] **Step 2: Color classes**

`src/features/breathing/exercise-colors.ts` (full literal class strings so NativeWind's compiler sees them; mirrors `colorChipClass` in habits-home-screen):

```ts
import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";

export interface BreathingColorClass {
  bg: string;
  border: string;
  text: string;
}

export function breathingColorClass(color: BreathingExerciseColor): BreathingColorClass {
  switch (color) {
    case "aqua":
      return { bg: "bg-aqua/10", border: "border-aqua", text: "text-aqua" };
    case "mist":
      return { bg: "bg-mist/10", border: "border-mist", text: "text-mist" };
    case "iris":
      return { bg: "bg-iris/10", border: "border-iris", text: "text-iris" };
    case "clay":
      return { bg: "bg-clay/10", border: "border-clay", text: "text-clay" };
    case "amber":
      return { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-600" };
    case "emerald":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-600" };
    case "violet":
      return { bg: "bg-violet-500/10", border: "border-violet-500", text: "text-violet-600" };
    case "rose":
      return { bg: "bg-rose-500/10", border: "border-rose-500", text: "text-rose-600" };
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. Do NOT commit.

> Note: if any of `bg-mist/10`, `bg-iris/10`, `bg-clay/10` are not recognized tokens, confirm against `tool-accent.ts` (which already uses `bg-aqua/10`, `bg-mist/10`, `bg-iris/10`, `bg-clay/10`, `bg-ink/10`) — those five hue tokens exist. The Tailwind palette colors (`amber/emerald/violet/rose-500`) match the habits `HABIT_COLORS` set. If a class is unknown the screen still renders (NativeWind no-ops unknown classes); flag it as DONE_WITH_CONCERNS rather than inventing a token.

---

## Task 3: Zod schema + suggested patterns (TDD)

**Files:** Create `src/features/breathing/exercise-schema.ts`, `src/features/breathing/exercise-schema.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/breathing/exercise-schema.test.ts`:

```ts
import {
  breathingExerciseInputSchema,
  EMPTY_EXERCISE_INPUT,
  PHASE_SECONDS_MAX,
  SUGGESTED_PATTERNS,
} from "@/src/features/breathing/exercise-schema";

const valid = {
  name: "Evening wind-down",
  inhaleSeconds: 4,
  holdInSeconds: 7,
  exhaleSeconds: 8,
  holdOutSeconds: 0,
  cycles: 6,
  color: "aqua" as const,
};

describe("breathingExerciseInputSchema", () => {
  it("accepts a valid input", () => {
    expect(breathingExerciseInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts half-second durations", () => {
    expect(
      breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: 5.5, exhaleSeconds: 5.5 })
        .success,
    ).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects sub-half-second granularity", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: 4.3 }).success).toBe(
      false,
    );
  });

  it("rejects durations over the max", () => {
    expect(
      breathingExerciseInputSchema.safeParse({ ...valid, inhaleSeconds: PHASE_SECONDS_MAX + 0.5 })
        .success,
    ).toBe(false);
  });

  it("rejects when neither inhale nor exhale is positive", () => {
    expect(
      breathingExerciseInputSchema.safeParse({
        ...valid,
        inhaleSeconds: 0,
        exhaleSeconds: 0,
        holdInSeconds: 4,
      }).success,
    ).toBe(false);
  });

  it("rejects cycles below 1 or non-integer", () => {
    expect(breathingExerciseInputSchema.safeParse({ ...valid, cycles: 0 }).success).toBe(false);
    expect(breathingExerciseInputSchema.safeParse({ ...valid, cycles: 2.5 }).success).toBe(false);
  });

  it("exposes a valid empty default and suggested patterns", () => {
    // EMPTY default has no active phase yet, so it is intentionally invalid until edited.
    expect(EMPTY_EXERCISE_INPUT.cycles).toBeGreaterThan(0);
    expect(SUGGESTED_PATTERNS.length).toBeGreaterThan(0);
    for (const p of SUGGESTED_PATTERNS) {
      expect(p.inhaleSeconds > 0 || p.exhaleSeconds > 0).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx jest src/features/breathing/exercise-schema.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the schema**

`src/features/breathing/exercise-schema.ts`:

```ts
import { z } from "zod";

import {
  BREATHING_EXERCISE_COLORS,
  type BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";

export const BREATHING_NAME_MAX = 80;
export const PHASE_SECONDS_MAX = 60;
export const PHASE_STEP = 0.5;
export const CYCLES_MIN = 1;
export const CYCLES_MAX = 999;

const phaseSeconds = z
  .number()
  .min(0)
  .max(PHASE_SECONDS_MAX)
  .refine((v) => Number.isInteger(v / PHASE_STEP), { message: "step" });

export const breathingExerciseInputSchema = z
  .object({
    name: z
      .string()
      .max(BREATHING_NAME_MAX)
      .refine((v) => v.trim().length > 0, { message: "required" }),
    inhaleSeconds: phaseSeconds,
    holdInSeconds: phaseSeconds,
    exhaleSeconds: phaseSeconds,
    holdOutSeconds: phaseSeconds,
    cycles: z.number().int().min(CYCLES_MIN).max(CYCLES_MAX),
    color: z.enum(BREATHING_EXERCISE_COLORS),
  })
  .refine((v) => v.inhaleSeconds > 0 || v.exhaleSeconds > 0, {
    message: "activePhase",
    path: ["inhaleSeconds"],
  });

export const EMPTY_EXERCISE_INPUT: BreathingExerciseInput = {
  name: "",
  inhaleSeconds: 4,
  holdInSeconds: 4,
  exhaleSeconds: 4,
  holdOutSeconds: 4,
  cycles: 6,
  color: "aqua",
};

export interface SuggestedPattern {
  key: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}

// Quick-fill chips in the builder (the reference's "Suggested Patterns").
export const SUGGESTED_PATTERNS: SuggestedPattern[] = [
  { key: "box", inhaleSeconds: 4, holdInSeconds: 4, exhaleSeconds: 4, holdOutSeconds: 4 },
  { key: "478", inhaleSeconds: 4, holdInSeconds: 7, exhaleSeconds: 8, holdOutSeconds: 0 },
  { key: "coherent", inhaleSeconds: 5.5, holdInSeconds: 0, exhaleSeconds: 5.5, holdOutSeconds: 0 },
  { key: "relaxing", inhaleSeconds: 6, holdInSeconds: 0, exhaleSeconds: 2, holdOutSeconds: 0 },
];
```

- [ ] **Step 4: Run it (passes)**

Run: `npx jest src/features/breathing/exercise-schema.test.ts`
Expected: PASS. Then `npx tsc --noEmit` → clean. Do NOT commit.

---

## Task 4: Repository (TDD)

**Files:** Create `src/features/breathing/exercises-repository.ts`, `src/features/breathing/exercises-repository.test.ts`

- [ ] **Step 1: Write the failing test** (mock supabase, mirroring `habits/repository.test.ts`)

`src/features/breathing/exercises-repository.test.ts`:

```ts
import {
  listBreathingExercises,
  saveBreathingExercise,
  deleteBreathingExercise,
} from "@/src/features/breathing/exercises-repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

const row = {
  id: "e-1",
  user_id: "user-1",
  name: "Evening wind-down",
  inhale_seconds: 5.5,
  hold_in_seconds: 0,
  exhale_seconds: 5.5,
  hold_out_seconds: 0,
  cycles: 6,
  color: "aqua",
  created_at: "2026-06-01T08:00:00.000Z",
  updated_at: "2026-06-01T08:00:00.000Z",
};

const input = {
  name: "  Evening wind-down  ",
  inhaleSeconds: 5.5,
  holdInSeconds: 0,
  exhaleSeconds: 5.5,
  holdOutSeconds: 0,
  cycles: 6,
  color: "aqua" as const,
};

describe("breathing exercises repository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("inserts a new exercise, trims the name, maps the row to camelCase", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await saveBreathingExercise("user-1", input);

    expect(from).toHaveBeenCalledWith("breathing_exercises");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Evening wind-down",
        inhale_seconds: 5.5,
        exhale_seconds: 5.5,
        cycles: 6,
        color: "aqua",
      }),
    );
    expect(result).toMatchObject({ id: "e-1", userId: "user-1", inhaleSeconds: 5.5, cycles: 6 });
  });

  it("updates when an id is supplied (scoped to user_id + id)", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select: selectAfter }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveBreathingExercise("user-1", input, "e-1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Evening wind-down" }));
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "e-1");
  });

  it("lists exercises for a user, newest first", async () => {
    const order = jest.fn().mockResolvedValue({ data: [row], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listBreathingExercises("user-1");

    expect(from).toHaveBeenCalledWith("breathing_exercises");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "e-1", name: "Evening wind-down" });
  });

  it("deletes scoped to user_id + id", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteBreathingExercise("user-1", "e-1");

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "e-1");
  });
});
```

- [ ] **Step 2: Run it (fails)** → `npx jest src/features/breathing/exercises-repository.test.ts` → FAIL (missing module).

- [ ] **Step 3: Implement the repository**

`src/features/breathing/exercises-repository.ts`:

```ts
import type {
  BreathingExercise,
  BreathingExerciseColor,
  BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";
import { requireSupabase } from "@/src/lib/supabase";

interface BreathingExerciseRow {
  id: string;
  user_id: string;
  name: string;
  inhale_seconds: number;
  hold_in_seconds: number;
  exhale_seconds: number;
  hold_out_seconds: number;
  cycles: number;
  color: BreathingExerciseColor;
  created_at: string;
  updated_at: string;
}

function mapExercise(row: BreathingExerciseRow): BreathingExercise {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    inhaleSeconds: Number(row.inhale_seconds),
    holdInSeconds: Number(row.hold_in_seconds),
    exhaleSeconds: Number(row.exhale_seconds),
    holdOutSeconds: Number(row.hold_out_seconds),
    cycles: row.cycles,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function payloadFromInput(input: BreathingExerciseInput) {
  return {
    name: input.name.trim(),
    inhale_seconds: input.inhaleSeconds,
    hold_in_seconds: input.holdInSeconds,
    exhale_seconds: input.exhaleSeconds,
    hold_out_seconds: input.holdOutSeconds,
    cycles: input.cycles,
    color: input.color,
  };
}

export async function listBreathingExercises(userId: string): Promise<BreathingExercise[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("breathing_exercises")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as BreathingExerciseRow[]).map(mapExercise);
}

export async function getBreathingExercise(
  userId: string,
  id: string,
): Promise<BreathingExercise | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("breathing_exercises")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapExercise(data as BreathingExerciseRow) : null;
}

export async function saveBreathingExercise(
  userId: string,
  input: BreathingExerciseInput,
  id?: string,
): Promise<BreathingExercise> {
  const client = requireSupabase();
  const payload = payloadFromInput(input);
  const query = id
    ? client.from("breathing_exercises").update(payload).eq("user_id", userId).eq("id", id)
    : client.from("breathing_exercises").insert({ ...payload, user_id: userId });
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapExercise(data as BreathingExerciseRow);
}

export async function deleteBreathingExercise(userId: string, id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("breathing_exercises")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run it (passes)** → `npx jest src/features/breathing/exercises-repository.test.ts` → PASS; `npx tsc --noEmit` → clean. Do NOT commit.

---

## Task 5: React Query hooks (TDD)

**Files:** Create `src/features/breathing/exercises-queries.ts`, `src/features/breathing/exercises-queries.test.tsx`

- [ ] **Step 1: Write the failing test** (mirrors `breathing/queries.test.tsx` style)

`src/features/breathing/exercises-queries.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
import { listBreathingExercises } from "@/src/features/breathing/exercises-repository";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/breathing/exercises-repository", () => ({
  listBreathingExercises: jest.fn(),
  getBreathingExercise: jest.fn(),
  saveBreathingExercise: jest.fn(),
  deleteBreathingExercise: jest.fn(),
}));

const mockList = listBreathingExercises as jest.MockedFunction<typeof listBreathingExercises>;

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useBreathingExercises", () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  it("fetches the user's custom exercises", async () => {
    mockList.mockResolvedValue([{ id: "e-1", name: "Evening" } as never]);
    const { result } = renderHook(() => useBreathingExercises("user-1"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual([{ id: "e-1", name: "Evening" }]);
  });

  it("does not fetch when userId is null", () => {
    renderHook(() => useBreathingExercises(null), { wrapper: makeWrapper(client) });
    expect(mockList).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it (fails)** → FAIL (missing module).

- [ ] **Step 3: Implement the hooks**

`src/features/breathing/exercises-queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteBreathingExercise,
  getBreathingExercise,
  listBreathingExercises,
  saveBreathingExercise,
} from "@/src/features/breathing/exercises-repository";
import type { BreathingExerciseInput } from "@/src/features/breathing/exercise-types";

const exerciseKeys = {
  all: ["breathing-exercises"] as const,
  list: (userId: string) => ["breathing-exercises", "list", userId] as const,
  detail: (userId: string, id: string) => ["breathing-exercises", "detail", userId, id] as const,
};

export function useBreathingExercises(userId: string | null) {
  return useQuery({
    queryKey: userId ? exerciseKeys.list(userId) : ["breathing-exercises", "list", "anonymous"],
    queryFn: () => listBreathingExercises(userId!),
    enabled: Boolean(userId),
  });
}

export function useBreathingExercise(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id
        ? exerciseKeys.detail(userId, id)
        : ["breathing-exercises", "detail", "anonymous", id ?? ""],
    queryFn: () => getBreathingExercise(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useSaveBreathingExercise(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: BreathingExerciseInput; id?: string }) =>
      saveBreathingExercise(userId!, input, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteBreathingExercise(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBreathingExercise(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}
```

- [ ] **Step 4: Run it (passes)** → `npx jest src/features/breathing/exercises-queries.test.tsx` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 6: Fractional phase scheduler (TDD)

**Files:** Create `src/features/breathing/schedule.ts`, `src/features/breathing/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/breathing/schedule.test.ts`:

```ts
import { scheduleStateAt } from "@/src/features/breathing/schedule";
import type { BreathingPhase } from "@/src/constants/breathing";

const inEx: BreathingPhase[] = [
  { label: "inhale", durationSeconds: 4 },
  { label: "exhale", durationSeconds: 4 },
];

describe("scheduleStateAt", () => {
  it("reports the inhale phase at t=0", () => {
    const s = scheduleStateAt(inEx, 2, 0);
    expect(s.done).toBe(false);
    expect(s.phase?.label).toBe("inhale");
    expect(s.phaseIndex).toBe(0);
    expect(s.cycleNumber).toBe(1);
    expect(s.phaseRemainingSeconds).toBe(4);
    expect(s.totalRemainingSeconds).toBe(16);
  });

  it("crosses into exhale at the boundary", () => {
    const s = scheduleStateAt(inEx, 2, 4);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseIndex).toBe(1);
    expect(s.cycleNumber).toBe(1);
  });

  it("advances the cycle number after a full cycle", () => {
    const s = scheduleStateAt(inEx, 2, 8);
    expect(s.phase?.label).toBe("inhale");
    expect(s.cycleNumber).toBe(2);
  });

  it("rounds remaining seconds up at fractional elapsed", () => {
    const s = scheduleStateAt(inEx, 2, 5.5);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseRemainingSeconds).toBe(3); // ceil(8 - 5.5)
    expect(s.totalRemainingSeconds).toBe(11); // ceil(16 - 5.5)
  });

  it("handles fractional phase durations", () => {
    const coherent: BreathingPhase[] = [
      { label: "inhale", durationSeconds: 5.5 },
      { label: "exhale", durationSeconds: 5.5 },
    ];
    const s = scheduleStateAt(coherent, 1, 10);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseRemainingSeconds).toBe(1); // ceil(11 - 10)
  });

  it("reports done at/after the planned total", () => {
    expect(scheduleStateAt(inEx, 2, 16).done).toBe(true);
    expect(scheduleStateAt(inEx, 2, 99).done).toBe(true);
  });
});
```

- [ ] **Step 2: Run it (fails)** → FAIL (missing module).

- [ ] **Step 3: Implement the scheduler**

`src/features/breathing/schedule.ts`:

```ts
import type { BreathingPhase } from "@/src/constants/breathing";

export interface ScheduleState {
  done: boolean;
  /** Absolute phase index across all cycles (0-based), or total count when done. */
  phaseIndex: number;
  phase: BreathingPhase | null;
  /** 1-based cycle the user is in. */
  cycleNumber: number;
  /** Whole seconds left in the current phase (ceil). */
  phaseRemainingSeconds: number;
  /** Whole seconds left in the whole session (ceil). */
  totalRemainingSeconds: number;
}

/**
 * Pure: where are we at `elapsedSeconds` into a session of `cycles` repetitions of `phases`?
 * `elapsedSeconds` may be fractional; phase durations may be fractional. Phases passed in
 * are the non-zero phases of one cycle, in order.
 */
export function scheduleStateAt(
  phases: BreathingPhase[],
  cycles: number,
  elapsedSeconds: number,
): ScheduleState {
  const cycleLength = phases.reduce((sum, p) => sum + p.durationSeconds, 0);
  const planned = cycleLength * cycles;
  const totalPhases = phases.length * cycles;

  if (phases.length === 0 || cycleLength <= 0 || elapsedSeconds >= planned) {
    return {
      done: true,
      phaseIndex: totalPhases,
      phase: null,
      cycleNumber: cycles,
      phaseRemainingSeconds: 0,
      totalRemainingSeconds: 0,
    };
  }

  let acc = 0;
  for (let idx = 0; idx < totalPhases; idx++) {
    const phase = phases[idx % phases.length];
    if (elapsedSeconds < acc + phase.durationSeconds) {
      return {
        done: false,
        phaseIndex: idx,
        phase,
        cycleNumber: Math.floor(idx / phases.length) + 1,
        phaseRemainingSeconds: Math.ceil(acc + phase.durationSeconds - elapsedSeconds),
        totalRemainingSeconds: Math.ceil(planned - elapsedSeconds),
      };
    }
    acc += phase.durationSeconds;
  }

  return {
    done: true,
    phaseIndex: totalPhases,
    phase: null,
    cycleNumber: cycles,
    phaseRemainingSeconds: 0,
    totalRemainingSeconds: 0,
  };
}
```

- [ ] **Step 4: Run it (passes)** → `npx jest src/features/breathing/schedule.test.ts` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 7: Resolver — built-in + custom → ResolvedExercise (TDD)

**Files:** Create `src/features/breathing/resolve-exercise.ts`, `src/features/breathing/resolve-exercise.test.ts`

The resolver produces one shape the runner consumes, and a hook that fetches a custom row when the route id isn't a built-in slug.

- [ ] **Step 1: Write the failing test** (pure built-in + custom mappers; the hook is exercised in the runner test)

`src/features/breathing/resolve-exercise.test.ts`:

```ts
import { resolveBuiltin, resolveCustom } from "@/src/features/breathing/resolve-exercise";
import type { BreathingExercise } from "@/src/features/breathing/exercise-types";

describe("resolveBuiltin", () => {
  it("resolves a known slug to phases + cycles + session name", () => {
    const r = resolveBuiltin("box-breathing");
    expect(r).not.toBeNull();
    expect(r!.source).toBe("builtin");
    expect(r!.exerciseName).toBe("box-breathing");
    expect(r!.phases).toHaveLength(4);
    expect(r!.defaultCycles).toBe(8);
    expect(r!.cycleOptions).toEqual([4, 8, 12]);
    expect(r!.color).toBeNull();
  });

  it("returns null for an unknown slug", () => {
    expect(resolveBuiltin("not-a-slug")).toBeNull();
  });
});

describe("resolveCustom", () => {
  const exercise: BreathingExercise = {
    id: "e-1",
    userId: "user-1",
    name: "Evening wind-down",
    inhaleSeconds: 5.5,
    holdInSeconds: 0,
    exhaleSeconds: 5.5,
    holdOutSeconds: 0,
    cycles: 6,
    color: "iris",
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-01T08:00:00.000Z",
  };

  it("maps a custom row, dropping zero-duration phases", () => {
    const r = resolveCustom(exercise);
    expect(r.source).toBe("custom");
    expect(r.exerciseName).toBe("e-1");
    expect(r.title).toBe("Evening wind-down");
    expect(r.phases).toEqual([
      { label: "inhale", durationSeconds: 5.5 },
      { label: "exhale", durationSeconds: 5.5 },
    ]);
    expect(r.defaultCycles).toBe(6);
    expect(r.cycleOptions).toContain(6);
    expect(r.color).toBe("iris");
  });
});
```

- [ ] **Step 2: Run it (fails)** → FAIL (missing module).

- [ ] **Step 3: Implement the resolver + hook**

`src/features/breathing/resolve-exercise.ts`:

```ts
import { breathingLookup } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import type {
  BreathingExercise,
  BreathingExerciseColor,
} from "@/src/features/breathing/exercise-types";
import { useBreathingExercise } from "@/src/features/breathing/exercises-queries";
import { useSession } from "@/src/providers/session-provider";

export interface ResolvedExercise {
  routeId: string;
  /** Stored in mindfulness_sessions.exercise_name: slug for built-ins, row id for custom. */
  exerciseName: string;
  source: "builtin" | "custom";
  title: string;
  /** i18n key suffix for built-ins (description/benefit live in cbt.json); null for custom. */
  i18nSlug: string | null;
  phases: BreathingPhase[];
  defaultCycles: number;
  cycleOptions: number[];
  color: BreathingExerciseColor | null;
}

export function resolveBuiltin(slug: string): ResolvedExercise | null {
  const pattern = breathingLookup[slug];
  if (!pattern) return null;
  return {
    routeId: slug,
    exerciseName: slug,
    source: "builtin",
    title: slug, // runner renders i18n title from i18nSlug; title is a fallback
    i18nSlug: slug,
    phases: pattern.phases,
    defaultCycles: pattern.defaultCycles,
    cycleOptions: pattern.cycleOptions,
    color: null,
  };
}

const PHASE_ORDER: { label: BreathingPhase["label"]; pick: (e: BreathingExercise) => number }[] = [
  { label: "inhale", pick: (e) => e.inhaleSeconds },
  { label: "hold", pick: (e) => e.holdInSeconds },
  { label: "exhale", pick: (e) => e.exhaleSeconds },
  { label: "holdOut", pick: (e) => e.holdOutSeconds },
];

export function resolveCustom(exercise: BreathingExercise): ResolvedExercise {
  const phases: BreathingPhase[] = PHASE_ORDER.map((p) => ({
    label: p.label,
    durationSeconds: p.pick(exercise),
  })).filter((p) => p.durationSeconds > 0);

  const c = exercise.cycles;
  const cycleOptions = Array.from(new Set([Math.max(1, Math.round(c / 2)), c, c * 2])).sort(
    (a, b) => a - b,
  );

  return {
    routeId: exercise.id,
    exerciseName: exercise.id,
    source: "custom",
    title: exercise.name,
    i18nSlug: null,
    phases,
    defaultCycles: c,
    cycleOptions,
    color: exercise.color,
  };
}

/** Resolve a route id to a built-in or a fetched custom exercise. */
export function useResolvedExercise(routeId: string | undefined): {
  resolved: ResolvedExercise | null;
  isLoading: boolean;
  notFound: boolean;
} {
  const { user } = useSession();
  const builtin = routeId ? resolveBuiltin(routeId) : null;
  const { data, isLoading } = useBreathingExercise(
    builtin || !routeId ? null : (user?.id ?? null),
    builtin || !routeId ? null : routeId,
  );
  const resolved = builtin ?? (data ? resolveCustom(data) : null);
  return {
    resolved,
    isLoading: !builtin && isLoading,
    notFound: !builtin && !isLoading && !data,
  };
}
```

- [ ] **Step 4: Run it (passes)** → `npx jest src/features/breathing/resolve-exercise.test.ts` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 8: Runner — consume ResolvedExercise + fractional scheduler

**Files:** Modify (full rewrite) `app/(app)/tools/breathing/[slug].tsx`

Replace the entire file with the version below. Changes vs Phase 1: resolves built-in OR custom via `useResolvedExercise`; drives timing from `schedule.ts` via a 250ms timestamp ticker (fractional-safe); renders title/description from i18n for built-ins and the row name for custom; saves with `resolved.exerciseName`.

- [ ] **Step 1: Rewrite the runner**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import type { BreathingPhase } from "@/src/constants/breathing";
import { totalSeconds, formatClock, elapsedMinutes } from "@/src/features/breathing/cycle-math";
import { scheduleStateAt } from "@/src/features/breathing/schedule";
import { useResolvedExercise } from "@/src/features/breathing/resolve-exercise";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type ScreenPhase = "intro" | "active";

const CIRCLE_MIN = 80;
const CIRCLE_MAX = 160;
const TICK_MS = 250;

export default function BreathingExerciseScreen() {
  const { t } = useTranslation("cbt");
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const { resolved, isLoading, notFound } = useResolvedExercise(slug);

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
  const [selectedCycles, setSelectedCycles] = useState<number>(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);

  const phaseIndexRef = useRef(-1);
  const startMsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRef = useRef(false);

  const circleSize = useSharedValue(CIRCLE_MIN);
  const saveMutation = useSaveBreathingSession(user?.id ?? null);

  const colorScheme = useAppColorScheme();
  const aqua = colorScheme === "dark" ? "196, 58%, 62%" : "196, 52%, 45%";

  const circleStyle = useAnimatedStyle(() => ({
    width: circleSize.value,
    height: circleSize.value,
    borderRadius: circleSize.value / 2,
    backgroundColor: `hsla(${aqua}, 0.22)`,
    borderWidth: 2,
    borderColor: `hsl(${aqua})`,
  }));

  const haloStyle = useAnimatedStyle(() => {
    const size = circleSize.value * 1.5;
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: `hsla(${aqua}, 0.1)`,
      opacity: interpolate(circleSize.value, [CIRCLE_MIN, CIRCLE_MAX], [0.45, 1]),
      alignItems: "center",
      justifyContent: "center",
    };
  });

  // Initialise the cycle selector once the exercise resolves.
  useEffect(() => {
    if (resolved && selectedCycles === 0) setSelectedCycles(resolved.defaultCycles);
  }, [resolved, selectedCycles]);

  const animateForPhase = (phase: BreathingPhase) => {
    const toSize =
      phase.label === "inhale"
        ? CIRCLE_MAX
        : phase.label === "exhale"
          ? CIRCLE_MIN
          : circleSize.value;
    circleSize.value = withTiming(toSize, {
      duration: phase.durationSeconds * 1000,
      easing: Easing.inOut(Easing.ease),
    });
  };

  useEffect(() => {
    if (screenPhase !== "active" || !resolved) return;

    const tick = () => {
      const elapsed = (Date.now() - startMsRef.current) / 1000;
      const state = scheduleStateAt(resolved.phases, selectedCycles, elapsed);
      setSecondsLeft(state.totalRemainingSeconds);
      setPhaseSecondsLeft(state.phaseRemainingSeconds);

      if (state.done) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        void handleFinish();
        return;
      }
      if (state.phase && state.phaseIndex !== phaseIndexRef.current) {
        phaseIndexRef.current = state.phaseIndex;
        setCurrentPhase(state.phase);
        setCurrentCycle(state.cycleNumber);
        animateForPhase(state.phase);
      }
    };

    const id = setInterval(tick, TICK_MS);
    intervalRef.current = id;
    tick(); // paint the first phase immediately

    return () => {
      clearInterval(id);
      intervalRef.current = null;
    };
    // Interval reads time via refs; re-subscribing each tick would drift the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenPhase, resolved]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolved || notFound) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("breathing.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = resolved.i18nSlug
    ? t(`breathing.exercises.${resolved.i18nSlug}.title`)
    : resolved.title;
  const description = resolved.i18nSlug
    ? t(`breathing.exercises.${resolved.i18nSlug}.shortDescription`)
    : null;
  const benefit = resolved.i18nSlug ? t(`breathing.exercises.${resolved.i18nSlug}.benefit`) : null;

  const handleStart = () => {
    if (!selectedCycles) return;
    phaseIndexRef.current = -1;
    startMsRef.current = Date.now();
    setSecondsLeft(totalSeconds(resolved.phases, selectedCycles));
    setScreenPhase("active");
  };

  const handleFinish = async () => {
    if (!selectedCycles) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const planned = totalSeconds(resolved.phases, selectedCycles);
    const elapsed = (Date.now() - startMsRef.current) / 1000;
    const remaining = Math.max(0, planned - elapsed);
    const elapsedMins = elapsedMinutes(planned, remaining);
    try {
      await saveMutation.mutateAsync({
        exerciseName: resolved.exerciseName,
        durationMinutes: elapsedMins,
        reflection: "",
        feelingAfter: null,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
    } catch {
      finishingRef.current = false;
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const phaseLabelKey = currentPhase ? (`breathing.phases.${currentPhase.label}` as const) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={title} />
            {description ? <Text variant="muted">{description}</Text> : null}
          </View>

          {screenPhase === "intro" ? (
            <>
              <Card>
                {benefit ? (
                  <CardHeader>
                    <CardTitle>{benefit}</CardTitle>
                  </CardHeader>
                ) : null}
                <CardContent>
                  <View className="gap-1">
                    {resolved.phases.map((phase, i) => (
                      <Text key={i} variant="muted">
                        {t(`breathing.phases.${phase.label}`)} - {phase.durationSeconds}s
                      </Text>
                    ))}
                  </View>
                </CardContent>
              </Card>

              <View className="gap-3">
                <Label>{t("breathing.chooseCycles")}</Label>
                <View className="flex-row items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    accessibilityLabel={t("breathing.decreaseCycles")}
                    onPress={() => setSelectedCycles((c) => Math.max(1, c - 1))}
                  >
                    <Text className="text-lg">−</Text>
                  </Button>
                  <View className="items-center">
                    <Text className="text-3xl font-bold tabular-nums">
                      {t("breathing.cycles", { count: selectedCycles })}
                    </Text>
                    <Text variant="muted" className="text-sm tabular-nums">
                      {t("breathing.totalTimeLabel")} ·{" "}
                      {formatClock(totalSeconds(resolved.phases, selectedCycles))}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    accessibilityLabel={t("breathing.increaseCycles")}
                    onPress={() => setSelectedCycles((c) => c + 1)}
                  >
                    <Text className="text-lg">+</Text>
                  </Button>
                </View>
                <View className="flex-row flex-wrap justify-center gap-2">
                  {resolved.cycleOptions.map((c) => (
                    <Button
                      key={c}
                      onPress={() => setSelectedCycles(c)}
                      variant={selectedCycles === c ? "default" : "outline"}
                    >
                      <Text>{t("breathing.cycles", { count: c })}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <Button disabled={!selectedCycles} onPress={handleStart}>
                <Text>{t("breathing.start")}</Text>
              </Button>
            </>
          ) : null}

          {screenPhase === "active" ? (
            <View className="gap-6 items-center">
              <View
                className="items-center justify-center"
                style={{ height: CIRCLE_MAX * 1.5 + 40 }}
              >
                <Animated.View style={haloStyle}>
                  <Animated.View style={circleStyle} />
                </Animated.View>
              </View>

              {phaseLabelKey ? (
                <Text className="text-2xl font-semibold text-center">{t(phaseLabelKey)}</Text>
              ) : null}

              <Text variant="muted" className="text-center text-lg">
                {phaseSecondsLeft}s
              </Text>

              <Text variant="muted" className="text-center">
                {t("breathing.cycleProgress", { current: currentCycle, total: selectedCycles })}
              </Text>

              <Text variant="muted" className="text-center">
                {timeDisplay}
              </Text>

              <Button
                onPress={() => void handleFinish()}
                variant="ghost"
                disabled={saveMutation.isPending}
              >
                <Text>{t("breathing.finishEarly")}</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Update the existing runner test for the resolver hook**

The Phase 1 test `src/features/breathing/breathing-runner.test.tsx` mocks `useSaveBreathingSession` from `@/src/features/breathing/queries`. The runner now also calls `useResolvedExercise`, which calls `useBreathingExercise` (queries) and `useSession`. For a built-in slug (`box-breathing`) the resolver returns synchronously without fetching, so the only new mock needed is `@/src/features/breathing/exercises-queries` returning a disabled query. Add this mock to the file (top, with the others):

```tsx
jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercise: () => ({ data: null, isLoading: false }),
  useBreathingExercises: () => ({ data: [] }),
}));
```

The existing three assertions ("8 cycles" via `getAllByText`, "12 cycles" → "3:12", Start → "Inhale" + "Cycle 1 of 8") remain valid: with `react-native-reanimated` mocked and the 250ms ticker, the first `tick()` runs synchronously on Start (we call `tick()` immediately) and sets phase/cycle. Keep `getAllByText` for "8 cycles". If the Start assertion needs the immediate paint, it is already covered because `handleStart` sets `screenPhase` and the effect's immediate `tick()` resolves phase index 0 → "Inhale"/"Cycle 1 of 8" synchronously under jsdom timers.

- [ ] **Step 3: Run runner + breathing tests**

Run: `npx jest src/features/breathing app/\\(app\\)/tools/breathing 2>/dev/null; npx jest src/features/breathing`
Expected: PASS. Then `npx tsc --noEmit` clean, `npx eslint "app/(app)/tools/breathing/[slug].tsx"` clean. Do NOT commit.

> If the "Cycle 1 of 8" assertion is flaky because the immediate `tick()` reads `Date.now()` after `startMsRef` is set in `handleStart` (same synchronous turn, elapsed≈0 → phase 0), it is deterministic. Do not add fake timers unless a failure shows otherwise.

---

## Task 9: Builder / editor screen

**Files:** Create `src/features/breathing/breathing-exercise-editor-screen.tsx`, `app/(app)/tools/breathing/new.tsx`, `src/features/breathing/breathing-exercise-editor-screen.test.tsx`

- [ ] **Step 1: Implement the editor screen**

`src/features/breathing/breathing-exercise-editor-screen.tsx`:

```tsx
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { totalSeconds, formatClock } from "@/src/features/breathing/cycle-math";
import { breathingColorClass } from "@/src/features/breathing/exercise-colors";
import {
  useBreathingExercise,
  useBreathingExercises,
  useDeleteBreathingExercise,
  useSaveBreathingExercise,
} from "@/src/features/breathing/exercises-queries";
import {
  BREATHING_NAME_MAX,
  CYCLES_MAX,
  PHASE_SECONDS_MAX,
  PHASE_STEP,
  SUGGESTED_PATTERNS,
  breathingExerciseInputSchema,
} from "@/src/features/breathing/exercise-schema";
import {
  BREATHING_EXERCISE_COLORS,
  type BreathingExercise,
  type BreathingExerciseColor,
  type BreathingExerciseInput,
} from "@/src/features/breathing/exercise-types";
import { EMPTY_EXERCISE_INPUT } from "@/src/features/breathing/exercise-schema";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

type PhaseKey = "inhaleSeconds" | "holdInSeconds" | "exhaleSeconds" | "holdOutSeconds";

const PHASE_FIELDS: { key: PhaseKey; labelKey: string }[] = [
  { key: "inhaleSeconds", labelKey: "breathing.phases.inhale" },
  { key: "holdInSeconds", labelKey: "breathing.phases.hold" },
  { key: "exhaleSeconds", labelKey: "breathing.phases.exhale" },
  { key: "holdOutSeconds", labelKey: "breathing.phases.holdOut" },
];

function toInput(e: BreathingExercise): BreathingExerciseInput {
  return {
    name: e.name,
    inhaleSeconds: e.inhaleSeconds,
    holdInSeconds: e.holdInSeconds,
    exhaleSeconds: e.exhaleSeconds,
    holdOutSeconds: e.holdOutSeconds,
    cycles: e.cycles,
    color: e.color,
  };
}

export function BreathingExerciseEditorScreen({ exerciseId }: { exerciseId?: string | null }) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const showToast = useToastStore((s) => s.showToast);

  const editMode = Boolean(exerciseId);
  const { data: cachedList } = useBreathingExercises(editMode ? userId : null);
  const fromCache = exerciseId ? (cachedList?.find((e) => e.id === exerciseId) ?? null) : null;
  const { data: fetched, isLoading } = useBreathingExercise(
    editMode && !fromCache ? userId : null,
    editMode && !fromCache ? exerciseId! : null,
  );
  const existing = editMode ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveBreathingExercise(userId);
  const deleteMutation = useDeleteBreathingExercise(userId);
  const [input, setInput] = useState<BreathingExerciseInput>(EMPTY_EXERCISE_INPUT);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!existing) return;
    setInput(toInput(existing));
    setError("");
  }, [existing]);

  function update<K extends keyof BreathingExerciseInput>(
    key: K,
    value: BreathingExerciseInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function stepPhase(key: PhaseKey, delta: number) {
    setInput((prev) => {
      const next = Math.min(PHASE_SECONDS_MAX, Math.max(0, prev[key] + delta));
      return { ...prev, [key]: next };
    });
  }

  const phasesForPreview = PHASE_FIELDS.map((f) => ({ durationSeconds: input[f.key] })).filter(
    (p) => p.durationSeconds > 0,
  );
  const cycleTime = formatClock(
    totalSeconds(
      phasesForPreview.map((p) => ({
        label: "inhale" as const,
        durationSeconds: p.durationSeconds,
      })),
      input.cycles,
    ),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/tools/breathing" as Parameters<typeof router.replace>[0]);
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = { ...input, name: input.name.trim() };
    const parsed = breathingExerciseInputSchema.safeParse(trimmed);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(
        first?.message === "required"
          ? t("breathing.builder.nameRequired")
          : first?.message === "activePhase"
            ? t("breathing.builder.activePhaseRequired")
            : t("breathing.builder.saveError"),
      );
      return;
    }
    setError("");
    try {
      await saveMutation.mutateAsync({ input: parsed.data, id: exerciseId ?? undefined });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("breathing.builder.saveError"));
    }
  };

  const handleDelete = async () => {
    if (!exerciseId) return;
    try {
      await deleteMutation.mutateAsync(exerciseId);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      goBack();
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("breathing.builder.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  const saving = saveMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6 pb-12">
        <ScreenHeader
          title={editMode ? t("breathing.builder.editTitle") : t("breathing.builder.newTitle")}
        />

        <View className="gap-2">
          <Label>{t("breathing.builder.nameLabel")}</Label>
          <Input
            accessibilityLabel={t("breathing.builder.nameLabel")}
            maxLength={BREATHING_NAME_MAX}
            onChangeText={(v) => update("name", v)}
            placeholder={t("breathing.builder.namePlaceholder")}
            value={input.name}
          />
        </View>

        <View className="gap-3">
          <Label>{t("breathing.builder.patternLabel")}</Label>
          <View className="flex-row gap-2">
            {PHASE_FIELDS.map((f) => (
              <View
                key={f.key}
                className="flex-1 items-center gap-1.5 rounded-xl border border-border p-2"
              >
                <Text className="text-xs font-semibold">{t(f.labelKey)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t(f.labelKey)} +`}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => stepPhase(f.key, PHASE_STEP)}
                >
                  <Text className="text-base text-aqua">▲</Text>
                </Pressable>
                <Text className="tabular-nums text-sm font-semibold">
                  {input[f.key].toFixed(1)}s
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t(f.labelKey)} −`}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => stepPhase(f.key, -PHASE_STEP)}
                >
                  <Text className="text-base text-aqua">▼</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Label>{t("breathing.builder.suggestedLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {SUGGESTED_PATTERNS.map((p) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() =>
                  setInput((prev) => ({
                    ...prev,
                    inhaleSeconds: p.inhaleSeconds,
                    holdInSeconds: p.holdInSeconds,
                    exhaleSeconds: p.exhaleSeconds,
                    holdOutSeconds: p.holdOutSeconds,
                  }))
                }
                className="rounded-full border border-border bg-background px-3 py-1.5"
                role="button"
              >
                <Text className="text-xs font-semibold tabular-nums">
                  {p.inhaleSeconds}-{p.holdInSeconds}-{p.exhaleSeconds}-{p.holdOutSeconds}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Label>{t("breathing.builder.cyclesLabel")}</Label>
          <View className="flex-row items-center justify-center gap-6">
            <Button
              variant="outline"
              accessibilityLabel={t("breathing.decreaseCycles")}
              onPress={() => update("cycles", Math.max(1, input.cycles - 1))}
            >
              <Text className="text-lg">−</Text>
            </Button>
            <View className="items-center">
              <Text className="text-3xl font-bold tabular-nums">
                {t("breathing.cycles", { count: input.cycles })}
              </Text>
              <Text variant="muted" className="text-sm tabular-nums">
                {t("breathing.totalTimeLabel")} · {cycleTime}
              </Text>
            </View>
            <Button
              variant="outline"
              accessibilityLabel={t("breathing.increaseCycles")}
              onPress={() => update("cycles", Math.min(CYCLES_MAX, input.cycles + 1))}
            >
              <Text className="text-lg">+</Text>
            </Button>
          </View>
        </View>

        <View className="gap-2">
          <Label>{t("breathing.builder.colorLabel")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {BREATHING_EXERCISE_COLORS.map((color) => {
              const chip = breathingColorClass(color);
              const active = input.color === color;
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`breathing.builder.colors.${color}` as const)}
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() => update("color", color as BreathingExerciseColor)}
                  className={cn(
                    "size-9 items-center justify-center rounded-full border",
                    chip.bg,
                    active ? chip.border : "border-border",
                  )}
                  role="button"
                >
                  <View className={cn("size-4 rounded-full border", chip.border, chip.bg)} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("breathing.builder.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button disabled={saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{saving ? t("breathing.builder.saving") : t("breathing.builder.save")}</Text>
            </Button>
          </View>
        </View>

        {editMode ? (
          <Button onPress={() => void handleDelete()} variant="ghost">
            <Text className="text-destructive">{t("breathing.builder.delete")}</Text>
          </Button>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Add the route**

`app/(app)/tools/breathing/new.tsx`:

```tsx
import { useLocalSearchParams } from "expo-router";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";

export default function BreathingExerciseEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <BreathingExerciseEditorScreen exerciseId={id ?? null} />;
}
```

- [ ] **Step 3: Component test for the editor**

`src/features/breathing/breathing-exercise-editor-screen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";
import { renderWithProviders } from "@/test/render-with-providers";

const mockSave = jest.fn().mockResolvedValue({ id: "e-1" });
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: { canGoBack: () => true, back: () => mockBack(), replace: jest.fn() },
}));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));
jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: [] }),
  useBreathingExercise: () => ({ data: null, isLoading: false }),
  useSaveBreathingExercise: () => ({ mutateAsync: mockSave, isPending: false }),
  useDeleteBreathingExercise: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe("BreathingExerciseEditorScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks save when the name is blank and shows an error", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(screen.getByText("Give your exercise a name.")).toBeTruthy());
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("saves a named exercise with the default pattern", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.changeText(screen.getByLabelText("Name"), "Evening wind-down");
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][0].input.name).toBe("Evening wind-down");
  });
});
```

(The asserted strings — "Save", "Name", "Give your exercise a name." — are the English i18n values added in Task 11. Write Task 11's keys before running this test, or expect a transient failure until then.)

- [ ] **Step 4: Run + typecheck** → `npx jest src/features/breathing/breathing-exercise-editor-screen.test.tsx` (after Task 11 keys exist) → PASS; `npx tsc --noEmit` clean; `npx eslint` on the new files clean. Do NOT commit.

---

## Task 10: List integration — custom cards + "New exercise"

**Files:** Modify `app/(app)/tools/breathing/index.tsx`

- [ ] **Step 1: Add custom cards and the new-exercise entry**

In `app/(app)/tools/breathing/index.tsx`, add imports:

```tsx
import { breathingColorClass } from "@/src/features/breathing/exercise-colors";
import { useBreathingExercises } from "@/src/features/breathing/exercises-queries";
```

Inside `BreathingScreen`, after the existing `useBreathingSessions` line, add:

```tsx
const { data: customExercises } = useBreathingExercises(user?.id ?? null);
```

Then, immediately after the closing `</View>` of the built-in pattern list `<View className="gap-3"> ... </View>` block (the one containing the three `PatternRow`s), add a custom-exercises section:

```tsx
<View className="gap-3">
  <View className="flex-row items-baseline justify-between">
    <Text variant="h2" className="text-xl font-bold tracking-tight border-0 pb-0">
      {t("breathing.yourExercisesTitle")}
    </Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("breathing.newExercise")}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push("/tools/breathing/new")}
    >
      <Text className="text-sm font-semibold text-aqua">{t("breathing.newExercise")}</Text>
    </Pressable>
  </View>

  {customExercises && customExercises.length > 0 ? (
    customExercises.map((exercise) => {
      const chip = breathingColorClass(exercise.color);
      return (
        <View key={exercise.id} className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={exercise.name}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => router.push(`/tools/breathing/${exercise.id}`)}
            className={cn(
              "flex-1 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-80",
              chip.border,
              chip.bg,
            )}
          >
            <View className={cn("size-3 rounded-full border", chip.border, chip.bg)} />
            <Text className="flex-1 text-[15px] font-semibold tracking-tight">{exercise.name}</Text>
            <Text variant="muted" className="text-xs tabular-nums">
              {t("breathing.cycles", { count: exercise.cycles })}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("breathing.editExercise", { name: exercise.name })}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() =>
              router.push({ pathname: "/tools/breathing/new", params: { id: exercise.id } })
            }
            className="p-2"
          >
            <Icon name="pencil" size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      );
    })
  ) : (
    <Text variant="muted" className="text-sm">
      {t("breathing.noExercises")}
    </Text>
  )}
</View>
```

Add the `cn` import if not present: `import { cn } from "@/lib/utils";`. `Icon`, `Pressable`, `DEFAULT_INTERACTIVE_HIT_SLOP`, `router`, and `Text` are already imported in this file.

> If `Icon name="pencil"` is not a valid icon in this project's icon set, substitute an existing edit-like icon (check `src/components/react-native-reusables/icon`). Flag as DONE_WITH_CONCERNS if unsure rather than guessing.

- [ ] **Step 2: Update the index test (no behavior break)**

The existing `src/features/breathing/breathing-screen.test.tsx` does not mock `useBreathingExercises`. Add a mock so the new hook returns empty:

```tsx
jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: [] }),
}));
```

The existing assertions (header, taglines, 3 pattern rows, meta badges, recent card) are unaffected. Add one assertion:

```tsx
it("shows the empty state for custom exercises", () => {
  renderWithProviders(<BreathingScreen />);
  expect(screen.getByText("You haven't made any yet.")).toBeTruthy();
});
```

- [ ] **Step 3: Run + lint** → `npx jest src/features/breathing/breathing-screen.test.tsx` (after Task 11 keys) → PASS; `npx tsc --noEmit` clean; `npx eslint "app/(app)/tools/breathing/index.tsx"` clean. Do NOT commit.

---

## Task 11: i18n keys

**Files:** Modify `src/i18n/locales/en/cbt.json` (the `breathing` object)

- [ ] **Step 1: Add keys**

Inside the `"breathing"` object in `src/i18n/locales/en/cbt.json`, add:

```json
    "yourExercisesTitle": "Your exercises",
    "newExercise": "New exercise",
    "editExercise": "Edit {{name}}",
    "noExercises": "You haven't made any yet.",
    "builder": {
      "newTitle": "New breathing pattern",
      "editTitle": "Edit pattern",
      "nameLabel": "Name",
      "namePlaceholder": "e.g. Evening wind-down",
      "patternLabel": "Breathing pattern",
      "suggestedLabel": "Suggested patterns",
      "cyclesLabel": "Breath cycles & duration",
      "colorLabel": "Exercise card color",
      "cancel": "Cancel",
      "save": "Save",
      "saving": "Saving…",
      "delete": "Delete exercise",
      "nameRequired": "Give your exercise a name.",
      "activePhaseRequired": "Add at least an inhale or an exhale.",
      "saveError": "Could not save. Please try again.",
      "colors": {
        "aqua": "Aqua",
        "mist": "Mist",
        "iris": "Iris",
        "clay": "Clay",
        "amber": "Amber",
        "emerald": "Emerald",
        "violet": "Violet",
        "rose": "Rose"
      }
    },
```

- [ ] **Step 2: Validate JSON** → `node -e "require('./src/i18n/locales/en/cbt.json'); console.log('ok')"` → `ok`. Do NOT commit.

---

## Task 12: Custom session logging + recent-name resolution

**Files:** Modify `src/features/breathing/queries.ts`, `src/features/breathing/queries.test.tsx`, `app/(app)/tools/breathing/index.tsx`

The "Recent sessions" card filters by built-in slugs only and renders names via i18n. Custom sessions log `exercise_name = <custom id>`, so they must be included in the filter and resolved to the row name.

- [ ] **Step 1: Update the sessions hook to include custom ids**

In `src/features/breathing/queries.ts`, change `useBreathingSessions` to accept and merge custom ids. Replace the `useBreathingSessions` function with:

```ts
export function useBreathingSessions(userId: string | null, limit = 30, customIds: string[] = []) {
  const names = [...breathingSlugs, ...customIds];
  return useQuery({
    queryKey: userId
      ? [...breathingKeys.list(userId), limit, customIds.join(",")]
      : ["breathing", "list", "anonymous"],
    queryFn: () => listMindfulnessSessionsByNames(userId!, names, limit),
    enabled: Boolean(userId),
  });
}
```

- [ ] **Step 2: Update the existing queries test**

In `src/features/breathing/queries.test.tsx`, the first test asserts `mockList` was called with `("user-1", [...breathingSlugs], 30)`. Update the call and assertion to pass custom ids and expect them merged:

```tsx
const { result } = renderHook(() => useBreathingSessions("user-1", 30, ["e-1"]), {
  wrapper: makeWrapper(client),
});

await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(mockList).toHaveBeenCalledWith("user-1", [...breathingSlugs, "e-1"], 30);
```

(The "does not fetch when userId is null" test is unchanged.)

- [ ] **Step 3: Wire custom ids + name resolution into the index**

In `app/(app)/tools/breathing/index.tsx`, the `customExercises` list is already fetched (Task 10). Update the recent-session usage:

Change the sessions hook call from:

```tsx
const { data: sessions } = useBreathingSessions(user?.id ?? null, 7);
```

to (pass the custom ids so custom sessions are included):

```tsx
const customIds = (customExercises ?? []).map((e) => e.id);
const { data: sessions } = useBreathingSessions(user?.id ?? null, 7, customIds);
```

(Move the `useBreathingExercises` call above the `useBreathingSessions` call so `customExercises` is defined first.)

Then replace the recent-card title line:

```tsx
<Text className="text-sm font-semibold">
  {t(`breathing.exercises.${lastSession.exerciseName}.title`)}
</Text>
```

with a resolver that handles both built-in slugs and custom ids:

```tsx
<Text className="text-sm font-semibold">
  {breathingSlugs.includes(lastSession.exerciseName)
    ? t(`breathing.exercises.${lastSession.exerciseName}.title`)
    : ((customExercises ?? []).find((e) => e.id === lastSession.exerciseName)?.name ??
      t("breathing.deletedExercise"))}
</Text>
```

Add the import `import { breathingPatterns, breathingSlugs } from "@/src/constants/breathing";` (replace the existing `breathingPatterns`-only import).

- [ ] **Step 4: Add the fallback i18n key**

In `src/i18n/locales/en/cbt.json` `breathing` object, add:

```json
    "deletedExercise": "Custom exercise",
```

- [ ] **Step 5: Run the breathing suite**

Run: `npx jest src/features/breathing`
Expected: all PASS (queries test now expects merged ids; index test still green). `npx tsc --noEmit` clean. Do NOT commit.

---

## Final Verification

- [ ] **Run the full gate**

Run: `npm run verify`
Expected: lint, format, typecheck, tests, coverage ratchet all pass (exit 0). If `format:check` fails, run `npx prettier --write` on the changed files and re-run. If `coverage:ratchet` dropped, add cases to the relevant `*.test.ts(x)` for the uncovered branch.

- [ ] **Manual smoke checklist (report only; do not commit)**

Confirm by reading code that: (a) `/tools/breathing/new` opens the editor; (b) saving routes back to the list; (c) a custom card routes to `/tools/breathing/<id>` and the runner resolves it as custom; (d) the pencil routes to `/tools/breathing/new?id=<id>`; (e) built-in patterns still run unchanged.

- [ ] **Hand off** — do NOT commit/stage. Report results + the migration file (which the user must apply to prod/local DB) for the user's git + DB handling.

---

## Self-Review notes (applied)

- **Spec coverage:** custom builder matching the reference incl. decimal seconds, suggested patterns, cycles+calculated time, card color (§9) ✓; `breathing_exercises` table + RLS (§7.1, migration `20260572`) ✓; list cards + edit/delete + "New" (§10) ✓; custom session logging via merged ids + name resolution (§10) ✓; fractional precision via `schedule.ts` (spec note on Phase-2 timer) ✓. Export-RPC integration deferred (§14 open item) — noted, not built. Audio (§5,6,11) is Plan 3.
- **Type consistency:** `BreathingExerciseInput`/`BreathingExercise` shared across schema, repository, queries, resolver, editor. `ResolvedExercise` shared by resolver + runner. `saveBreathingExercise(userId, input, id?)` and `useSaveBreathingExercise({input, id})` signatures match call sites. Phase labels (`inhale|hold|exhale|holdOut`) match `BreathingPhase` from Phase 1.
- **No placeholders:** every code step shows complete content; SQL, TSX, and tests are full.
- **Known soft spots flagged for the implementer:** NativeWind color tokens (Task 2 note), the `pencil` icon (Task 10 note), and the editor test depending on Task 11 keys (Task 9 note).

```

```

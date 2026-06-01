# Breathing — Phase 1: Cycle-based Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace minute-based session selection in the breathing tool with a cycle-based model (cycles dial + quick-pick chips + a live calculated total time), for the three built-in patterns.

**Architecture:** A small pure-function module (`cycle-math.ts`) owns all cycle↔time math. The built-in pattern constants gain `defaultCycles` + `cycleOptions` and drop the minute `durations` field. The runner screen (`[slug].tsx`) is refactored to select cycles, show calculated time, run N cycles, and display cycle progress. The per-second timer and circle animation are otherwise unchanged. Built-in phase durations remain integers in this phase; fractional-second precision (needed by custom exercises) is deferred to Phase 2.

**Tech Stack:** React Native, Expo Router, `react-native-reanimated` (mocked in tests), `react-i18next`, Jest + Testing Library.

> **Plan scope note:** This is plan 1 of 3 for the approved spec `docs/superpowers/specs/2026-06-01-breathing-sounds-and-custom-exercises-design.md`. Plan 2 (custom-exercise builder + `breathing_exercises` table + list cards + custom session logging) and Plan 3 (audio engine + sound catalog + Sounds sheet + audio preferences) will be written after this phase lands.

> **Git rule (project standing rule):** Do NOT `git add`, `git commit`, or otherwise stage/commit. Each task ends with a verification checkpoint only; the user manages all git history.

---

## File Structure

| File                                               | Responsibility                                                                              | Create / Modify |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| `src/features/breathing/cycle-math.ts`             | Pure cycle↔time helpers (`cycleSeconds`, `totalSeconds`, `formatClock`, `elapsedMinutes`)   | Create          |
| `src/features/breathing/cycle-math.test.ts`        | Unit tests for the math helpers                                                             | Create          |
| `src/constants/breathing.ts`                       | Built-in pattern data: 4-phase shape + `defaultCycles` + `cycleOptions`; remove `durations` | Modify          |
| `app/(app)/tools/breathing/[slug].tsx`             | Runner: cycles selector + calculated time + cycle-driven run + cycle progress               | Modify          |
| `src/features/breathing/breathing-runner.test.tsx` | Component tests for the cycle runner                                                        | Create          |
| `src/i18n/locales/en/cbt.json`                     | New breathing i18n keys (`chooseCycles`, `cycles`, `totalTimeLabel`, `cycleProgress`)       | Modify          |

---

## Task 1: Cycle math module

**Files:**

- Create: `src/features/breathing/cycle-math.ts`
- Test: `src/features/breathing/cycle-math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/breathing/cycle-math.test.ts`:

```ts
import {
  cycleSeconds,
  totalSeconds,
  formatClock,
  elapsedMinutes,
} from "@/src/features/breathing/cycle-math";

const boxPhases = [
  { label: "inhale" as const, durationSeconds: 4 },
  { label: "hold" as const, durationSeconds: 4 },
  { label: "exhale" as const, durationSeconds: 4 },
  { label: "holdOut" as const, durationSeconds: 4 },
];

describe("cycle-math", () => {
  it("sums one cycle's phase durations", () => {
    expect(cycleSeconds(boxPhases)).toBe(16);
  });

  it("supports fractional phase durations", () => {
    expect(cycleSeconds([{ label: "inhale", durationSeconds: 5.5 }])).toBe(5.5);
  });

  it("multiplies cycle length by cycle count", () => {
    expect(totalSeconds(boxPhases, 8)).toBe(128);
  });

  it("formats sub-hour durations as M:SS", () => {
    expect(formatClock(128)).toBe("2:08");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(9)).toBe("0:09");
  });

  it("formats hour+ durations as HH:MM:SS", () => {
    expect(formatClock(3808)).toBe("01:03:28");
  });

  it("rounds elapsed time to whole minutes, floored at 1", () => {
    expect(elapsedMinutes(600, 0)).toBe(10);
    expect(elapsedMinutes(128, 64)).toBe(1);
    expect(elapsedMinutes(128, 200)).toBe(1); // remaining > planned clamps to 0 elapsed -> min 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/breathing/cycle-math.test.ts`
Expected: FAIL — `Cannot find module '@/src/features/breathing/cycle-math'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/breathing/cycle-math.ts`:

```ts
import type { BreathingPhase } from "@/src/constants/breathing";

/** Total seconds in a single cycle (sum of all phase durations). */
export function cycleSeconds(phases: BreathingPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.durationSeconds, 0);
}

/** Total seconds for a session of `cycles` repetitions. */
export function totalSeconds(phases: BreathingPhase[], cycles: number): number {
  return cycleSeconds(phases) * cycles;
}

/** "M:SS" under an hour, "HH:MM:SS" at an hour or more. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/**
 * Whole minutes actually breathed, for the session log. Clamps negative
 * remaining to 0 elapsed and floors the result at 1 minute.
 */
export function elapsedMinutes(plannedSeconds: number, remainingSeconds: number): number {
  const elapsed = plannedSeconds - Math.max(0, remainingSeconds);
  return Math.max(1, Math.round(elapsed / 60));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/breathing/cycle-math.test.ts`
Expected: PASS (6 passing).

- [ ] **Step 5: Verification checkpoint (no commit)**

Run: `npx tsc --noEmit`
Expected: no errors. Do NOT stage or commit — the user manages git.

---

## Task 2: Convert built-in patterns to the cycle model

**Files:**

- Modify: `src/constants/breathing.ts` (full rewrite of the data shape)

- [ ] **Step 1: Write the failing test**

Append to `src/features/breathing/cycle-math.test.ts`:

```ts
import { breathingPatterns, breathingLookup } from "@/src/constants/breathing";

describe("built-in patterns adopt the cycle model", () => {
  it("every pattern declares defaultCycles and cycleOptions", () => {
    for (const pattern of breathingPatterns) {
      expect(pattern.defaultCycles).toBeGreaterThan(0);
      expect(pattern.cycleOptions.length).toBeGreaterThan(0);
      expect(pattern.cycleOptions).toContain(pattern.defaultCycles);
      // `durations` (minutes) must be gone.
      expect((pattern as Record<string, unknown>).durations).toBeUndefined();
    }
  });

  it("box-breathing is a 16s, 4-phase cycle", () => {
    expect(cycleSeconds(breathingLookup["box-breathing"].phases)).toBe(16);
    expect(breathingLookup["box-breathing"].phases).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/breathing/cycle-math.test.ts`
Expected: FAIL — `defaultCycles` is undefined / `durations` still present.

- [ ] **Step 3: Write minimal implementation**

Replace the entire contents of `src/constants/breathing.ts` with:

```ts
export type PhaseLabel = "inhale" | "hold" | "exhale" | "holdOut";

export interface BreathingPhase {
  label: PhaseLabel;
  /** May be fractional for custom exercises (Phase 2); built-ins are integers. */
  durationSeconds: number;
}

export interface BreathingPattern {
  slug: string;
  phases: BreathingPhase[];
  /** Pre-selected cycle count when the runner opens. */
  defaultCycles: number;
  /** Quick-pick chips in the cycles selector; must include defaultCycles. */
  cycleOptions: number[];
}

export const breathingPatterns: BreathingPattern[] = [
  {
    slug: "box-breathing",
    phases: [
      { label: "inhale", durationSeconds: 4 },
      { label: "hold", durationSeconds: 4 },
      { label: "exhale", durationSeconds: 4 },
      { label: "holdOut", durationSeconds: 4 },
    ],
    defaultCycles: 8, // 8 x 16s = 128s
    cycleOptions: [4, 8, 12],
  },
  {
    slug: "4-7-8",
    phases: [
      { label: "inhale", durationSeconds: 4 },
      { label: "hold", durationSeconds: 7 },
      { label: "exhale", durationSeconds: 8 },
    ],
    defaultCycles: 4, // 4 x 19s = 76s
    cycleOptions: [4, 6, 8],
  },
  {
    slug: "coherent-breathing",
    phases: [
      { label: "inhale", durationSeconds: 5 },
      { label: "exhale", durationSeconds: 5 },
    ],
    defaultCycles: 12, // 12 x 10s = 120s
    cycleOptions: [6, 12, 18],
  },
];

export const breathingLookup = Object.fromEntries(breathingPatterns.map((p) => [p.slug, p]));
export const breathingSlugs = breathingPatterns.map((p) => p.slug);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/breathing/cycle-math.test.ts`
Expected: PASS (all, including the two new describe blocks).

- [ ] **Step 5: Verify no other consumer broke**

Run: `npx tsc --noEmit`
Expected: a type error ONLY in `app/(app)/tools/breathing/[slug].tsx` at the `pattern.durations` references (lines ~105 and ~231). That file is rewritten in Task 3. No other file should error (the index screen and `queries.ts` use `breathingPatterns`/`breathingSlugs`, not `durations`). Do NOT commit.

---

## Task 3: Add the cycle-runner i18n keys

**Files:**

- Modify: `src/i18n/locales/en/cbt.json` (the `breathing` object, around lines 1438–1491)

- [ ] **Step 1: Add the keys**

In `src/i18n/locales/en/cbt.json`, inside the `"breathing"` object, add these keys next to the existing `"minutes"` key (keep `"minutes"`, `"chooseDuration"`, and all others as-is):

```json
    "chooseCycles": "Choose cycles",
    "cycles_one": "{{count}} cycle",
    "cycles_other": "{{count}} cycles",
    "totalTimeLabel": "Total time",
    "cycleProgress": "Cycle {{current}} of {{total}}",
```

(Other locale files fall back to English via i18next `fallbackLng`; translating them is a separate content task and out of scope for this plan.)

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "require('./src/i18n/locales/en/cbt.json'); console.log('ok')"`
Expected: prints `ok`. Do NOT commit.

---

## Task 4: Refactor the runner to cycle-based selection and run

**Files:**

- Modify: `app/(app)/tools/breathing/[slug].tsx`

This task replaces the minute-selection UI and the duration-derived timing with the cycle model. Apply the edits below.

- [ ] **Step 1: Update imports**

At the top of `app/(app)/tools/breathing/[slug].tsx`, add the cycle-math import next to the existing constants import:

```ts
import { breathingLookup } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import { totalSeconds, formatClock, elapsedMinutes } from "@/src/features/breathing/cycle-math";
```

- [ ] **Step 2: Replace the duration state with cycle state**

Find:

```ts
const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
const [secondsLeft, setSecondsLeft] = useState(0);
const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
```

Replace with:

```ts
const [screenPhase, setScreenPhase] = useState<ScreenPhase>("intro");
const [selectedCycles, setSelectedCycles] = useState<number>(0);
const [currentCycle, setCurrentCycle] = useState(0);
const [secondsLeft, setSecondsLeft] = useState(0);
const [currentPhase, setCurrentPhase] = useState<BreathingPhase | null>(null);
const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
```

- [ ] **Step 3: Initialize selectedCycles from the pattern default**

Find:

```ts
useEffect(() => {
  if (pattern && selectedDuration === null) {
    const durations = pattern.durations;
    setSelectedDuration(durations[Math.floor(durations.length / 2)] ?? durations[0] ?? null);
  }
}, [pattern, selectedDuration]);
```

Replace with:

```ts
useEffect(() => {
  if (pattern && selectedCycles === 0) {
    setSelectedCycles(pattern.defaultCycles);
  }
}, [pattern, selectedCycles]);
```

- [ ] **Step 4: Set the current cycle as phases advance**

Find:

```ts
  const advancePhase = (phases: BreathingPhase[], idx: number) => {
    const phase = phases[idx % phases.length];
    setCurrentPhase(phase);
```

Replace with (adds the cycle counter — `idx` 0..n-1 is cycle 1, n..2n-1 is cycle 2, etc.):

```ts
  const advancePhase = (phases: BreathingPhase[], idx: number) => {
    const phase = phases[idx % phases.length];
    setCurrentPhase(phase);
    setCurrentCycle(Math.floor(idx / phases.length) + 1);
```

- [ ] **Step 5: Compute total time from cycles in handleStart**

Find:

```ts
const handleStart = () => {
  if (!selectedDuration) return;
  const totalSeconds = selectedDuration * 60;
  totalSecondsRef.current = totalSeconds;
  phaseIndexRef.current = 0;
  setSecondsLeft(totalSeconds);
  setScreenPhase("active");
  advancePhase(pattern.phases, 0);
};
```

Replace with:

```ts
const handleStart = () => {
  if (!selectedCycles) return;
  const planned = totalSeconds(pattern.phases, selectedCycles);
  totalSecondsRef.current = planned;
  phaseIndexRef.current = 0;
  setSecondsLeft(planned);
  setScreenPhase("active");
  advancePhase(pattern.phases, 0);
};
```

- [ ] **Step 6: Compute elapsed minutes from cycles in handleFinish**

Find:

```ts
  const handleFinish = async () => {
    if (!selectedDuration) return;
```

Replace with:

```ts
  const handleFinish = async () => {
    if (!selectedCycles) return;
```

Then, in the same function, find:

```ts
const plannedSeconds = selectedDuration * 60;
const elapsedSeconds = plannedSeconds - Math.max(0, totalSecondsRef.current);
const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
```

Replace with:

```ts
const plannedSeconds = totalSeconds(pattern.phases, selectedCycles);
const elapsedMins = elapsedMinutes(plannedSeconds, totalSecondsRef.current);
```

Then update the save call — find:

```ts
await saveMutation.mutateAsync({
  exerciseName: pattern.slug,
  durationMinutes: elapsedMinutes,
  reflection: "",
  feelingAfter: null,
});
```

Replace with:

```ts
await saveMutation.mutateAsync({
  exerciseName: pattern.slug,
  durationMinutes: elapsedMins,
  reflection: "",
  feelingAfter: null,
});
```

- [ ] **Step 7: Replace the minute-selection UI with the cycles selector**

Find the intro duration block:

```tsx
              <View className="gap-3">
                <Label>{t("breathing.chooseDuration")}</Label>
                <View className="flex-row flex-wrap gap-2">
                  {pattern.durations.map((d) => (
                    <Button
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      variant={selectedDuration === d ? "default" : "outline"}
                    >
                      <Text>{t("breathing.minutes", { value: d })}</Text>
                    </Button>
                  ))}
                </View>
              </View>

              <Button disabled={!selectedDuration} onPress={handleStart}>
                <Text>{t("breathing.start")}</Text>
              </Button>
```

Replace with:

```tsx
              <View className="gap-3">
                <Label>{t("breathing.chooseCycles")}</Label>
                <View className="flex-row items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    accessibilityLabel={t("breathing.chooseCycles")}
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
                      {formatClock(totalSeconds(pattern.phases, selectedCycles))}
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    onPress={() => setSelectedCycles((c) => c + 1)}
                  >
                    <Text className="text-lg">+</Text>
                  </Button>
                </View>
                <View className="flex-row flex-wrap justify-center gap-2">
                  {pattern.cycleOptions.map((c) => (
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
```

- [ ] **Step 8: Show cycle progress on the active screen**

Find (active screen, the muted total-time line):

```tsx
<Text variant="muted" className="text-center">
  {timeDisplay}
</Text>
```

Replace with:

```tsx
              <Text variant="muted" className="text-center">
                {t("breathing.cycleProgress", { current: currentCycle, total: selectedCycles })}
              </Text>

              <Text variant="muted" className="text-center">
                {timeDisplay}
              </Text>
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the `pattern.durations` references are gone; `selectedDuration` is fully replaced). Do NOT commit.

- [ ] **Step 10: Lint**

Run: `npx eslint "app/(app)/tools/breathing/[slug].tsx" src/constants/breathing.ts src/features/breathing/cycle-math.ts`
Expected: no errors. Do NOT commit.

---

## Task 5: Component tests for the cycle runner

**Files:**

- Create: `src/features/breathing/breathing-runner.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/breathing/breathing-runner.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react-native";

import BreathingExerciseScreen from "@/app/(app)/tools/breathing/[slug]";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ slug: "box-breathing" }),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/breathing/queries", () => ({
  useSaveBreathingSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/src/lib/color-scheme", () => ({ useAppColorScheme: () => "light" }));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));

describe("Breathing cycle runner", () => {
  it("opens on the default cycle count with calculated total time", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // box-breathing default is 8 cycles x 16s = 128s = 2:08
    expect(screen.getByText("8 cycles")).toBeTruthy();
    expect(screen.getByText(/2:08/)).toBeTruthy();
  });

  it("recalculates total time when a cycle chip is tapped", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    // 12 cycles x 16s = 192s = 3:12
    fireEvent.press(screen.getByText("12 cycles"));
    expect(screen.getByText(/3:12/)).toBeTruthy();
  });

  it("shows the phase label and cycle progress after starting", () => {
    renderWithProviders(<BreathingExerciseScreen />);
    fireEvent.press(screen.getByText("Start"));
    expect(screen.getByText("Inhale")).toBeTruthy();
    expect(screen.getByText("Cycle 1 of 8")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (then passes)**

Run: `npx jest src/features/breathing/breathing-runner.test.tsx`
Expected: If Task 4 is complete, this PASSES. If you are doing strict red-first, temporarily checking out the old `[slug].tsx` would FAIL with "Unable to find text: 8 cycles". With Task 4 applied: PASS (3 passing).

Note: `react-native-reanimated` is globally mocked in `test/setup.js`, so `withTiming` runs synchronously and the active screen renders without advancing timers. No fake timers are needed because the assertions check state set synchronously by `handleStart`/`advancePhase`.

- [ ] **Step 3: Verification checkpoint (no commit)**

Run the full breathing test surface:

Run: `npx jest src/features/breathing`
Expected: PASS — `cycle-math.test.ts`, `breathing-runner.test.tsx`, `breathing-screen.test.tsx`, and `queries.test.tsx` all green.

> The existing `breathing-screen.test.tsx` (index screen) asserts the unchanged meta badges ("1–5 min", etc.) and the "3 patterns" stat. This plan does not touch the index screen, so those assertions still pass. If any fail, STOP — something outside this plan's scope changed. Do NOT commit.

---

## Final Verification

- [ ] **Run the project verify gate**

Run: `npm run verify`
Expected: lint, format, typecheck, and tests all pass. (If `coverage:ratchet` complains that coverage dropped, the new `cycle-math.ts` and runner branches should raise it — if it dropped, add cases to `cycle-math.test.ts`.)

- [ ] **Hand off** — do NOT commit or stage. Report results to the user for their review and git handling.

---

## Self-Review notes (already applied)

- **Spec coverage (Phase 1 slice):** cycles-everywhere for built-ins (§5, §8) ✓; calculated time (§8) ✓; cycle dial + quick chips (§5, §9 selector) ✓; session logging still writes computed minutes (§8) ✓. Custom exercises, audio, and list cards are explicitly Plans 2–3.
- **Type consistency:** `BreathingPhase`/`PhaseLabel` defined in `constants/breathing.ts` and consumed by `cycle-math.ts` and the runner; `totalSeconds`/`elapsedMinutes`/`formatClock` signatures match every call site. The local variable was renamed `elapsedMins` to avoid shadowing the imported `elapsedMinutes`.
- **No placeholders:** every code step shows complete code; every run step shows the exact command and expected result.

```

```

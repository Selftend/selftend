# Check-in Redesign & Uniform Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Direction-B check-in redesign (two home widgets + three tool pages) and make every home widget a single uniform tile.

**Architecture:** Pure client-side. New aggregations are pure functions over the existing `MoodLog[]`; new UI is composed from existing reusable components plus a few new shared primitives (`StatRow`, `WeekHero`, `HistoryList`). The home grid keeps `Sortable.Flex` and renders uniform `cellWidth × WIDGET_HEIGHT` tiles. No DB/schema changes.

**Tech Stack:** Expo + React Native + TypeScript, NativeWind (Tailwind classes), `react-native-svg`, `react-native-sortables`, `@tanstack/react-query`, `react-i18next`, jest + jest-expo.

> **PROJECT RULE — commits are the user's.** Per `AGENTS.md` and standing instruction, the executor MUST NOT `git add`, `git commit`, or stage anything. Every task ends with a **Checkpoint** (run tests / `npm run verify`) instead of a commit. The user reviews and commits.

> **i18n RULE.** Every user-facing string is added to **both** `src/i18n/locales/en/<ns>.json` and `src/i18n/locales/bg/<ns>.json`. English copy is authoritative; Bulgarian is provided for review.

---

## File Structure

**New files**

- `src/components/app/mood-stat-row.tsx` — `StatRow` header-meta primitive (also reusable by other module homes).
- `src/features/mood/mood-week-hero.tsx` — `WeekHero` (avg + delta + 7 bars + top emotions).
- `src/features/mood/mood-history-list.tsx` — `MoodHistoryList` (date-grouped, tappable rows).
- `src/components/app/segmented-control.tsx` — small `SegmentedControl` for the 7/14/30 trend toggle.
- `src/features/mood/body-sensations.ts` — pure `parseBodyChips` / `toggleBodyChip` helpers.
- `src/features/mood/body-sensations.test.ts` — tests for the above.

**Modified files**

- `src/features/home/today-screen.tsx` — uniform tiles (subtractive).
- `src/features/home/widget-registry.tsx` — remove `span` field + `spanForWidget`/`clampSpan`.
- `src/features/home/widget-registry.test.tsx` — drop the span-related tests.
- `src/features/mood/summaries.ts` + `summaries.test.ts` — new aggregations.
- `src/features/mood/repository.ts` + `repository.test.ts` — `countMoodLogs`.
- `src/features/mood/queries.ts` — `useMoodLogCount`.
- `src/components/app/mood-line-chart.tsx` — `be`-hue, theme-aware, area fill.
- `src/features/mood/mood-tracker-screen.tsx` — header meta, drop "Log another", Week hero, trend toggle, HistoryList.
- `src/features/mood/mood-detail-screen.tsx` — hero strip.
- `src/features/mood/mood-entry-editor-screen.tsx` — reworked "Go deeper" (2×2 grid + body chips).
- `src/features/home/widgets/mood-checkin-widget.tsx` + `mood-trend-widget.tsx` — tile polish.
- i18n: `en|bg/{mood,cbt,navigation}.json`.

---

## Task 1: Uniform widget tiles (home grid)

**Files:**

- Modify: `src/features/home/today-screen.tsx:225-273` (the `Sortable.Flex` block) and imports at `:16-22`
- Modify: `src/features/home/widget-registry.tsx` (`GridSpan`, `WidgetMeta.span`, `spanForWidget`, `clampSpan`)
- Modify: `src/features/home/widget-registry.test.tsx`

- [ ] **Step 1: Simplify the grid render in `today-screen.tsx`.** Replace the `widgetIds.map(...)` body inside `Sortable.Flex` so every tile is uniform (no `span`):

```tsx
{
  widgetIds.map((id) => {
    const meta = metaForWidget(id);
    return (
      <View key={id} style={{ width: cellWidth, height: WIDGET_HEIGHT, overflow: "hidden" }}>
        <View style={{ flex: 1, pointerEvents: editMode ? "none" : "auto" }}>
          {resolveWidget(id, userId ?? "")}
        </View>
        {editMode ? (
          <>
            <Sortable.Handle style={{ position: "absolute", left: 4, top: 4 }}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="size-7 items-center justify-center rounded-full border border-primary/35 bg-card"
              >
                <Icon name="drag-indicator" className="size-4 text-primary" />
              </View>
            </Sortable.Handle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("today.dashboard.removeWidget", {
                title: meta ? t(meta.titleKey) : id,
              })}
              onPress={() => removeMutation.mutate(id)}
              className="absolute right-1 top-1 size-7 items-center justify-center rounded-full border border-destructive/35 bg-card"
            >
              <Icon name="close" className="size-4 text-destructive" />
            </Pressable>
          </>
        ) : null}
      </View>
    );
  });
}
```

- [ ] **Step 2: Drop the now-unused span imports** in `today-screen.tsx`. Change the import block at `:16-22` to keep only what remains:

```tsx
import { isImplemented, metaForWidget, resolveWidget } from "@/src/features/home/widget-registry";
```

(`clampSpan` and `spanForWidget` are no longer referenced.)

- [ ] **Step 3: Remove the span system from `widget-registry.tsx`.** Delete the `GridSpan` interface, the `span: GridSpan` field from `WidgetMeta`, the `span: { ... }` line from **every** entry in `WIDGET_META`, and the `spanForWidget` + `clampSpan` functions. Leave `metaForWidget`, `isImplemented`, `resolveWidget` intact.

- [ ] **Step 4: Remove span tests** in `widget-registry.test.tsx`. Delete the imports of `spanForWidget, clampSpan` (`:5-6`) and the four `it(...)` blocks: `"spanForWidget returns the widget's declared span"`, `"spanForWidget defaults to 1x1 for unknown widgets"`, `"clampSpan caps colSpan ..."`, and `"every widget meta declares a span"` (`:134-157`).

- [ ] **Step 5: Checkpoint.**

Run: `npx jest src/features/home/widget-registry.test.tsx src/features/home/today-screen.test.tsx`
Expected: PASS. Then `npx tsc --noEmit` — Expected: no errors (confirms no other file referenced `span`/`clampSpan`/`spanForWidget`; if any does, update it to drop the reference).

---

## Task 2: Mood aggregations (`summaries.ts`)

**Files:**

- Modify: `src/features/mood/summaries.ts`
- Test: `src/features/mood/summaries.test.ts`

- [ ] **Step 1: Write failing tests.** Append to `summaries.test.ts`:

```ts
import {
  getDailyAverages,
  getWeekDelta,
  getTopEmotions,
  groupLogsByDate,
} from "@/src/features/mood/summaries";

function at(daysAgo: number, hour: number, score: number, emotions: string[] = []) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return { loggedAt: d.toISOString(), moodScore: score, emotions };
}

describe("getDailyAverages", () => {
  it("returns one bucket per day, oldest→newest, null on empty days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 31, 18).toISOString(), moodScore: 2 },
      { loggedAt: new Date(2026, 4, 29, 12).toISOString(), moodScore: 5 },
    ];
    const week = getDailyAverages(logs, 7, now);
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ dateKey: "2026-05-31", average: 3 });
    expect(week[4]).toEqual({ dateKey: "2026-05-29", average: 5 });
    expect(week[5]).toEqual({ dateKey: "2026-05-30", average: null });
  });
});

describe("getWeekDelta", () => {
  it("compares the last 7 days to the prior 7 days", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { loggedAt: new Date(2026, 4, 30, 12).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 28, 12).toISOString(), moodScore: 4 },
      { loggedAt: new Date(2026, 4, 22, 12).toISOString(), moodScore: 2 },
    ];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: 2, delta: 2 });
  });

  it("returns null delta when either window is empty", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [{ loggedAt: new Date(2026, 4, 30, 12).toISOString(), moodScore: 4 }];
    expect(getWeekDelta(logs, now)).toEqual({ current: 4, previous: null, delta: null });
  });
});

describe("getTopEmotions", () => {
  it("counts emotion ids and returns the most frequent first", () => {
    const logs = [
      { loggedAt: new Date().toISOString(), moodScore: 4, emotions: ["relaxed", "happy"] },
      { loggedAt: new Date().toISOString(), moodScore: 3, emotions: ["relaxed"] },
      { loggedAt: new Date().toISOString(), moodScore: 2, emotions: ["anxious"] },
    ];
    expect(getTopEmotions(logs, 2)).toEqual([
      { id: "relaxed", count: 2 },
      { id: "anxious", count: 1 },
    ]);
  });

  it("returns an empty array when there are no emotions", () => {
    expect(getTopEmotions([], 3)).toEqual([]);
  });
});

describe("groupLogsByDate", () => {
  it("buckets entries into today/yesterday/thisWeek/older with per-group averages", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { id: "a", loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
      { id: "b", loggedAt: new Date(2026, 4, 30, 9).toISOString(), moodScore: 2 },
      { id: "c", loggedAt: new Date(2026, 4, 28, 9).toISOString(), moodScore: 5 },
      { id: "d", loggedAt: new Date(2026, 4, 1, 9).toISOString(), moodScore: 3 },
    ] as Parameters<typeof groupLogsByDate>[0];
    const groups = groupLogsByDate(logs, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "thisWeek", "older"]);
    expect(groups[0]).toMatchObject({ key: "today", average: 4, entries: [logs![0]] });
    expect(groups[2]).toMatchObject({ key: "thisWeek", average: 5 });
  });

  it("omits empty groups", () => {
    const now = new Date(2026, 4, 31, 12, 0, 0, 0);
    const logs = [
      { id: "a", loggedAt: new Date(2026, 4, 31, 9).toISOString(), moodScore: 4 },
    ] as Parameters<typeof groupLogsByDate>[0];
    expect(groupLogsByDate(logs, now).map((g) => g.key)).toEqual(["today"]);
  });
});
```

- [ ] **Step 2: Run the tests — verify they fail.**

Run: `npx jest src/features/mood/summaries.test.ts`
Expected: FAIL (`getDailyAverages is not a function`, etc.).

- [ ] **Step 3: Implement the aggregations.** Append to `summaries.ts`:

```ts
import type { MoodLog } from "@/src/features/mood/types";

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface DayAverage {
  dateKey: string;
  average: number | null;
}

/** Per-day averages for the last `days` days (oldest→newest), including days with no logs (`null`). */
export function getDailyAverages(
  logs: MoodSample[] | undefined,
  days = 7,
  now: Date = new Date(),
): DayAverage[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const log of logs ?? []) {
    const logged = new Date(log.loggedAt);
    if (logged.getTime() < start.getTime()) continue;
    const key = dayKey(logged);
    const b = buckets.get(key);
    if (b) {
      b.sum += log.moodScore;
      b.count += 1;
    } else {
      buckets.set(key, { sum: log.moodScore, count: 1 });
    }
  }

  const out: DayAverage[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const b = buckets.get(dayKey(day));
    out.push({ dateKey: dayKey(day), average: b ? round1(b.sum / b.count) : null });
  }
  return out;
}

function averageInDayWindow(
  logs: MoodSample[],
  startDaysAgo: number,
  endDaysAgo: number,
  now: Date,
): number | null {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - endDaysAgo);

  const scores = logs
    .filter((l) => {
      const t = new Date(l.loggedAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    })
    .map((l) => l.moodScore);
  if (scores.length === 0) return null;
  return round1(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export interface WeekDelta {
  current: number | null;
  previous: number | null;
  delta: number | null;
}

/** This week's average (days 0–6) vs the prior week (days 7–13). */
export function getWeekDelta(logs: MoodSample[] | undefined, now: Date = new Date()): WeekDelta {
  const list = logs ?? [];
  const current = averageInDayWindow(list, 6, 0, now);
  const previous = averageInDayWindow(list, 13, 7, now);
  const delta = current !== null && previous !== null ? round1(current - previous) : null;
  return { current, previous, delta };
}

interface EmotionSample {
  emotions: string[];
}

export interface EmotionCount {
  id: string;
  count: number;
}

/** Emotion ids by frequency (desc), ties broken by id (asc). Returns at most `limit`. */
export function getTopEmotions(logs: EmotionSample[] | undefined, limit = 3): EmotionCount[] {
  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    for (const id of log.emotions ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export type HistoryGroupKey = "today" | "yesterday" | "thisWeek" | "older";

export interface HistoryGroup {
  key: HistoryGroupKey;
  average: number;
  entries: MoodLog[];
}

const GROUP_ORDER: HistoryGroupKey[] = ["today", "yesterday", "thisWeek", "older"];

function groupKeyFor(loggedAt: string, now: Date): HistoryGroupKey {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const logged = new Date(loggedAt);
  const startLogged = new Date(logged.getFullYear(), logged.getMonth(), logged.getDate()).getTime();
  const dayDiff = Math.round((startToday - startLogged) / (24 * 60 * 60 * 1000));
  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff <= 6) return "thisWeek";
  return "older";
}

/** Groups logs (assumed newest-first) into ordered date buckets with per-group averages. */
export function groupLogsByDate(
  logs: MoodLog[] | undefined,
  now: Date = new Date(),
): HistoryGroup[] {
  const byKey = new Map<HistoryGroupKey, MoodLog[]>();
  for (const log of logs ?? []) {
    const key = groupKeyFor(log.loggedAt, now);
    const arr = byKey.get(key);
    if (arr) arr.push(log);
    else byKey.set(key, [log]);
  }
  return GROUP_ORDER.flatMap((key) => {
    const entries = byKey.get(key);
    if (!entries || entries.length === 0) return [];
    const average = round1(entries.reduce((s, e) => s + e.moodScore, 0) / entries.length);
    return [{ key, average, entries }];
  });
}
```

- [ ] **Step 4: Run the tests — verify they pass.**

Run: `npx jest src/features/mood/summaries.test.ts`
Expected: PASS (existing `getMoodSummary`/`getDayMoodSummary` tests still pass too).

- [ ] **Step 5: Checkpoint.** Run: `npx tsc --noEmit` — Expected: no errors.

---

## Task 3: All-time check-in count

**Files:**

- Modify: `src/features/mood/repository.ts`
- Test: `src/features/mood/repository.test.ts`
- Modify: `src/features/mood/queries.ts`

- [ ] **Step 1: Write the failing repository test.** Append to `repository.test.ts` (inside the `describe("mood repository", ...)` block):

```ts
it("counts all mood logs for a user with a head request", async () => {
  const eqUser = jest.fn().mockResolvedValue({ count: 247, error: null });
  const select = jest.fn(() => ({ eq: eqUser }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

  await expect(countMoodLogs("user-1")).resolves.toBe(247);
  expect(from).toHaveBeenCalledWith("mood_logs");
  expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
  expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
});

it("treats a null count as zero", async () => {
  const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
  const select = jest.fn(() => ({ eq: eqUser }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
  await expect(countMoodLogs("user-1")).resolves.toBe(0);
});
```

Add `countMoodLogs` to the import on line 1:

```ts
import {
  countMoodLogs,
  getMoodLog,
  listMoodLogs,
  saveMoodLog,
} from "@/src/features/mood/repository";
```

- [ ] **Step 2: Run the test — verify it fails.**

Run: `npx jest src/features/mood/repository.test.ts`
Expected: FAIL (`countMoodLogs is not a function`).

- [ ] **Step 3: Implement `countMoodLogs`.** Append to `repository.ts`:

```ts
export async function countMoodLogs(userId: string): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from("mood_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 4: Run the test — verify it passes.**

Run: `npx jest src/features/mood/repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the query hook.** In `queries.ts`, add `countMoodLogs` to the repository import (`:3-8`) and add a `count` key + hook:

```ts
// in moodKeys:
  count: (userId: string) => ["mood", "count", userId] as const,

// new hook:
export function useMoodLogCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? moodKeys.count(userId) : ["mood", "count", "anonymous"],
    queryFn: () => countMoodLogs(userId!),
    enabled: Boolean(userId),
  });
}
```

- [ ] **Step 6: Checkpoint.** Run: `npx jest src/features/mood/repository.test.ts && npx tsc --noEmit` — Expected: PASS / no errors.

---

## Task 4: i18n keys

**Files:**

- Modify: `src/i18n/locales/en/mood.json`, `src/i18n/locales/bg/mood.json`
- Modify: `src/i18n/locales/en/cbt.json`, `src/i18n/locales/bg/cbt.json`
- Modify: `src/i18n/locales/en/navigation.json`, `src/i18n/locales/bg/navigation.json`

- [ ] **Step 1: Add `mood.json` keys.** In **en/mood.json**, add a top-level `stats`, `week`, `history` block and extend `trend`:

```json
"stats": {
  "checkinsLabel": "check-ins",
  "thisWeekLabel": "this week",
  "avgLabel": "7-day avg",
  "last": "Last · {{when}}",
  "never": "No check-ins yet"
},
"week": {
  "title": "This week",
  "average": "7-day average",
  "deltaUp": "▲ {{delta}} vs last week",
  "deltaDown": "▼ {{delta}} vs last week",
  "deltaFlat": "steady vs last week",
  "noComparison": "first week of data",
  "byDay": "Mood by day",
  "feltMost": "Felt most often",
  "noEmotions": "No emotions tagged yet",
  "empty": "Log a few check-ins to see your week."
},
"history": {
  "title": "History",
  "groupAverage": "avg {{average}}",
  "groups": {
    "today": "Today",
    "yesterday": "Yesterday",
    "thisWeek": "Earlier this week",
    "older": "Earlier"
  },
  "empty": "Your check-ins will appear here."
},
"trendControls": {
  "title": "Mood trend",
  "range7": "7d",
  "range14": "14d",
  "range30": "30d"
},
"detailWord": {
  "1": "Awful",
  "2": "Low",
  "3": "OK",
  "4": "Good",
  "5": "Great"
}
```

In **bg/mood.json**, add the same keys (translations for review):

```json
"stats": {
  "checkinsLabel": "отметки",
  "thisWeekLabel": "тази седмица",
  "avgLabel": "ср. за 7 дни",
  "last": "Последно · {{when}}",
  "never": "Все още няма отметки"
},
"week": {
  "title": "Тази седмица",
  "average": "Средно за 7 дни",
  "deltaUp": "▲ {{delta}} спрямо мин. седмица",
  "deltaDown": "▼ {{delta}} спрямо мин. седмица",
  "deltaFlat": "без промяна спрямо мин. седмица",
  "noComparison": "първа седмица с данни",
  "byDay": "Настроение по дни",
  "feltMost": "Най-често усещано",
  "noEmotions": "Все още няма отбелязани емоции",
  "empty": "Отбележете няколко пъти, за да видите седмицата си."
},
"history": {
  "title": "История",
  "groupAverage": "ср. {{average}}",
  "groups": {
    "today": "Днес",
    "yesterday": "Вчера",
    "thisWeek": "По-рано тази седмица",
    "older": "По-рано"
  },
  "empty": "Тук ще се появяват отметките ви."
},
"trendControls": {
  "title": "Тенденция на настроението",
  "range7": "7д",
  "range14": "14д",
  "range30": "30д"
},
"detailWord": {
  "1": "Ужасно",
  "2": "Ниско",
  "3": "Добре",
  "4": "Хубаво",
  "5": "Чудесно"
}
```

- [ ] **Step 2: Rework the `cbt.json` "Go deeper" labels.** In **en/cbt.json** under `mood`, add (keep the old keys; the detail screen still uses `behavioursLabel`/`sensationsLabel`):

```json
"goDeeperTitle": "Go deeper — notice",
"goDeeperOptional": "optional",
"goDeeperIntro": "A light CBT thought-record.",
"situationHelp": "What was happening?",
"thoughtsHelp": "What went through your mind?",
"responseLabel": "Response",
"responseHelp": "What did you do, or avoid?",
"bodyLabel": "In your body",
"bodyHelp": "Where did you feel it?",
"bodyChips": {
  "chestTight": "Chest tight",
  "shoulders": "Shoulders",
  "jaw": "Jaw",
  "stomach": "Stomach",
  "restless": "Restless",
  "heavy": "Heavy",
  "warm": "Warm",
  "tired": "Tired"
}
```

In **bg/cbt.json** under `mood`:

```json
"goDeeperTitle": "Навлез по-дълбоко — забележи",
"goDeeperOptional": "по избор",
"goDeeperIntro": "Лек КПТ дневник на мислите.",
"situationHelp": "Какво се случваше?",
"thoughtsHelp": "Какво мина през ума ти?",
"responseLabel": "Реакция",
"responseHelp": "Какво направи или избегна?",
"bodyLabel": "В тялото",
"bodyHelp": "Къде го усети?",
"bodyChips": {
  "chestTight": "Стегнат гръден кош",
  "shoulders": "Рамене",
  "jaw": "Челюст",
  "stomach": "Стомах",
  "restless": "Неспокойствие",
  "heavy": "Тежест",
  "warm": "Топлина",
  "tired": "Умора"
}
```

- [ ] **Step 3: Extend `navigation.json` widget keys.** In **en/navigation.json** under `home.widgets.moodCheckin`, add:

```json
"loggedSummary_one": "Logged {{count}}× today",
"loggedSummary_other": "Logged {{count}}× today",
"lastAt": "last {{time}}",
"emptyPrompt": "How are you feeling?"
```

In **bg/navigation.json** under `home.widgets.moodCheckin`:

```json
"loggedSummary_one": "{{count}} отметка днес",
"loggedSummary_other": "{{count}} отметки днес",
"lastAt": "последно в {{time}}",
"emptyPrompt": "Как се чувстваш?"
```

- [ ] **Step 4: Checkpoint.** Run: `node -e "['en','bg'].forEach(l=>['mood','cbt','navigation'].forEach(n=>require('./src/i18n/locales/'+l+'/'+n+'.json')))"`
      Expected: no output (all JSON parses). Then `npm run verify` if a key-parity test exists.

---

## Task 5: `StatRow` header primitive + main-page header

**Files:**

- Create: `src/components/app/mood-stat-row.tsx`
- Modify: `src/features/mood/mood-tracker-screen.tsx`

- [ ] **Step 1: Create the `StatRow` component.** This is a presentational primitive: a wrap of `bold value + label` pairs in the tool hue, with a uppercase sub-line.

```tsx
import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

export interface StatItem {
  value: string;
  label: string;
}

interface StatRowProps {
  items: StatItem[];
  /** Tailwind text-color class for the bold numbers, e.g. "text-be". */
  accentClassName: string;
  subline?: string;
}

export function StatRow({ items, accentClassName, subline }: StatRowProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item) => (
          <Text key={item.label} variant="muted" className="text-[13px]">
            <Text className={`text-[13px] font-bold ${accentClassName}`}>{item.value}</Text>{" "}
            {item.label}
          </Text>
        ))}
      </View>
      {subline ? (
        <Text className="text-[11px] font-bold uppercase tracking-[0.14em] text-be/80">
          {subline}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Wire it into the main-page header.** In `mood-tracker-screen.tsx`, import the new pieces and compute the stats, then pass a `meta` node to `ModuleHomeHeader`.

Add imports (`getMoodSummary` is already imported on the screen's existing summaries import line — do not duplicate it):

```tsx
import { StatRow } from "@/src/components/app/mood-stat-row";
import { useMoodLogCount } from "@/src/features/mood/queries";
import { formatLocalTimestamp } from "@/src/utils/date";
```

In the component body (after `const sevenDay = getMoodSummary(moodLogs, 7);`):

```tsx
const { data: totalCount } = useMoodLogCount(userId);
const thisWeekCount = sevenDay.count;
const lastLog = (moodLogs ?? [])[0] ?? null; // listMoodLogs returns newest-first
const lastWhen = lastLog ? formatLocalTimestamp(lastLog.loggedAt) : null;

const statItems = [
  { value: String(totalCount ?? moodLogs?.length ?? 0), label: t("stats.checkinsLabel") },
  { value: String(thisWeekCount), label: t("stats.thisWeekLabel") },
  {
    value: sevenDay.average === null ? "–" : sevenDay.average.toFixed(1),
    label: t("stats.avgLabel"),
  },
];
```

(The label-only keys `stats.checkinsLabel` / `thisWeekLabel` / `avgLabel` were added in Task 4 — the bold number comes from `value`, the plain word from `label`.)

Pass `meta` to the existing `ModuleHomeHeader` call (add the prop):

```tsx
meta={
  <StatRow
    accentClassName="text-be"
    items={statItems}
    subline={lastWhen ? t("stats.last", { when: lastWhen }) : t("stats.never")}
  />
}
```

- [ ] **Step 3: Checkpoint.** Run: `npx jest src/features/mood/mood-tracker-screen.test.tsx && npx tsc --noEmit`
      Expected: PASS / no errors. (If the existing screen test asserts on header text, update it to match.)

---

## Task 6: `WeekHero` + main-page "This week" section

**Files:**

- Create: `src/features/mood/mood-week-hero.tsx`
- Modify: `src/features/mood/mood-tracker-screen.tsx`

- [ ] **Step 1: Create `WeekHero`.** Renders the 7-day average + delta, 7 per-day bars, and the top-emotions list. All data passed in (screen owns the queries).

```tsx
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import type { DayAverage, EmotionCount, WeekDelta } from "@/src/features/mood/summaries";

interface WeekHeroProps {
  delta: WeekDelta;
  byDay: DayAverage[];
  topEmotions: EmotionCount[];
}

function deltaCopy(delta: WeekDelta, t: TFunction) {
  if (delta.delta === null) return { text: t("week.noComparison"), tone: "text-muted-foreground" };
  if (delta.delta > 0)
    return { text: t("week.deltaUp", { delta: delta.delta.toFixed(1) }), tone: "text-act" };
  if (delta.delta < 0)
    return {
      text: t("week.deltaDown", { delta: Math.abs(delta.delta).toFixed(1) }),
      tone: "text-destructive",
    };
  return { text: t("week.deltaFlat"), tone: "text-muted-foreground" };
}

export function WeekHero({ delta, byDay, topEmotions }: WeekHeroProps) {
  const { t } = useTranslation("mood");
  const { resolveEmotion } = useEmotionDisplay();
  const d = deltaCopy(delta, t);
  const todayKey = byDay[byDay.length - 1]?.dateKey;

  return (
    <Card>
      <CardContent className="gap-5 pt-5 pb-5">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("week.average")}
            </Text>
            <Text className="text-[40px] font-extrabold leading-[1.1] tracking-tight">
              {delta.current === null ? "–" : delta.current.toFixed(1)}
            </Text>
            <Text className={cn("text-[13px] font-semibold", d.tone)}>{d.text}</Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("week.byDay")}
          </Text>
          <View className="h-24 flex-row items-end gap-2">
            {byDay.map((day) => {
              const heightPct = day.average === null ? 0 : (day.average / 5) * 100;
              const isToday = day.dateKey === todayKey;
              const letter = new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(
                new Date(`${day.dateKey}T12:00:00`),
              );
              return (
                <View key={day.dateKey} className="flex-1 items-center gap-1.5">
                  <View className="h-[70px] w-full justify-end">
                    <View
                      className={cn("w-full rounded-md", isToday ? "bg-be" : "bg-be/30")}
                      style={{ height: `${Math.max(heightPct, day.average === null ? 0 : 6)}%` }}
                    />
                  </View>
                  <Text variant="muted" className="text-[11px] font-semibold">
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("week.feltMost")}
          </Text>
          {topEmotions.length === 0 ? (
            <Text variant="muted" className="text-[13px]">
              {t("week.noEmotions")}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {topEmotions.map((e) => {
                const display = resolveEmotion(e.id);
                return (
                  <View key={e.id} className="rounded-full bg-be/10 px-3 py-1.5">
                    <Text className="text-[13px] text-be">
                      {display.emoji} {display.name} · {e.count}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Replace the Summary section in the screen.** In `mood-tracker-screen.tsx`, add imports:

```tsx
import { WeekHero } from "@/src/features/mood/mood-week-hero";
import { getDailyAverages, getTopEmotions, getWeekDelta } from "@/src/features/mood/summaries";
```

Compute (near the other summaries):

```tsx
const weekDelta = getWeekDelta(moodLogs);
const weekByDay = getDailyAverages(moodLogs, 7);
const topEmotions = getTopEmotions(moodLogs, 3);
```

Replace the entire `<View className="gap-3">…Summary…</View>` block (the one rendering two `SummaryTile`s, screen `:86-92`) with:

```tsx
<View className="gap-3">
  <Text variant="h3">{t("week.title")}</Text>
  <WeekHero delta={weekDelta} byDay={weekByDay} topEmotions={topEmotions} />
</View>
```

Delete the now-unused `SummaryTile` component (`:183-209`) and the now-unused `const thirtyDay = getMoodSummary(moodLogs, 30);` line (`:51`). Keep the `getMoodSummary` import and the `const sevenDay = getMoodSummary(moodLogs, 7);` line — still used for the header `sevenDay`/`thisWeekCount`.

- [ ] **Step 3: Checkpoint.** Run: `npx jest src/features/mood && npx tsc --noEmit` — Expected: PASS / no errors.

---

## Task 7: Trend range toggle + themed `MoodLineChart`

**Files:**

- Create: `src/components/app/segmented-control.tsx`
- Modify: `src/components/app/mood-line-chart.tsx`
- Modify: `src/features/mood/mood-tracker-screen.tsx`

- [ ] **Step 1: Create a small `SegmentedControl`.**

```tsx
import { Pressable, View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-full bg-muted p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={cn("rounded-full px-3 py-1", active ? "bg-card" : "")}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Theme `MoodLineChart` and add an area fill.** Replace the body of `mood-line-chart.tsx` to accept theme-aware colors and draw a soft fill polygon. Add `Polygon` to the svg import and `useAppColorScheme`:

```tsx
import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { useAppColorScheme } from "@/src/lib/color-scheme";

interface MoodPoint {
  day: string;
  score: number;
}

interface MoodLineChartProps {
  data: MoodPoint[];
  height?: number;
  width?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 24 };
const MIN_SCORE = 1;
const MAX_SCORE = 5;

export function MoodLineChart({ data, height = 160, width = 300 }: MoodLineChartProps) {
  const isDark = useAppColorScheme() === "dark";
  const lineColor = isDark ? "hsl(330, 62%, 72%)" : "hsl(330, 56%, 60%)";
  const fillColor = isDark ? "hsla(330, 62%, 72%, 0.14)" : "hsla(330, 56%, 60%, 0.12)";
  const gridColor = isDark ? "hsl(260, 12%, 24%)" : "hsl(260, 14%, 87%)";
  const labelColor = isDark ? "hsl(260, 12%, 72%)" : "hsl(260, 8%, 42%)";

  if (data.length === 0) return null;

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const yScale = (score: number) =>
    chartHeight - ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * chartHeight;

  const points = data.map((d, i) => ({
    x: PADDING.left + i * xStep,
    y: PADDING.top + yScale(d.score),
    day: d.day,
  }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const baselineY = PADDING.top + yScale(MIN_SCORE);
  const areaPoints =
    `${points[0].x},${baselineY} ` +
    polylinePoints +
    ` ${points[points.length - 1].x},${baselineY}`;
  const gridLines = [1, 2, 3, 4, 5];

  return (
    <View>
      <Svg height={height} width={width}>
        {gridLines.map((val) => {
          const y = PADDING.top + yScale(val);
          return (
            <Line
              key={val}
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}
        {gridLines.map((val) => {
          const y = PADDING.top + yScale(val);
          return (
            <SvgText
              key={`label-${val}`}
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill={labelColor}
              textAnchor="end"
            >
              {val}
            </SvgText>
          );
        })}
        {points.length > 1 ? <Polygon points={areaPoints} fill={fillColor} /> : null}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
        ))}
        {points.map((p, i) => (
          <SvgText
            key={`day-${i}`}
            x={p.x}
            y={height - 4}
            fontSize={9}
            fill={labelColor}
            textAnchor="middle"
          >
            {p.day}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 3: Add the range toggle to the screen.** In `mood-tracker-screen.tsx`, add imports + state, drive `buildMoodChartData` by the selected range, and render the toggle in the trend section header.

```tsx
import { SegmentedControl } from "@/src/components/app/segmented-control";
// ...
const [trendDays, setTrendDays] = useState<7 | 14 | 30>(14);
const chartData = buildMoodChartData(moodLogs, trendDays);
```

(Remove the old `const CHART_DAYS = 14;` constant and its use.) Replace the trend section header (`:94-110` region) so it shows the title + toggle:

```tsx
<View className="gap-3">
  <View className="flex-row items-center justify-between">
    <Text variant="h3">{t("trendControls.title")}</Text>
    <SegmentedControl
      value={trendDays}
      onChange={setTrendDays}
      options={[
        { value: 7, label: t("trendControls.range7") },
        { value: 14, label: t("trendControls.range14") },
        { value: 30, label: t("trendControls.range30") },
      ]}
    />
  </View>
  <Card>
    <CardContent className="pt-4">
      <View onLayout={handleChartLayout}>
        {chartData.length > 0 ? (
          <MoodLineChart data={chartData} width={chartContainerWidth} />
        ) : (
          <Text variant="muted">{t("trend.empty")}</Text>
        )}
      </View>
    </CardContent>
  </Card>
</View>
```

- [ ] **Step 4: Checkpoint.** Run: `npx jest src/features/mood src/components/app && npx tsc --noEmit` — Expected: PASS / no errors.

---

## Task 8: `HistoryList` + replace "Recent" / remove "Log another"

**Files:**

- Create: `src/features/mood/mood-history-list.tsx`
- Modify: `src/features/mood/mood-tracker-screen.tsx`

- [ ] **Step 1: Create `HistoryList`.** Groups all loaded logs by date and renders the existing `MoodEntryCard` per entry under per-group headers with an average chip.

```tsx
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { MoodEntryCard } from "@/src/features/mood/mood-entry-card";
import { groupLogsByDate } from "@/src/features/mood/summaries";
import type { MoodLog } from "@/src/features/mood/types";

export function MoodHistoryList({ logs }: { logs: MoodLog[] }) {
  const { t } = useTranslation("mood");
  const groups = groupLogsByDate(logs);

  if (groups.length === 0) {
    return <Text variant="muted">{t("history.empty")}</Text>;
  }

  return (
    <View className="gap-5">
      {groups.map((group) => (
        <View key={group.key} className="gap-3">
          <View className="flex-row items-center gap-3">
            <Text className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t(`history.groups.${group.key}`)}
            </Text>
            <View className="h-px flex-1 bg-border" />
            <Text variant="muted" className="text-[12px]">
              {t("history.groupAverage", { average: group.average.toFixed(1) })}
            </Text>
          </View>
          <View className="gap-3">
            {group.entries.map((entry) => (
              <MoodEntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Use it in the screen + show full history (not just selected day).** In `mood-tracker-screen.tsx`, import `MoodHistoryList`. Replace the `recent` slice (`:53-55`) with the full list and replace the "Recent" section (`:112-123`) with the History section:

```tsx
// data:
const history = moodLogs ?? [];

// section (replaces the old "Recent" section):
<View className="gap-3">
  <Text variant="h3">{t("history.title")}</Text>
  <MoodHistoryList logs={history} />
</View>;
```

Remove the now-unused `RECENT_LIMIT`, `recent`, and `MoodEntryCard` import from the screen (the card is now imported inside `MoodHistoryList`).

- [ ] **Step 3: Remove "Log another" from the Today card.** In the `TodayCheckInCard` component (`:167-177`), delete the entire `{logged ? (<Button …logAnother…/>) : null}` block. The mood-scale row already starts a new check-in.

- [ ] **Step 4: Checkpoint.** Run: `npx jest src/features/mood && npx tsc --noEmit` — Expected: PASS / no errors. Update `mood-tracker-screen.test.tsx` if it asserted on "Recent entries" or "Log another".

---

## Task 9: `mood-checkin` widget tile polish

**Files:**

- Modify: `src/features/home/widgets/mood-checkin-widget.tsx`

- [ ] **Step 1: Add the summary sub-line.** Replace the widget body so it shows the scale plus a "Logged N× today · last HH:MM" line (or the empty prompt). Keep the compact `MoodScale` behavior.

```tsx
import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { MoodScale } from "@/src/components/app/mood-scale";
import { useMoodLogs } from "@/src/features/mood/queries";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export function MoodCheckinWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { selectedDate: todayKey } = useSelectedDate();
  const { data: moodLogs } = useMoodLogs(userId, 30);

  const todayLogs = (moodLogs ?? []).filter((l) => toLocalDateKey(l.loggedAt) === todayKey);
  const moodToday = todayLogs.length > 0 ? todayLogs[0].moodScore : null;
  const lastTime =
    todayLogs.length > 0
      ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
          new Date(todayLogs[0].loggedAt),
        )
      : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-be/10">
            <Icon name="mood" className="size-5 text-be" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.moodCheckin.title")}</Text>
        </View>
        <MoodScale
          compact
          value={moodToday}
          onChange={(score) => router.push(`/tools/mood-tracker/new?score=${score}`)}
        />
        <Text variant="muted" className="text-[11px]">
          {todayLogs.length === 0
            ? t("home.widgets.moodCheckin.emptyPrompt")
            : `${t("home.widgets.moodCheckin.loggedSummary", { count: todayLogs.length })}${
                lastTime ? ` · ${t("home.widgets.moodCheckin.lastAt", { time: lastTime })}` : ""
              }`}
        </Text>
      </CardContent>
    </Card>
  );
}
```

> Note: `useMoodLogs` returns newest-first, so `todayLogs[0]` is the most recent (the prior code used `todayLogs[todayLogs.length - 1]`, which was the oldest — this corrects "last").

- [ ] **Step 2: Checkpoint.** Run: `npx jest src/features/home && npx tsc --noEmit` — Expected: PASS / no errors. Verify the tile fits within `WIDGET_HEIGHT = 200` (manual: run the app, no clipping). If it clips, raise the shared `WIDGET_HEIGHT` in `today-screen.tsx` to the smallest value that fits and re-verify the other widgets.

---

## Task 10: `mood-trend` widget tile polish

**Files:**

- Modify: `src/features/home/widgets/mood-trend-widget.tsx`

- [ ] **Step 1: Polish spacing/labels to match the new tile.** Keep the two-stat body + Open link; tidy the stat tiles to the design's compact look (smaller labels, `be` accent on the header icon — already present). Minimal change — adjust the two stat tiles to use rounded `bg-muted/40` and consistent type:

```tsx
<View className="flex-row gap-3">
  <View className="flex-1 gap-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
    <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {t("today.moodSnapshot.sevenDay")}
    </Text>
    <Text className={cn("text-2xl font-bold", sevenDay === null && "text-muted-foreground")}>
      {sevenDay === null ? "–" : sevenDay.toFixed(1)}
    </Text>
  </View>
  <View className="flex-1 gap-0.5 rounded-xl bg-muted/40 px-3 py-2.5">
    <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {t("today.moodSnapshot.entries")}
    </Text>
    <Text className="text-2xl font-bold">{String(logs.length)}</Text>
  </View>
</View>
```

- [ ] **Step 2: Checkpoint.** Run: `npx jest src/features/home && npx tsc --noEmit` — Expected: PASS / no errors. Verify the tile fits `WIDGET_HEIGHT`.

---

## Task 11: Editor "Go deeper" rework (2×2 grid + body chips)

**Files:**

- Create: `src/features/mood/body-sensations.ts`
- Test: `src/features/mood/body-sensations.test.ts`
- Modify: `src/features/mood/mood-entry-editor-screen.tsx`

- [ ] **Step 1: Write failing tests for the chip helpers.**

```ts
import { parseBodyChips, toggleBodyChip } from "@/src/features/mood/body-sensations";

describe("body-sensations helpers", () => {
  it("parses a comma-separated string into trimmed, non-empty labels", () => {
    expect(parseBodyChips("Shoulders, Jaw ,, Chest tight")).toEqual([
      "Shoulders",
      "Jaw",
      "Chest tight",
    ]);
    expect(parseBodyChips("")).toEqual([]);
  });

  it("adds a label when absent and removes it when present", () => {
    expect(toggleBodyChip("", "Jaw")).toBe("Jaw");
    expect(toggleBodyChip("Jaw", "Shoulders")).toBe("Jaw, Shoulders");
    expect(toggleBodyChip("Jaw, Shoulders", "Jaw")).toBe("Shoulders");
  });
});
```

- [ ] **Step 2: Run — verify it fails.** Run: `npx jest src/features/mood/body-sensations.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement the helpers.**

```ts
export function parseBodyChips(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function toggleBodyChip(value: string, label: string): string {
  const list = parseBodyChips(value);
  const next = list.includes(label) ? list.filter((l) => l !== label) : [...list, label];
  return next.join(", ");
}
```

- [ ] **Step 4: Run — verify it passes.** Run: `npx jest src/features/mood/body-sensations.test.ts` — Expected: PASS.

- [ ] **Step 5: Rework the "Go deeper" block in the editor.** In `mood-entry-editor-screen.tsx`, add imports:

```tsx
import { parseBodyChips, toggleBodyChip } from "@/src/features/mood/body-sensations";
```

Define the chip keys near the top of the module (outside the component):

```tsx
const BODY_CHIP_KEYS = [
  "chestTight",
  "shoulders",
  "jaw",
  "stomach",
  "restless",
  "heavy",
  "warm",
  "tired",
] as const;
```

Replace the `{showDeeper ? (<View className="gap-4">…four textareas…</View>) : null}` block (`:315-354`) with the new tinted card: a 2×2 grid (Situation / Thoughts / Response / body chips). Keep `situation`, `thoughts`, `behaviours` state; the "Response" textarea is bound to `behaviours`; "In your body" toggles chips into `bodilySensations`.

```tsx
{
  showDeeper ? (
    <View className="gap-4 rounded-2xl border border-be/20 bg-be/[0.06] p-4">
      <Text variant="muted" className="text-[13px]">
        {t("goDeeperIntro")}
      </Text>
      <View className="gap-4">
        <View className="gap-1.5">
          <Text className="text-[13px] font-bold">{t("situationLabel")}</Text>
          <Text variant="muted" className="text-[12px]">
            {t("situationHelp")}
          </Text>
          <Textarea
            accessibilityLabel={t("situationLabel")}
            onChangeText={setSituation}
            placeholder={t("situationPlaceholder")}
            value={situation}
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-[13px] font-bold">{t("thoughtsLabel")}</Text>
          <Text variant="muted" className="text-[12px]">
            {t("thoughtsHelp")}
          </Text>
          <Textarea
            accessibilityLabel={t("thoughtsLabel")}
            onChangeText={setThoughts}
            placeholder={t("thoughtsPlaceholder")}
            value={thoughts}
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-[13px] font-bold">{t("responseLabel")}</Text>
          <Text variant="muted" className="text-[12px]">
            {t("responseHelp")}
          </Text>
          <Textarea
            accessibilityLabel={t("responseLabel")}
            onChangeText={setBehaviours}
            placeholder={t("behavioursPlaceholder")}
            value={behaviours}
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-[13px] font-bold">{t("bodyLabel")}</Text>
          <Text variant="muted" className="text-[12px]">
            {t("bodyHelp")}
          </Text>
          <View className="flex-row flex-wrap gap-2 pt-1">
            {BODY_CHIP_KEYS.map((key) => {
              const label = t(`bodyChips.${key}`);
              const selected = parseBodyChips(bodilySensations).includes(label);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={label}
                  onPress={() => setBodilySensations((prev) => toggleBodyChip(prev, label))}
                  className={cn(
                    "rounded-full border px-3 py-1.5",
                    selected ? "border-be bg-be/10" : "border-border bg-card",
                  )}
                >
                  <Text
                    className={cn(
                      "text-[13px]",
                      selected ? "text-be font-medium" : "text-foreground",
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  ) : null;
}
```

Update the accordion toggle label (`:313`) to `t("goDeeperTitle")` and the optional hint. The `showDeeper` initialiser already includes `bodilySensations` (`:103-110`) — keep it.

- [ ] **Step 6: Checkpoint.** Run: `npx jest src/features/mood && npx tsc --noEmit` — Expected: PASS / no errors. Manual: crisis callout (set score 1) and breathing nudge (score 2) still render.

---

## Task 12: Entry detail hero strip

**Files:**

- Modify: `src/features/mood/mood-detail-screen.tsx`

- [ ] **Step 1: Replace the header + score card with a hero strip.** In `mood-detail-screen.tsx`, add imports:

```tsx
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { cn } from "@/lib/utils";
```

Add a tone helper (above the component) mirroring `mood-entry-card.tsx`:

```tsx
function scoreToneClass(score: number): string {
  switch (score) {
    case 1:
      return "bg-red-500/15";
    case 2:
      return "bg-orange-500/15";
    case 3:
      return "bg-yellow-400/20";
    case 4:
      return "bg-lime-500/15";
    case 5:
      return "bg-green-500/15";
    default:
      return "bg-muted";
  }
}
```

Replace the header `<View className="gap-2">…ScreenHeader + when + Edit/Delete…</View>` and the standalone Score `<Card>` (`:95-123`) with a single hero strip:

```tsx
<View className="gap-2">
  <ScreenBreadcrumb />
  <Card>
    <CardContent className="flex-row items-center gap-4 pt-5 pb-5">
      <View
        className={cn(
          "size-16 items-center justify-center rounded-full",
          scoreToneClass(entry.moodScore),
        )}
      >
        <Text className="text-4xl">{MOOD_EMOJI_BY_SCORE[entry.moodScore] ?? ""}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-2xl font-extrabold tracking-tight">
          {t(`detailWord.${entry.moodScore}`)} · {entry.moodScore}
        </Text>
        <Text variant="muted" className="text-sm">
          {when}
        </Text>
      </View>
      <View className="gap-2">
        <Button
          onPress={() => router.push(`/tools/mood-tracker/${entry.id}/edit`)}
          variant="secondary"
          size="sm"
        >
          <Icon name="edit" className="size-4" />
          <Text>{t("detail.edit")}</Text>
        </Button>
        <Button onPress={() => setConfirmOpen(true)} variant="ghost" size="sm">
          <Icon name="delete-outline" className="size-4 text-destructive" />
          <Text>{t("detail.delete")}</Text>
        </Button>
      </View>
    </CardContent>
  </Card>
</View>
```

Keep the Logged-at / Emotions / Notes / Go-deeper / linked-strategy cards below unchanged.

- [ ] **Step 2: Checkpoint.** Run: `npx jest src/features/mood/mood-detail-screen.test.tsx && npx tsc --noEmit` — Expected: PASS / no errors. Update the detail test if it asserted on the old `t("detail.title")` header (now replaced by the hero strip + breadcrumb).

---

## Final verification

- [ ] **Run the full gate.** Run: `npm run verify`
      Expected: lint + format + typecheck + unit tests all PASS.

- [ ] **Run the mood e2e (web).** Run: `npx playwright test test/e2e` (the mood create/edit/delete journeys). If selectors changed (e.g., removed "Log another", renamed sections), update the e2e specs to match the new copy/structure.

- [ ] **Manual smoke (run the app):**
  - Home: all widgets are one uniform tile; drag-reorder still works; `mood-checkin` shows the sub-line and doesn't clip.
  - Check-in page: header stat row, no "Log another", Week hero (bars/delta/top emotions), 7/14/30 toggle redraws the chart with the `be` area fill, History grouped by date with per-group averages.
  - New/Edit: labelled mood scale; "Go deeper" 2×2 + body chips toggle and persist; crisis callout (score 1) + breathing nudge (score 2) present.
  - Detail: hero strip with Edit/Delete; go-deeper field cards still shown when filled.

---

## Notes for the executor

- **Defaulted decisions (from the spec §10):** keep the app-wide `act`-green mood-scale selection (do **not** adopt graded per-score colors); no separate "View all" history screen — the main page shows all loaded logs grouped.
- **No DB/schema changes** anywhere. `bodilySensations` remains a free-text column; chips serialize into it as a comma-joined string.
- **Commits are the user's.** Do not stage or commit.

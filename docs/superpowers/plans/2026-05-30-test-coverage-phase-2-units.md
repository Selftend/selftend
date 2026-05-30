# Test Coverage — Phase 2: Unit Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the high-value unit-test gaps — extract and unit-test the edge-function pure logic, cover the logic-bearing helpers/stores/hooks, and the 8 query hooks with real logic — raising the coverage ratchet floor.

**Architecture:** Pure TDD against existing source using the repo's established patterns (Zustand `.getState()` store tests, `renderHook`/`act` hook tests, mocked repositories for query hooks, mocked `TFunction` for i18n logic). The only structural change is extracting runtime-agnostic logic from the two Deno edge functions into `supabase/functions/_shared/*.ts` so jest (Node) can unit-test it; the Deno `index.ts` files import the shared modules.

**Tech Stack:** Jest (`jest-expo`), `@testing-library/react-native` (`renderHook`, `act`), the Phase 1 coverage ratchet.

**Source spec:** `docs/superpowers/specs/2026-05-30-test-coverage-and-strategy-design.md` (§6, §8, Appendix C).

---

## Git policy (read first)

This repo's owner performs **all** staging and commits (`AGENTS.md` → Git safety rule). The "Commit" steps below mark checkpoints — **the executor must not stage or commit autonomously**, and never adds a `Co-Authored-By` trailer. Prepare each change and let the user commit.

## How test bodies are authored

For the pure test-authoring tasks (Batches B–E), the plan gives, per unit: the exact file, a **verified enumerated behavior list** (from the spec's Appendix C plus the source), and the **canonical worked example** in this plan its tests must mirror. The implementer reads the live source and writes the assertions following that canonical example under TDD (write failing test → run → see it pass once the behavior is covered). This is the right granularity for test code written against existing, well-patterned source — the canonical examples + per-unit behavior lists are the "complete content", not placeholders.

## Conventions reference (canonical worked examples)

These four are full, runnable examples. Each sibling unit names which one it follows.

### Canonical A — pure logic with a mocked `TFunction` (`src/features/mood/relative-time.test.ts`)

The source `formatMoodRelativeTime(loggedAt, t, now)` returns `t("relativeTime.today")` when the logged local-day is the same or future, `t("relativeTime.yesterday")` for one day prior, else `t("relativeTime.daysAgo", { count })`.

```ts
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";

// A minimal TFunction stand-in that echoes the key (+ count) so assertions read clearly.
const t = ((key: string, opts?: { count?: number }) =>
  opts?.count === undefined ? key : `${key}:${opts.count}`) as unknown as Parameters<
  typeof formatMoodRelativeTime
>[1];

describe("formatMoodRelativeTime", () => {
  const now = new Date("2026-05-24T12:00:00.000Z");

  it("returns today for a log earlier the same local day", () => {
    expect(formatMoodRelativeTime("2026-05-24T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("treats a future log as today (non-negative day diff)", () => {
    expect(formatMoodRelativeTime("2026-05-25T01:00:00.000Z", t, now)).toBe("relativeTime.today");
  });

  it("returns yesterday for exactly one local day earlier", () => {
    expect(formatMoodRelativeTime("2026-05-23T23:00:00.000Z", t, now)).toBe(
      "relativeTime.yesterday",
    );
  });

  it("returns daysAgo with the day count for older logs", () => {
    expect(formatMoodRelativeTime("2026-05-20T08:00:00.000Z", t, now)).toBe(
      "relativeTime.daysAgo:4",
    );
  });
});
```

### Canonical B — Zustand store via `.getState()` (`src/stores/create-draft-store.test.ts`)

Follows the existing `src/stores/cbt-draft-store.test.ts` pattern. `createDraftStore()` returns a hook whose `.getState()` exposes `entityId`, `values`, `hydrate`, `reset`, `setValues`. `hydrate(entityId)` keeps `values` only when the new `entityId` equals the current one, else clears them.

```ts
import { createDraftStore } from "@/src/stores/create-draft-store";

interface Values {
  title: string;
}

describe("createDraftStore", () => {
  const useStore = createDraftStore<Values>();

  beforeEach(() => {
    useStore.getState().reset();
  });

  it("hydrate sets the entityId and clears values for a different draft", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "draft-a" });
    useStore.getState().hydrate("b");

    expect(useStore.getState()).toMatchObject({ entityId: "b", values: null });
  });

  it("hydrate keeps values when re-hydrating the same entityId", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "draft-a" });
    useStore.getState().hydrate("a");

    expect(useStore.getState().values).toEqual({ title: "draft-a" });
  });

  it("hydrate with no argument targets the null (create) draft", () => {
    useStore.getState().hydrate();
    expect(useStore.getState().entityId).toBeNull();
  });

  it("reset clears entityId and values", () => {
    useStore.getState().hydrate("a");
    useStore.getState().setValues({ title: "x" });
    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({ entityId: null, values: null });
  });
});
```

### Canonical C — React hook with timers via `renderHook`/`act` (`src/features/auth/use-auth-throttle.test.ts`)

`useAuthThrottle()` returns `{ isThrottled, recordFailure, recordSuccess }`. It throttles immediately on a rate/429 error, and after `MAX_ATTEMPTS` (5) non-rate failures; a 30s cooldown then resets; `recordSuccess` clears the throttle and timer. Use Jest fake timers.

```ts
import { act, renderHook } from "@testing-library/react-native";

import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";

describe("useAuthThrottle", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("throttles immediately on a rate-limit error", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("Email rate limit exceeded")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("throttles immediately on a 429 error", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("Request failed 429")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("throttles only after MAX_ATTEMPTS non-rate failures", () => {
    const { result } = renderHook(() => useAuthThrottle());
    for (let i = 0; i < 4; i++) act(() => result.current.recordFailure(new Error("bad password")));
    expect(result.current.isThrottled).toBe(false);
    act(() => result.current.recordFailure(new Error("bad password")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("clears the throttle after the cooldown elapses", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("429")));
    act(() => jest.advanceTimersByTime(30_000));
    expect(result.current.isThrottled).toBe(false);
  });

  it("recordSuccess clears throttle state", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("429")));
    act(() => result.current.recordSuccess());
    expect(result.current.isThrottled).toBe(false);
  });
});
```

### Canonical D — query hook with a mocked repository (`src/features/breathing/queries.test.tsx`)

`useBreathingSessions` fetches mindfulness sessions then filters to `breathingSlugs`. Mock the repository module and render with a `QueryClientProvider` (reuse `createTestQueryClient` from `test/render-with-providers.tsx`). **File extension must be `.test.tsx`** because the wrapper uses JSX.

```ts
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { useBreathingSessions } from "@/src/features/breathing/queries";
import { listMindfulnessSessions } from "@/src/features/mindfulness/repository";
import { breathingSlugs } from "@/src/constants/breathing";
import { createTestQueryClient } from "@/test/render-with-providers";

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessions: jest.fn(),
  saveMindfulnessSession: jest.fn(),
}));

const mockList = listMindfulnessSessions as jest.MockedFunction<typeof listMindfulnessSessions>;

function wrapper({ children }: PropsWithChildren) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useBreathingSessions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns only sessions whose exerciseName is in the breathing allowlist", async () => {
    const breathingName = breathingSlugs[0];
    mockList.mockResolvedValue([
      { id: "1", exerciseName: breathingName } as never,
      { id: "2", exerciseName: "not-a-breathing-slug" } as never,
    ]);

    const { result } = renderHook(() => useBreathingSessions("user-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "1", exerciseName: breathingName }]);
  });

  it("does not fetch when userId is null (query disabled)", () => {
    renderHook(() => useBreathingSessions(null), { wrapper });
    expect(mockList).not.toHaveBeenCalled();
  });
});
```

---

## Batch A — Edge-function logic extraction + unit tests

The two Deno functions hold their real complexity in pure functions. Move the runtime-agnostic, **i18n-JSON-free** logic into `supabase/functions/_shared/` so jest can test it; keep the Deno wrapper (`Deno.serve`, `createClient`, `webpush`, the i18n JSON imports) in `index.ts`. The Phase-3 `supabase functions serve` smoke test (separate plan) guards the wiring end-to-end; in Phase 2 the unit tests + review are the safety net (the Deno functions cannot be executed locally without the Phase-3 harness).

### Task A1: Extract `supabase/functions/_shared/web-reminders.ts`

**Files:**

- Create: `supabase/functions/_shared/web-reminders.ts`
- Test: `supabase/functions/_shared/web-reminders.test.ts`
- Modify: `supabase/functions/send-web-reminders/index.ts`

- [ ] **Step 1: Create the shared module** (move logic verbatim from `index.ts`; add `resolveReminderLanguage` + `classifyPushError`). Create `supabase/functions/_shared/web-reminders.ts`:

```ts
// Runtime-agnostic scheduling logic for the send-web-reminders edge function.
// Imported by both the Deno function (index.ts) and jest unit tests. Contains NO
// Deno globals and NO i18n JSON imports so Node/jest can load it directly.

export type ReminderTarget = "cbt" | "meditation" | "act";

export interface WebPushSubscriptionRow {
  auth: string;
  endpoint: string;
  failure_count: number;
  id: string;
  last_cbt_reminder_key: string | null;
  last_meditation_reminder_key: string | null;
  last_act_reminder_key: string | null;
  p256dh: string;
  time_zone: string | null;
  user_id: string;
}

export interface UserPreferenceRow {
  user_id: string;
  notifications_enabled_global: boolean | null;
  reminder_consent: boolean;
  language: string | null;
  cbt_reminders_enabled: boolean;
  cbt_reminder_hour: number;
  cbt_reminder_minute: number;
  cbt_reminder_timezone: string | null;
  meditation_reminders_enabled: boolean;
  meditation_reminder_hour: number;
  meditation_reminder_minute: number;
  meditation_reminder_timezone: string | null;
  act_reminders_enabled: boolean;
  act_reminder_hour: number;
  act_reminder_minute: number;
  act_reminder_timezone: string | null;
}

export interface TargetConfig {
  enabledField: keyof UserPreferenceRow;
  hourField: keyof UserPreferenceRow;
  minuteField: keyof UserPreferenceRow;
  timezoneField: keyof UserPreferenceRow;
  lastKeyField: keyof WebPushSubscriptionRow;
  url: string;
  tag: string;
}

export const TARGET_CONFIGS: Record<ReminderTarget, TargetConfig> = {
  cbt: {
    enabledField: "cbt_reminders_enabled",
    hourField: "cbt_reminder_hour",
    minuteField: "cbt_reminder_minute",
    timezoneField: "cbt_reminder_timezone",
    lastKeyField: "last_cbt_reminder_key",
    url: "/modules/cbt",
    tag: "selftend-cbt-reminder",
  },
  meditation: {
    enabledField: "meditation_reminders_enabled",
    hourField: "meditation_reminder_hour",
    minuteField: "meditation_reminder_minute",
    timezoneField: "meditation_reminder_timezone",
    lastKeyField: "last_meditation_reminder_key",
    url: "/tools/meditation",
    tag: "selftend-meditation-reminder",
  },
  act: {
    enabledField: "act_reminders_enabled",
    hourField: "act_reminder_hour",
    minuteField: "act_reminder_minute",
    timezoneField: "act_reminder_timezone",
    lastKeyField: "last_act_reminder_key",
    url: "/modules/act",
    tag: "selftend-act-reminder",
  },
};

export const TARGETS: ReminderTarget[] = ["cbt", "meditation", "act"];

export interface ZonedParts {
  day: string;
  hour: number;
  minute: number;
  month: string;
  year: string;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return {
      day: parts.day,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      month: parts.month,
      year: parts.year,
    };
  } catch {
    return null;
  }
}

export function reminderKeyIfDue(
  target: ReminderTarget,
  subscription: WebPushSubscriptionRow,
  preferences: UserPreferenceRow,
  now: Date,
): string | null {
  const config = TARGET_CONFIGS[target];
  if (!preferences[config.enabledField]) return null;

  const timeZone =
    subscription.time_zone ?? (preferences[config.timezoneField] as string | null) ?? "UTC";
  const parts = getZonedParts(now, timeZone);
  if (!parts) return null;

  const reminderKey = `${parts.year}-${parts.month}-${parts.day}`;
  if (subscription[config.lastKeyField] === reminderKey) return null;

  const targetHour = preferences[config.hourField] as number;
  const targetMinute = preferences[config.minuteField] as number;

  if (parts.hour !== targetHour) return null;
  if (parts.minute < targetMinute || parts.minute >= targetMinute + 5) return null;

  return reminderKey;
}

export function resolveReminderLanguage(language: string | null): "bg" | "en" {
  return language?.toLowerCase().startsWith("bg") ? "bg" : "en";
}

export function classifyPushError(error: unknown): { expired: boolean; statusCode: number | null } {
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : null;
  return { expired: statusCode === 404 || statusCode === 410, statusCode };
}
```

- [ ] **Step 2: Write the unit test** `supabase/functions/_shared/web-reminders.test.ts`:

```ts
import {
  classifyPushError,
  getZonedParts,
  reminderKeyIfDue,
  resolveReminderLanguage,
  type UserPreferenceRow,
  type WebPushSubscriptionRow,
} from "./web-reminders";

const basePrefs: UserPreferenceRow = {
  user_id: "u1",
  notifications_enabled_global: true,
  reminder_consent: true,
  language: "en",
  cbt_reminders_enabled: true,
  cbt_reminder_hour: 9,
  cbt_reminder_minute: 0,
  cbt_reminder_timezone: "UTC",
  meditation_reminders_enabled: false,
  meditation_reminder_hour: 0,
  meditation_reminder_minute: 0,
  meditation_reminder_timezone: null,
  act_reminders_enabled: false,
  act_reminder_hour: 0,
  act_reminder_minute: 0,
  act_reminder_timezone: null,
};

const baseSub: WebPushSubscriptionRow = {
  auth: "a",
  endpoint: "https://push.example/x",
  failure_count: 0,
  id: "s1",
  last_cbt_reminder_key: null,
  last_meditation_reminder_key: null,
  last_act_reminder_key: null,
  p256dh: "p",
  time_zone: "UTC",
  user_id: "u1",
};

describe("getZonedParts", () => {
  it("formats a date into zoned parts for a valid timezone", () => {
    const parts = getZonedParts(new Date("2026-05-24T09:03:00.000Z"), "UTC");
    expect(parts).toEqual({ year: "2026", month: "05", day: "24", hour: 9, minute: 3 });
  });

  it("returns null for an invalid timezone", () => {
    expect(getZonedParts(new Date("2026-05-24T09:00:00.000Z"), "Not/AZone")).toBeNull();
  });
});

describe("reminderKeyIfDue", () => {
  const now = new Date("2026-05-24T09:02:00.000Z"); // 09:02 UTC, inside the 09:00–09:05 window

  it("returns the reminder key when due inside the 5-minute window", () => {
    expect(reminderKeyIfDue("cbt", baseSub, basePrefs, now)).toBe("2026-05-24");
  });

  it("returns null when the target is disabled", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, { ...basePrefs, cbt_reminders_enabled: false }, now),
    ).toBeNull();
  });

  it("returns null when already sent today (lastKey matches)", () => {
    expect(
      reminderKeyIfDue("cbt", { ...baseSub, last_cbt_reminder_key: "2026-05-24" }, basePrefs, now),
    ).toBeNull();
  });

  it("returns null when the hour does not match", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, basePrefs, new Date("2026-05-24T10:02:00.000Z")),
    ).toBeNull();
  });

  it("returns null below the minute window", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, { ...basePrefs, cbt_reminder_minute: 5 }, now),
    ).toBeNull();
  });

  it("returns null at/after the upper minute boundary (targetMinute + 5)", () => {
    expect(
      reminderKeyIfDue("cbt", baseSub, basePrefs, new Date("2026-05-24T09:05:00.000Z")),
    ).toBeNull();
  });

  it("falls back to the preference timezone when the subscription has none", () => {
    // 09:02 UTC == 11:02 in Europe/Sofia (UTC+2 in May); with pref tz Sofia and hour 11 it is due.
    const sub = { ...baseSub, time_zone: null };
    const prefs = { ...basePrefs, cbt_reminder_timezone: "Europe/Sofia", cbt_reminder_hour: 11 };
    expect(reminderKeyIfDue("cbt", sub, prefs, now)).toBe("2026-05-24");
  });
});

describe("resolveReminderLanguage", () => {
  it.each([
    ["bg", "bg"],
    ["bg-BG", "bg"],
    ["en", "en"],
    ["en-US", "en"],
    [null, "en"],
    ["fr", "en"],
  ])("maps %s -> %s", (input, expected) => {
    expect(resolveReminderLanguage(input)).toBe(expected);
  });
});

describe("classifyPushError", () => {
  it.each([
    [404, true],
    [410, true],
    [500, false],
    [429, false],
  ])("statusCode %s -> expired %s", (code, expired) => {
    expect(classifyPushError({ statusCode: code })).toEqual({ statusCode: code, expired });
  });

  it("treats an unknown error shape as non-expired with null status", () => {
    expect(classifyPushError(new Error("boom"))).toEqual({ statusCode: null, expired: false });
  });
});
```

- [ ] **Step 3: Run the test** — `npx jest supabase/functions/_shared/web-reminders.test.ts` — expect all pass. (If the Europe/Sofia DST case is off, adjust the comment/expectation to the actual offset; the logic, not the fixture, is the contract.)

- [ ] **Step 4: Rewire `send-web-reminders/index.ts`** to import from the shared module. Remove the now-duplicated inline definitions (the `ReminderTarget` type, `WebPushSubscriptionRow`/`UserPreferenceRow`/`TargetConfig`/`ZonedParts` interfaces, `TARGET_CONFIGS`, `TARGETS`, `getZonedParts`, `reminderKeyIfDue`) and add at the top (Deno requires the `.ts` extension):

```ts
import {
  classifyPushError,
  getZonedParts,
  reminderKeyIfDue,
  resolveReminderLanguage,
  TARGET_CONFIGS,
  TARGETS,
  type ReminderTarget,
  type UserPreferenceRow,
  type WebPushSubscriptionRow,
} from "../_shared/web-reminders.ts";
```

Keep the i18n JSON imports and `notificationCopyByLanguage` in `index.ts`, and replace the inline `getNotificationCopy` body to use the shared helper:

```ts
function getNotificationCopy(language: string | null, target: ReminderTarget) {
  return notificationCopyByLanguage[resolveReminderLanguage(language)][target];
}
```

Replace the inline status-code logic in the `catch` block with `const { expired } = classifyPushError(error);` (then use `expired` exactly as before). Leave all `Deno.serve`/`createClient`/`webpush` logic unchanged. Note `getZonedParts`/`reminderKeyIfDue` are now imported (delete their local copies).

- [ ] **Step 5: Sanity-check the rewired file** — confirm no remaining duplicate declarations and that every symbol used in `index.ts` is either still defined there or imported. (`grep -n "function reminderKeyIfDue\|function getZonedParts\|const TARGET_CONFIGS" supabase/functions/send-web-reminders/index.ts` should return nothing.) Deno is not run locally; correctness rests on this review + Phase 3's serve smoke.

- [ ] **Step 6: Commit** _(user runs)_: `git add supabase/functions/_shared/web-reminders.ts supabase/functions/_shared/web-reminders.test.ts supabase/functions/send-web-reminders/index.ts` → `git commit -m "test: extract and unit-test web-reminder scheduling logic"`

### Task A2: Extract `supabase/functions/_shared/feedback.ts`

**Files:**

- Create: `supabase/functions/_shared/feedback.ts`
- Test: `supabase/functions/_shared/feedback.test.ts`
- Modify: `supabase/functions/send-feedback/index.ts`

- [ ] **Step 1: Create the shared module** `supabase/functions/_shared/feedback.ts`:

```ts
// Runtime-agnostic validation + email rendering for the send-feedback edge
// function. No Deno globals, so jest can unit-test it directly.

export interface FeedbackValidation {
  valid: boolean;
  trimmed: string;
}

// Mirrors the inline check in index.ts: category required, message a string of
// 10–1000 trimmed chars.
export function validateFeedbackInput(category: unknown, message: unknown): FeedbackValidation {
  const trimmed = typeof message === "string" ? message.trim() : "";
  const valid = Boolean(category) && trimmed.length >= 10 && trimmed.length <= 1000;
  return { valid, trimmed };
}

// NOTE: user input is interpolated WITHOUT HTML-escaping, mirroring current
// production behavior. The test documents this; do not silently change it here.
export function buildFeedbackEmailHtml(
  category: string,
  trimmed: string,
  fromEmail: string,
): string {
  return `<html>
  <body style="margin:0;padding:0;background-color:#f9f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f8fb;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;border:1px solid #dad8e2;padding:40px;max-width:480px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#221d2a;">Selftend feedback</p>
                <p style="margin:0 0 24px;font-size:13px;color:#9d99a8;">Category: ${category}</p>
                <p style="margin:0 0 24px;font-size:15px;color:#221d2a;white-space:pre-wrap;">${trimmed}</p>
                <p style="margin:0;font-size:13px;color:#9d99a8;">From: ${fromEmail}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
```

- [ ] **Step 2: Write the unit test** `supabase/functions/_shared/feedback.test.ts`:

```ts
import { buildFeedbackEmailHtml, validateFeedbackInput } from "./feedback";

describe("validateFeedbackInput", () => {
  it("accepts a category with a 10–1000 char message and returns the trimmed text", () => {
    expect(validateFeedbackInput("bug", "  this is long enough  ")).toEqual({
      valid: true,
      trimmed: "this is long enough",
    });
  });

  it("rejects a trimmed message shorter than 10 chars", () => {
    expect(validateFeedbackInput("bug", "  short  ").valid).toBe(false);
  });

  it("accepts exactly 10 chars and rejects 9", () => {
    expect(validateFeedbackInput("bug", "a".repeat(10)).valid).toBe(true);
    expect(validateFeedbackInput("bug", "a".repeat(9)).valid).toBe(false);
  });

  it("accepts exactly 1000 chars and rejects 1001", () => {
    expect(validateFeedbackInput("bug", "a".repeat(1000)).valid).toBe(true);
    expect(validateFeedbackInput("bug", "a".repeat(1001)).valid).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(validateFeedbackInput("", "a".repeat(20)).valid).toBe(false);
  });

  it("coerces a non-string message to an empty (invalid) trim", () => {
    expect(validateFeedbackInput("bug", 123)).toEqual({ valid: false, trimmed: "" });
  });
});

describe("buildFeedbackEmailHtml", () => {
  it("interpolates category, message, and sender into the template", () => {
    const html = buildFeedbackEmailHtml("bug", "it broke", "user@example.com");
    expect(html).toContain("Category: bug");
    expect(html).toContain("it broke");
    expect(html).toContain("From: user@example.com");
  });

  it("does NOT HTML-escape user input (documents current behavior)", () => {
    const html = buildFeedbackEmailHtml("bug", "<script>x</script>", "user@example.com");
    expect(html).toContain("<script>x</script>");
  });
});
```

- [ ] **Step 3: Run** `npx jest supabase/functions/_shared/feedback.test.ts` — expect all pass.

- [ ] **Step 4: Rewire `send-feedback/index.ts`** — add `import { buildFeedbackEmailHtml, validateFeedbackInput } from "../_shared/feedback.ts";`. Replace the inline validation block with:

```ts
const { category, message } = await request.json();
const { valid, trimmed } = validateFeedbackInput(category, message);
if (!valid) {
  return new Response(JSON.stringify({ error: "Invalid input" }), {
    headers: { ...jsonHeaders, ...corsHeaders },
    status: 400,
  });
}
```

and replace the inline `html: \`...\``value in the Resend body with`html: buildFeedbackEmailHtml(category, trimmed, user.email ?? "")`. Leave everything else unchanged.

- [ ] **Step 5: Commit** _(user runs)_: `git add supabase/functions/_shared/feedback.ts supabase/functions/_shared/feedback.test.ts supabase/functions/send-feedback/index.ts` → `git commit -m "test: extract and unit-test feedback validation and email rendering"`

---

## Batch B — High-value logic units

Each task: create the test file next to the source, follow the named canonical, cover the listed behaviors, run `npx jest <file>` to green, commit (`test: unit-test <unit>`).

### Task B1: `src/features/mood/relative-time.test.ts` — **Canonical A**

Already fully specified as Canonical A above; create that file verbatim.

### Task B2: `src/features/auth/use-auth-throttle.test.ts` — **Canonical C**

Already fully specified as Canonical C above; create that file verbatim.

### Task B3: `src/features/mood/use-emotion-display.test.ts` — follows **Canonical C** (hook)

Read `src/features/mood/use-emotion-display.ts`. Mock the emotions store and i18n as needed. Cover: resolution precedence — custom emotion wins over builtin; builtin uses emoji override then i18n key, falling back to the id; a legacy lowercased id resolves; an unknown id returns the fallback emoji; `allEmotions` merges defaults + custom.

### Task B4: `src/features/act/program-definition.test.ts` — follows **Canonical A** (pure logic; sibling `src/features/cbt/program-definition.test.ts` already exists — mirror its style)

Read `src/features/act/program-definition.ts` and the existing `cbt/program-definition.test.ts`. Cover: `atOrAfter`/`countSince`/`didOnDate` helpers; each phase task-signal function — current vs target counts; drop-anchor vs other connection filtering; defusion+expansion+urge-surf union; value `updatedAt`; daily `completedAt` keyed by selectedDate.

### Task B5: `src/features/cbt/use-cbt-insights.test.ts` — follows **Canonical C** (hook), mock the feature query hooks like `use-cbt-program.test.ts` does

Read `src/features/cbt/use-cbt-insights.ts`. This is dense — split into multiple `describe` blocks. Cover: each insight's min-data gating threshold; thought/label normalization; exercise & activity mood-lift averaging + rounding; top-distortion and recurring-thought ranking with tie-breaks; belief-review due/strength filter; the 7-day self-care window joining sleep/gratitude; anger pattern aggregation. Mock the underlying query hooks (`jest.mock` each, as in `use-cbt-program.test.ts`).

### Task B6: `src/lib/use-wizard-draft.test.ts` — follows **Canonical C** (hook)

Read `src/lib/use-wizard-draft.ts`. Cover: `handleNext` validates the current step's fields before advancing; `handleSave` persists then resets then toasts on success, and toasts the error on throw; `goToStep` only moves backward; `stepIndex` clamps; `selectWizardDraftValues` returns values only when mode + entityId match. Mock the wizard-draft store and the toast store; mock the save mutation.

---

## Batch C — Stores

### Task C1: `src/stores/create-draft-store.test.ts` — **Canonical B** (verbatim above)

### Task C2: `src/stores/create-wizard-draft-store.test.ts` — follows **Canonical B**, extended for wizard fields

Read `src/stores/create-wizard-draft-store.ts`. Cover: `hydrate(mode, entityId)` keeps `stepIndex`+`values` only when both `mode` and `entityId` match, else resets them to `0`/`null`; `nextStep(max)` clamps at `max`; `previousStep` clamps at `0`; `reset` restores `mode:"create"`, `entityId:null`, `stepIndex:0`, `values:null`; `setStepIndex`/`setValues` set directly.

### Task C3: `src/stores/cookie-consent-store.test.ts` — follows **Canonical B**, plus persistence

Read `src/stores/cookie-consent-store.ts`. The store persists to `globalThis.localStorage` only on web (`Platform.OS === "web"`). In tests, `Platform.OS` is `"ios"` by default under jest-expo, so persistence is a no-op — assert the in-memory state transitions for `acceptAll` (analytics+accepted true, acceptedAt set), `acceptEssentialOnly` (analytics false, accepted true), `setAnalytics(true/false)`. For the web persistence path, add a focused block that mocks `Platform.OS` to `"web"` and stubs `globalThis.localStorage` with an in-memory `getItem`/`setItem`, then asserts `acceptAll` writes JSON and `hydrate` restores it and ignores malformed/empty stored values. Note `acceptedAt` uses `new Date().toISOString()` — assert it is a non-null ISO string (`expect.any(String)`), do not pin the exact value.

### Task C4: `src/stores/emotions-store.test.ts` — follows **Canonical B**, plus AsyncStorage

Read `src/stores/emotions-store.ts`. AsyncStorage is already mocked globally (`test/setup.js`). Cover: add/update/remove custom emotions and `setEmojiOverride` mutate state and write JSON to AsyncStorage; `hydrate` parses both storage keys and yields empty defaults when null/malformed.

---

## Batch D — Query hooks (the 8 with real logic)

All follow **Canonical D** (mock the repository module(s), render with a `QueryClientProvider`). **All Batch D files are `.test.tsx`** (the wrapper uses JSX). For mutation hooks, assert the mutation calls the repository fn and that `onSuccess` invalidates the right keys (spy on `queryClient.invalidateQueries` by passing a shared client into the wrapper and asserting via `client.getQueryState`, or assert the repository orchestration directly).

### Task D1: `src/features/breathing/queries.test.tsx` — **Canonical D** (verbatim above)

### Task D2: `src/features/grounding/queries.test.tsx` — follows **Canonical D**

Same shape as breathing: `useGroundingSessions` filters mindfulness sessions by `groundingSlugs`. Cover the allowlist filter + the `enabled: Boolean(userId)` gate.

### Task D3: `src/features/home/queries.test.tsx` — follows **Canonical D**

Read `src/features/home/queries.ts`. Cover `listOrSeed`: returns existing widgets when present; when empty AND already seeded, stays empty (no re-seed); when empty and not seeded, seeds `resolveInitialWidgetIds` and marks seeded. Cover `useAddWidget` computing `nextPosition` as `max(position) + 1`. Mock `widget-repository` + the seeding helpers.

### Task D4: `src/features/exposure/queries.test.tsx` — follows **Canonical D**

Read `src/features/exposure/queries.ts`. Cover `useSaveHierarchy` orchestrating `saveHierarchy` then `saveItems(hierarchy.id, items)`; `useSaveExposureSession` adding an items-key invalidation only when `hierarchyId` is present.

### Task D5: `src/features/goals/queries.test.tsx` — follows **Canonical D**

Read `src/features/goals/queries.ts`. Cover `useSaveGoal`: `saveGoal`, then on edit (`goalId`) `deleteMilestonesForGoal` before `saveMilestones`; `useToggleMilestone` branching complete vs uncomplete and gating invalidation on `goalId`.

### Task D6: `src/features/procrastination/queries.test.tsx` — follows **Canonical D**

Read `src/features/procrastination/queries.ts`. Cover `useSaveTask` orchestrating `saveTask` then `saveSteps(task.id, steps)`; `useToggleStep` gating invalidation on `userId` and `taskId`.

### Task D7: `src/features/habits/queries.test.tsx` — follows **Canonical D**

Read `src/features/habits/queries.ts`. Cover the `useHabitLogs` scope-string queryKey derivation (`habit:<id>:<sinceDate>:<limit>` vs `all:<sinceDate>:<limit>`) and `useHabits` folding `includeArchived` (default via `??`) into the key. Assert distinct keys produce distinct cache buckets (render two hooks, assert the repository is called with the right args per key).

### Task D8: `src/features/act/queries.test.tsx` — follows **Canonical D**

Read `src/features/act/queries.ts`. Cover the `committedActionListPrefix` prefix-match invalidation: a save/delete mutation invalidates every status-filtered `committedActionList` key. Mock the act repository; assert via a shared client that both `["act","committedAction","list",...]` variants are invalidated.

---

## Batch E — lib utils (med/low)

### Task E1: `src/utils/date.test.ts` — follows **Canonical A**

Read `src/utils/date.ts`. Cover `formatTimestamp` producing a medium-date/short-time string from an ISO value (assert it contains the expected date parts; the exact locale formatting may be environment-dependent — assert structure, not an exact string).

### Task E2: `src/lib/env.test.ts` — pure module

Read `src/lib/env.ts`. Cover `appEnv` key precedence (publishable → anon fallback), `hasSupabaseConfig` boolean, and `validateRequiredEnv` warn/error branches. Use `jest.resetModules()` + set `process.env`/`Platform` to drive branches.

### Task E3: `src/lib/color-scheme.test.ts` — follows **Canonical C** (hook)

Read `src/lib/color-scheme.ts`. Cover `useAppColorScheme` resolving system vs explicit preference, hydrating the theme store, and setting nativewind colorScheme to resolved-on-web vs preference-on-native. Mock the theme store + nativewind `useColorScheme`.

### Task E4: `src/lib/accessibility.test.ts` — follows **Canonical C** (hook)

Read `src/lib/accessibility.ts`. Cover `useReduceMotionEnabled`: the web path reads `matchMedia`, reflects `matches`, and subscribes/unsubscribes via add/removeEventListener (with the `addListener` fallback); the native path uses `AccessibilityInfo`.

---

## Finalize Phase 2

- [ ] **Re-record the coverage baseline.** After all batches are green: `npm run test:coverage && npm run coverage:ratchet:update`. Confirm the four pcts rose vs the Phase-1 floor (lines 49.94 / statements 47.18 / functions 37.56 / branches 40.59). Run `npm run verify` → expect green with the new floor.
- [ ] **Commit** _(user runs)_: `git add coverage/baseline.json && git commit -m "test: raise coverage baseline after Phase 2 unit tests"`

## Self-review checklist (run before handing off)

- Spec coverage: every Appendix C "high/med" unit and the §8 edge extraction has a task. (Low-priority items — `home/tool-accent`, `widget-tint`, `habits/learn`, `recovery/schemas`, `sidebar-store`, `toast-store` — are intentionally deferred; add them opportunistically if cheap.)
- No placeholders: Batch A + the four canonicals are full code; sibling tasks carry concrete behavior lists + a named canonical.
- Naming consistency: exported names referenced in tasks (`reminderKeyIfDue`, `resolveReminderLanguage`, `classifyPushError`, `validateFeedbackInput`, `buildFeedbackEmailHtml`, `createDraftStore`, `createWizardDraftStore`) match the source/extraction.

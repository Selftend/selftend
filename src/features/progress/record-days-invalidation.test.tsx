import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PropsWithChildren } from "react";

import { recordDaysKeys } from "@/src/features/progress/queries";
import { createTestQueryClient } from "@/test/render-with-providers";

import { useDeleteMoodLog, useSaveMoodLog } from "@/src/features/mood/queries";
import { useDeleteGratitudeEntry, useSaveGratitudeEntry } from "@/src/features/gratitude/queries";
import { useDeleteJournalEntry, useSaveJournalEntry } from "@/src/features/journal/queries";
import { useDeleteSleepLog, useSaveSleepLog } from "@/src/features/sleep/queries";
import { useSaveMeditationSession } from "@/src/features/meditation/queries";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useSaveGroundingSession } from "@/src/features/grounding/queries";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { useArchiveThoughtRecord, useSaveThoughtRecord } from "@/src/features/cbt/queries";
import {
  useDeleteHabit,
  useToggleHabitLog,
  useUpsertHabitLogNote,
} from "@/src/features/habits/queries";
import { useUpsertSelfCareLog } from "@/src/features/self-care/queries";

/**
 * ☠️ **`record_days` spans ten tools, so it has no owning feature to nest
 * under** - ADR-0001's rule (keep a stats query on the list's own key root, and
 * the feature's save/delete invalidation reaches both) has nothing to apply to.
 * The root is reached only because each write path reaches for it by name.
 *
 * This table is the guard on that. With the client's 60s default `staleTime`, a
 * missed write path means someone logs a check-in, walks straight to "Looking
 * back", and finds today unmarked - absence, on the one screen whose whole job
 * is to state the record truthfully, arriving from the cache instead of from
 * the 250-row cap the RPC exists to escape. `/progress` can also still be
 * mounted behind the drawer while the write happens, so a refetch-on-mount
 * would not have covered it either.
 *
 * The rows are the ten sources `record_days` reads - see "the span rule" in
 * `20260907000000_record_days.sql`. Anything that adds or removes one of those
 * rows belongs here. Mutations that cannot move a row's day deliberately do
 * NOT: `useSaveActivity` edits a schedule and never touches `completed_at`,
 * `useUpdateMeditationSessionReflection` patches a sit that is already logged,
 * and `useSetGratitudeEntryStarred` moves a flag.
 */
const USER = "user-1";
const OFFSET = 330;
const VIEWER_KEY = recordDaysKeys.forViewer(USER, OFFSET);

/**
 * The repositories are mocked, so no mutation variable is ever read on the way
 * in - only the hook's own `onSuccess` runs, against the value the mock
 * resolves. `never` stands in for each tool's input type so this table does not
 * carry eighteen fixtures that nothing looks at.
 */
const UNREAD = undefined as never;

jest.mock("@/src/stores/reminder-prompt-store", () => ({
  requestReminderPrompt: jest.fn(),
}));

jest.mock("@/src/features/progress/repository", () => ({
  listRecordDays: jest.fn(async () => []),
  viewerOffsetMinutes: jest.fn(() => 330),
}));

jest.mock("@/src/features/mood/repository", () => ({
  saveMoodLog: jest.fn(async () => ({ id: "mood-1" })),
  deleteMoodLog: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/gratitude/repository", () => ({
  saveGratitudeEntry: jest.fn(async () => ({ id: "gratitude-1" })),
  deleteGratitudeEntry: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/journal/repository", () => ({
  saveJournalEntry: jest.fn(async () => ({ id: "journal-1" })),
  deleteJournalEntry: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/sleep/repository", () => ({
  saveSleepLog: jest.fn(async () => ({ id: "sleep-1" })),
  deleteSleepLog: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/meditation/repository", () => ({
  saveMeditationSession: jest.fn(async () => ({ id: "meditation-1" })),
}));
jest.mock("@/src/features/mindfulness/repository", () => ({
  saveMindfulnessSession: jest.fn(async () => ({ id: "mindfulness-1" })),
}));
jest.mock("@/src/features/activities/repository", () => ({
  completeActivity: jest.fn(async () => ({ id: "activity-1" })),
}));
jest.mock("@/src/features/cbt/repository", () => ({
  saveThoughtRecord: jest.fn(async () => ({ id: "record-1" })),
  archiveThoughtRecord: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/habits/repository", () => ({
  toggleHabitLog: jest.fn(async () => ({ log: null, ticked: true })),
  upsertHabitLogNote: jest.fn(async () => ({ id: "log-1" })),
  deleteHabit: jest.fn(async () => undefined),
}));
jest.mock("@/src/features/self-care/repository", () => ({
  upsertSelfCareLog: jest.fn(async () => ({
    logDate: "2026-09-04",
    createdAt: "2026-09-04T09:00:00Z",
    updatedAt: "2026-09-04T09:00:00Z",
  })),
}));

const DAY = "2026-09-04";

/** Each row returns the one call that writes a record - or unwrites one. */
const WRITE_PATHS: { source: string; table: string; use: () => () => void }[] = [
  {
    source: "saving a check-in",
    table: "mood_logs_data",
    use: () => {
      const m = useSaveMoodLog(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a check-in",
    table: "mood_logs_data",
    use: () => {
      const m = useDeleteMoodLog(USER);
      return () => m.mutate("mood-1");
    },
  },
  {
    source: "saving a gratitude entry",
    table: "gratitude_entries_data",
    use: () => {
      const m = useSaveGratitudeEntry(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a gratitude entry",
    table: "gratitude_entries_data",
    use: () => {
      const m = useDeleteGratitudeEntry(USER);
      return () => m.mutate("gratitude-1");
    },
  },
  {
    source: "saving a journal entry",
    table: "journal_entries_data",
    use: () => {
      const m = useSaveJournalEntry(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a journal entry",
    table: "journal_entries_data",
    use: () => {
      const m = useDeleteJournalEntry(USER);
      return () => m.mutate("journal-1");
    },
  },
  {
    source: "saving a sleep log",
    table: "sleep_logs_data",
    use: () => {
      const m = useSaveSleepLog(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a sleep log",
    table: "sleep_logs_data",
    use: () => {
      const m = useDeleteSleepLog(USER);
      return () => m.mutate("sleep-1");
    },
  },
  {
    source: "logging a meditation sit",
    table: "meditation_sessions",
    use: () => {
      const m = useSaveMeditationSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "finishing a breathing session",
    table: "mindfulness_sessions_data",
    use: () => {
      const m = useSaveBreathingSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "finishing a grounding session",
    table: "mindfulness_sessions_data",
    use: () => {
      const m = useSaveGroundingSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "completing an activity",
    table: "activity_logs_data",
    use: () => {
      const m = useCompleteActivity(USER);
      return () => m.mutate({ activityId: "activity-1", moodAfter: null });
    },
  },
  {
    source: "saving a thought record",
    table: "thought_records_data",
    use: () => {
      const m = useSaveThoughtRecord(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "archiving a thought record",
    table: "thought_records_data",
    use: () => {
      const m = useArchiveThoughtRecord(USER);
      return () => m.mutate("record-1");
    },
  },
  {
    source: "ticking a habit",
    table: "habit_logs_data",
    use: () => {
      const m = useToggleHabitLog(USER);
      return () => m.mutate({ habitId: "habit-1", loggedOn: DAY });
    },
  },
  {
    source: "writing a habit note",
    table: "habit_logs_data",
    use: () => {
      const m = useUpsertHabitLogNote(USER);
      return () => m.mutate({ habitId: "habit-1", loggedOn: DAY, note: "went for a walk" });
    },
  },
  {
    source: "deleting a habit",
    table: "habit_logs_data",
    use: () => {
      const m = useDeleteHabit(USER);
      return () => m.mutate("habit-1");
    },
  },
  {
    source: "saving a self-care log",
    table: "self_care_logs_data",
    use: () => {
      const m = useUpsertSelfCareLog(USER);
      return () => m.mutate(UNREAD);
    },
  },
];

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("every write path marks the record days stale", () => {
  it.each(WRITE_PATHS)("$source", async ({ use }) => {
    const client = createTestQueryClient();
    // Seeded rather than fetched: an answer already in the cache is exactly the
    // thing a write has to unseat, and a query with no answer would report
    // itself invalidated for the wrong reason.
    client.setQueryData(VIEWER_KEY, ["2026-01-01"]);
    expect(client.getQueryState(VIEWER_KEY)?.isInvalidated).toBe(false);

    const { result } = renderHook(() => use(), { wrapper: wrap(client) });
    await act(async () => {
      result.current();
    });

    await waitFor(() => {
      expect(client.getQueryState(VIEWER_KEY)?.isInvalidated).toBe(true);
    });
  });

  /**
   * ☠️ **The list above is the whole guard, so it may not be trusted to be
   * complete - it has to be checked against something that moves when the
   * product does.** A bare `toHaveLength(18)` would only restate the literal
   * beside it: an eleventh tool added to the RPC would trip nothing.
   *
   * So the check is against the migration itself. Every base table
   * `record_days` reads must have at least one write path here, and every write
   * path must name a table the RPC actually reads. Add a source to the SQL and
   * this goes red until something invalidates for it; drop one and the stale
   * row is caught from the other side.
   */
  it("has a write path for every source the RPC reads", () => {
    const sql = readFileSync(
      join(__dirname, "../../../supabase/migrations/20260907000000_record_days.sql"),
      "utf8",
    );
    // Only the `marked` CTE's own reads - `from public.<table> as <alias>`. The
    // prose above it names excluded tables too, and matching those would let a
    // comment satisfy the guard.
    const readTables = new Set(
      [...sql.matchAll(/from public\.(\w+) as \w+/g)].map((match) => match[1]),
    );
    const coveredTables = new Set(WRITE_PATHS.map((path) => path.table));

    expect(readTables.size).toBe(10);
    expect([...readTables].sort()).toEqual([...coveredTables].sort());
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PropsWithChildren } from "react";

import { homeToolStatsKeys } from "@/src/features/home/tool-stats-queries";
import { createTestQueryClient } from "@/test/render-with-providers";

import { useDeleteMoodLog, useSaveMoodLog } from "@/src/features/mood/queries";
import {
  useDeleteGratitudeEntry,
  useSaveGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import { useDeleteJournalEntry, useSaveJournalEntry } from "@/src/features/journal/queries";
import { useDeleteSleepLog, useSaveSleepLog } from "@/src/features/sleep/queries";
import {
  useSaveMeditationSession,
  useUpdateMeditationSessionReflection,
} from "@/src/features/meditation/queries";
import { useSaveBreathingSession } from "@/src/features/breathing/queries";
import { useSaveGroundingSession } from "@/src/features/grounding/queries";
import {
  useArchiveHabit,
  useDeleteHabit,
  useRestoreHabit,
  useSaveHabit,
  useToggleHabitLog,
  useUpsertHabitLogNote,
} from "@/src/features/habits/queries";

/**
 * ☠️ **`home_tool_stats` spans eight tools and seven tables, so it has no owning
 * feature to nest under** — ADR-0001's rule (keep a stats query on the list's own key
 * root, and the feature's save/delete invalidation reaches both) has nothing to apply
 * to. The root is reached only because each write path reaches for it by name.
 *
 * This table is the guard on that, and it is the behavioural half: it proves the
 * invalidation actually FIRES, which the static scan in
 * `test/home-tool-stats-invalidation.test.ts` cannot see. That file proves no writing
 * hook was missed, which a hand-written table cannot see. Keep both — the same pair
 * `record_days` keeps (#1906), for the same reasons.
 *
 * With the client's 60s default `staleTime`, a missed write path means someone logs a
 * check-in, returns to Home, and reads yesterday's number on the card — and Home is
 * mounted behind every tool, so a refetch-on-mount would not have covered it.
 */
const USER = "user-1";
// Any frame will do: what a write must unseat is the ROOT, and the test below
// checks a second frame explicitly.
const ZONE = "Asia/Kolkata";
const DAY = "2026-09-04";
const VIEWER_KEY = homeToolStatsKeys.forViewer(USER, ZONE, DAY);

/**
 * The repositories are mocked, so no mutation variable is ever read on the way in —
 * only the hook's own `onSuccess`/`onSettled` runs, against the value the mock
 * resolves. `never` stands in for each tool's input type so this table does not carry
 * a fixture nothing looks at.
 */
const UNREAD = undefined as never;

jest.mock("@/src/stores/tool-save-store", () => ({
  noteToolSave: jest.fn(),
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
  setGratitudeEntryStarred: jest.fn(async () => ({ id: "gratitude-1", starred: true })),
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
  updateMeditationSessionReflection: jest.fn(async () => ({ id: "meditation-1" })),
}));
jest.mock("@/src/features/mindfulness/repository", () => ({
  saveMindfulnessSession: jest.fn(async () => ({ id: "mindfulness-1" })),
}));
jest.mock("@/src/features/habits/repository", () => ({
  saveHabit: jest.fn(async () => ({ id: "habit-1" })),
  archiveHabit: jest.fn(async () => ({ id: "habit-1" })),
  restoreHabit: jest.fn(async () => ({ id: "habit-1" })),
  deleteHabit: jest.fn(async () => undefined),
  toggleHabitLog: jest.fn(async () => ({ log: null, ticked: true })),
  upsertHabitLogNote: jest.fn(async () => ({ id: "log-1" })),
}));

/** Each row returns the one call that writes a figure Home draws — or unwrites one. */
const WRITE_PATHS: { source: string; use: () => () => void }[] = [
  {
    source: "saving a check-in",
    use: () => {
      const m = useSaveMoodLog(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a check-in",
    use: () => {
      const m = useDeleteMoodLog(USER);
      return () => m.mutate("mood-1");
    },
  },
  {
    source: "saving a journal entry",
    use: () => {
      const m = useSaveJournalEntry(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a journal entry",
    use: () => {
      const m = useDeleteJournalEntry(USER);
      return () => m.mutate("journal-1");
    },
  },
  {
    source: "saving a gratitude entry",
    use: () => {
      const m = useSaveGratitudeEntry(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a gratitude entry",
    use: () => {
      const m = useDeleteGratitudeEntry(USER);
      return () => m.mutate("gratitude-1");
    },
  },
  {
    // Starring moves no figure on a card — it is here because the rule is coarse on
    // purpose (any write to a source table invalidates), which is what stops the
    // per-mutation judgement rotting the day a payload gains a field.
    source: "starring a gratitude entry",
    use: () => {
      const m = useSetGratitudeEntryStarred(USER);
      return () => m.mutate({ id: "gratitude-1", starred: true });
    },
  },
  {
    source: "finishing a breathing session",
    use: () => {
      const m = useSaveBreathingSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "finishing a grounding session",
    use: () => {
      const m = useSaveGroundingSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "logging a meditation sit",
    use: () => {
      const m = useSaveMeditationSession(USER);
      return () => m.mutate(UNREAD);
    },
  },
  {
    source: "patching a sit's reflection",
    use: () => {
      const m = useUpdateMeditationSessionReflection(USER);
      return () => m.mutate({ sessionId: "meditation-1", patch: UNREAD });
    },
  },
  {
    source: "saving a sleep log",
    use: () => {
      const m = useSaveSleepLog(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "deleting a sleep log",
    use: () => {
      const m = useDeleteSleepLog(USER);
      return () => m.mutate("sleep-1");
    },
  },
  {
    source: "saving a habit",
    use: () => {
      const m = useSaveHabit(USER);
      return () => m.mutate({ input: UNREAD });
    },
  },
  {
    source: "archiving a habit",
    use: () => {
      const m = useArchiveHabit(USER);
      return () => m.mutate("habit-1");
    },
  },
  {
    source: "restoring a habit",
    use: () => {
      const m = useRestoreHabit(USER);
      return () => m.mutate("habit-1");
    },
  },
  {
    source: "deleting a habit",
    use: () => {
      const m = useDeleteHabit(USER);
      return () => m.mutate("habit-1");
    },
  },
  {
    source: "ticking a habit",
    use: () => {
      const m = useToggleHabitLog(USER);
      return () => m.mutate({ habitId: "habit-1", loggedOn: DAY });
    },
  },
  {
    source: "writing a habit note",
    use: () => {
      const m = useUpsertHabitLogNote(USER);
      return () => m.mutate({ habitId: "habit-1", loggedOn: DAY, note: "went for a walk" });
    },
  },
];

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("every write path marks Home's tool stats stale", () => {
  it.each(WRITE_PATHS)("$source", async ({ use }) => {
    const client = createTestQueryClient();
    // Seeded rather than fetched: an answer already in the cache is exactly the thing a
    // write has to unseat, and a query with no answer would report itself invalidated
    // for the wrong reason.
    client.setQueryData(VIEWER_KEY, { journal: { entries: 1, words: 1 } });
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
   * ☠️ The invalidation has to reach EVERY viewer frame, not just the one in the key
   * the hook happens to know. The zone and the day ride the key — a traveller and a
   * device that has crossed midnight hold different entries — so a write must
   * invalidate the ROOT, and a helper that reached for one composed key would leave
   * the others serving figures from before the write.
   */
  it("invalidates every frame's entry, not only the current one", async () => {
    const client = createTestQueryClient();
    const other = homeToolStatsKeys.forViewer(USER, "Europe/Sofia", "2026-09-03");
    client.setQueryData(VIEWER_KEY, { journal: { entries: 1, words: 1 } });
    client.setQueryData(other, { journal: { entries: 1, words: 1 } });

    const { result } = renderHook(
      () => {
        const m = useSaveJournalEntry(USER);
        return () => m.mutate({ input: UNREAD });
      },
      { wrapper: wrap(client) },
    );
    await act(async () => {
      result.current();
    });

    await waitFor(() => {
      expect(client.getQueryState(other)?.isInvalidated).toBe(true);
    });
  });
});

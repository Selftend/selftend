import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMindfulnessSessionsExcludingNames,
  listMindfulnessSessionsByNames,
  listMindfulnessSessionsExcludingNamesPage,
  saveMindfulnessSession,
  sumMindfulnessMinutesExcludingNames,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";
import { groundingSlugs } from "@/src/constants/grounding";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";

/** Rows per page on the all-sessions screen. */
export const BREATHING_HISTORY_PAGE_SIZE = 20;

const breathingKeys = {
  list: (userId: string) => ["breathing", "list", userId] as const,
  count: (userId: string) => ["breathing", "count", userId] as const,
  minutes: (userId: string) => ["breathing", "minutes", userId] as const,
  historyPages: (userId: string) => ["breathing", "historyPages", userId] as const,
};

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

// Counts by exclusion - everything in mindfulness_sessions that is not grounding is a
// breathing session (src/features/routines/derive.ts draws the same line). Counting by
// inclusion over breathingSlugs would drop custom exercises, whose sessions carry the
// custom exercise's id as their name.
export function useBreathingSessionCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? breathingKeys.count(userId) : ["breathing", "count", "anonymous"],
    queryFn: () => countMindfulnessSessionsExcludingNames(userId!, [...groundingSlugs]),
    enabled: Boolean(userId),
  });
}

/**
 * Exact lifetime minutes breathed, for the overview header. Server-side by the same
 * argument as the count above: the screen's own list is capped, so reducing it would
 * turn a lifetime figure into a "last 50 sessions" one with nothing in the label to
 * say so.
 */
export function useBreathingTotalMinutes(userId: string | null) {
  return useQuery({
    queryKey: userId ? breathingKeys.minutes(userId) : ["breathing", "minutes", "anonymous"],
    queryFn: () => sumMindfulnessMinutesExcludingNames([...groundingSlugs]),
    enabled: Boolean(userId),
  });
}

/**
 * Every breathing session, paged to the end (#696) - the all-sessions screen's read.
 *
 * Counts by EXCLUSION, like `useBreathingSessionCount` and `useBreathingTotalMinutes`, and
 * unlike the recent-window read above. Breathing is an open set, and a deleted custom
 * pattern leaves its sessions behind: an inclusive filter over the patterns that still
 * exist would drop those rows from the one screen that promises the whole record, while
 * the header totals still counted them. It also means the query needs no `customIds`, so
 * it can't serve a stale list while that second query is in flight.
 */
export function useBreathingSessionPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId
      ? breathingKeys.historyPages(userId)
      : ["breathing", "historyPages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listMindfulnessSessionsExcludingNamesPage(
        userId!,
        [...groundingSlugs],
        BREATHING_HISTORY_PAGE_SIZE,
        pageParam,
      ),
    initialPageParam: null as RecordCursor | null,
    // A short page is the end of the data. A full one may or may not be, so ask again:
    // one empty round trip at the exact boundary beats stopping early and calling a
    // truncated list "all sessions".
    getNextPageParam: (lastPage) =>
      lastPage.length < BREATHING_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (session) => session.completedAt),
    enabled: Boolean(userId),
  });
}

export function useSaveBreathingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("breathing");
      if (!userId) return;
      // Breathing, grounding, and mindfulness all persist into mindfulness_sessions, so a
      // save must refresh every view of that table, not just this namespace.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["breathing"] }),
        queryClient.invalidateQueries({ queryKey: ["grounding"] }),
        queryClient.invalidateQueries({ queryKey: ["mindfulness"] }),
      ]);
    },
  });
}

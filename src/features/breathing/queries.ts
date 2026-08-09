import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMindfulnessSessionsExcludingNames,
  listMindfulnessSessionsByNames,
  listMindfulnessSessionsByNamesPage,
  saveMindfulnessSession,
  sumMindfulnessMinutesExcludingNames,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { breathingSlugs } from "@/src/constants/breathing";
import { groundingSlugs } from "@/src/constants/grounding";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

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
 * `customIds` widens the name filter to the user's own patterns, exactly as
 * `useBreathingSessions` does, and rides the query key so a pattern created mid-session
 * refetches rather than serving a list that silently excludes it.
 */
export function useBreathingSessionPages(userId: string | null, customIds: string[] = []) {
  const names = [...breathingSlugs, ...customIds];
  return useInfiniteQuery({
    queryKey: userId
      ? [...breathingKeys.historyPages(userId), customIds.join(",")]
      : ["breathing", "historyPages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listMindfulnessSessionsByNamesPage(userId!, names, BREATHING_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: 0,
    // A short page is the end of the data. A full one may or may not be, so ask again:
    // one empty round trip at the exact boundary beats stopping early and calling a
    // truncated list "all sessions".
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < BREATHING_HISTORY_PAGE_SIZE
        ? undefined
        : lastPageParam + BREATHING_HISTORY_PAGE_SIZE,
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

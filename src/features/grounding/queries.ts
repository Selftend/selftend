import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMindfulnessSessionsByNames,
  listMindfulnessSessionsByNames,
  listMindfulnessSessionsByNamesPage,
  saveMindfulnessSession,
} from "@/src/features/mindfulness/repository";
import type { MindfulnessSessionInput } from "@/src/features/mindfulness/types";
import { groundingSlugs } from "@/src/constants/grounding";
import { invalidateRecordDays } from "@/src/features/progress/queries";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";

export const GROUNDING_HISTORY_PAGE_SIZE = 20;

const groundingKeys = {
  list: (userId: string) => ["grounding", "list", userId] as const,
  count: (userId: string) => ["grounding", "count", userId] as const,
  historyPages: (userId: string) => ["grounding", "historyPages", userId] as const,
};

export function useGroundingSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? [...groundingKeys.list(userId), limit] : ["grounding", "list", "anonymous"],
    // Filter by exercise type at the DB level so `limit` applies AFTER the type filter
    // (see useBreathingSessions) - a pre-filter limit could hide every grounding session.
    queryFn: () => listMindfulnessSessionsByNames(userId!, [...groundingSlugs], limit),
    enabled: Boolean(userId),
  });
}

export function useGroundingSessionPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId
      ? groundingKeys.historyPages(userId)
      : ["grounding", "historyPages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listMindfulnessSessionsByNamesPage(
        userId!,
        [...groundingSlugs],
        GROUNDING_HISTORY_PAGE_SIZE,
        pageParam,
      ),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < GROUNDING_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (session) => session.completedAt),
    enabled: Boolean(userId),
  });
}

export function useGroundingSessionCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? groundingKeys.count(userId) : ["grounding", "count", "anonymous"],
    queryFn: () => countMindfulnessSessionsByNames(userId!, [...groundingSlugs]),
    enabled: Boolean(userId),
  });
}

export function useSaveGroundingSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MindfulnessSessionInput) => saveMindfulnessSession(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("grounding");
      if (!userId) return;
      // Shares the mindfulness_sessions table with breathing/mindfulness - refresh all three.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["breathing"] }),
        queryClient.invalidateQueries({ queryKey: ["grounding"] }),
        queryClient.invalidateQueries({ queryKey: ["mindfulness"] }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

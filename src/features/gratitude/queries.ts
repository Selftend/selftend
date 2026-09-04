import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countGratitudeEntries,
  countFavoriteGratitudeEntries,
  countGratitudeEntriesSinceDayKey,
  deleteGratitudeEntry,
  getGratitudeEntry,
  listFavoriteGratitudeEntries,
  listGratitudeEntries,
  listGratitudeEntriesPage,
  saveGratitudeEntry,
  setGratitudeEntryStarred,
} from "@/src/features/gratitude/repository";
import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { recordDaysKeys, useInvalidateRecordDays } from "@/src/features/progress/queries";

export const GRATITUDE_HISTORY_PAGE_SIZE = 20;

const gratitudeKeys = {
  all: ["gratitude"] as const,
  list: (userId: string, limit: number) => ["gratitude", "list", userId, limit] as const,
  favorites: (userId: string, limit: number) => ["gratitude", "favorites", userId, limit] as const,
  detail: (userId: string, id: string) => ["gratitude", "detail", userId, id] as const,
  count: (userId: string) => ["gratitude", "count", userId] as const,
  favoriteCount: (userId: string) => ["gratitude", "favorite-count", userId] as const,
  historyPages: (userId: string) => ["gratitude", "history-pages", userId] as const,
  countSinceDayKey: (userId: string, sinceDayKey: string) =>
    ["gratitude", "count-since-day", userId, sinceDayKey] as const,
};

export function useGratitudeEntries(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: userId
      ? gratitudeKeys.list(userId, limit)
      : ["gratitude", "list", "anonymous", limit],
    queryFn: () => listGratitudeEntries(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useGratitudeEntryPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId
      ? gratitudeKeys.historyPages(userId)
      : ["gratitude", "history-pages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listGratitudeEntriesPage(userId!, GRATITUDE_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < GRATITUDE_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (entry) => entry.loggedAt),
    enabled: Boolean(userId),
  });
}

export function useGratitudeEntry(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id
        ? gratitudeKeys.detail(userId, id)
        : ["gratitude", "detail", "anonymous", id ?? ""],
    queryFn: () => getGratitudeEntry(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useGratitudeEntryCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? gratitudeKeys.count(userId) : ["gratitude", "count", "anonymous"],
    queryFn: () => countGratitudeEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useFavoriteGratitudeEntryCount(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? gratitudeKeys.favoriteCount(userId)
      : ["gratitude", "favorite-count", "anonymous"],
    queryFn: () => countFavoriteGratitudeEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useGratitudeEntryCountSinceDayKey(userId: string | null, sinceDayKey: string) {
  return useQuery({
    queryKey: userId
      ? gratitudeKeys.countSinceDayKey(userId, sinceDayKey)
      : ["gratitude", "count-since-day", "anonymous", sinceDayKey],
    queryFn: () => countGratitudeEntriesSinceDayKey(userId!, sinceDayKey),
    enabled: Boolean(userId),
  });
}

export function useFavoriteGratitudeEntries(userId: string | null, limit = 100) {
  return useQuery({
    queryKey: userId
      ? gratitudeKeys.favorites(userId, limit)
      : ["gratitude", "favorites", "anonymous", limit],
    queryFn: () => listFavoriteGratitudeEntries(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveGratitudeEntry(userId: string | null) {
  const queryClient = useQueryClient();
  const invalidateRecordDays = useInvalidateRecordDays();
  return useMutation({
    mutationFn: ({ input, entryId }: { input: GratitudeInput; entryId?: string }) =>
      saveGratitudeEntry(userId!, input, entryId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { entryId }) => {
      if (!entryId) requestReminderPrompt("gratitude");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: gratitudeKeys.all });
      await invalidateRecordDays();
    },
  });
}

export function useDeleteGratitudeEntry(userId: string | null) {
  return useDeleteMutation(userId, deleteGratitudeEntry, gratitudeKeys.all, recordDaysKeys.all);
}

export function useSetGratitudeEntryStarred(userId: string | null) {
  const queryClient = useQueryClient();
  const invalidateRecordDays = useInvalidateRecordDays();
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      setGratitudeEntryStarred(userId!, id, starred),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    // Patch the updated row into the cached lists/detail instead of invalidating the whole
    // ["gratitude"] prefix - a one-tap star otherwise refired every mounted gratitude query,
    // including the 500-row Home widget fetch. Only favorites (whose membership actually
    // changed) is invalidated.
    onSuccess: (updated) => {
      if (!userId) return;
      queryClient.setQueriesData<GratitudeEntry[]>(
        { queryKey: ["gratitude", "list", userId] },
        (old) => old?.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      queryClient.setQueryData(gratitudeKeys.detail(userId, updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["gratitude", "favorites", userId] });
      void queryClient.invalidateQueries({ queryKey: gratitudeKeys.historyPages(userId) });
      void queryClient.invalidateQueries({ queryKey: gratitudeKeys.favoriteCount(userId) });
      // Starring cannot move a day, but it does write `gratitude_entries`, and
      // the rule is mechanical on purpose: any write to a source table
      // invalidates. One cheap RPC beats a per-mutation judgement that rots.
      void invalidateRecordDays();
    },
  });
}

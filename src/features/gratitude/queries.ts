import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countGratitudeEntries,
  countGratitudeEntriesSince,
  deleteGratitudeEntry,
  getGratitudeEntry,
  listFavoriteGratitudeEntries,
  listGratitudeEntries,
  saveGratitudeEntry,
  setGratitudeEntryStarred,
} from "@/src/features/gratitude/repository";
import type { GratitudeEntry, GratitudeInput } from "@/src/features/gratitude/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

const gratitudeKeys = {
  all: ["gratitude"] as const,
  list: (userId: string, limit: number) => ["gratitude", "list", userId, limit] as const,
  favorites: (userId: string, limit: number) => ["gratitude", "favorites", userId, limit] as const,
  detail: (userId: string, id: string) => ["gratitude", "detail", userId, id] as const,
  count: (userId: string) => ["gratitude", "count", userId] as const,
  countSince: (userId: string, sinceIso: string) =>
    ["gratitude", "count-since", userId, sinceIso] as const,
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

export function useGratitudeEntryCountSince(userId: string | null, sinceIso: string) {
  return useQuery({
    queryKey: userId
      ? gratitudeKeys.countSince(userId, sinceIso)
      : ["gratitude", "count-since", "anonymous", sinceIso],
    queryFn: () => countGratitudeEntriesSince(userId!, sinceIso),
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
  return useMutation({
    mutationFn: ({ input, entryId }: { input: GratitudeInput; entryId?: string }) =>
      saveGratitudeEntry(userId!, input, entryId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: gratitudeKeys.all });
    },
  });
}

export function useDeleteGratitudeEntry(userId: string | null) {
  return useDeleteMutation(userId, deleteGratitudeEntry, gratitudeKeys.all);
}

export function useSetGratitudeEntryStarred(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      setGratitudeEntryStarred(userId!, id, starred),
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
    },
  });
}

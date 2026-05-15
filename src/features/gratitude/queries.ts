import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteGratitudeEntry,
  getGratitudeEntry,
  listGratitudeEntries,
  saveGratitudeEntry,
} from "@/src/features/gratitude/repository";
import type { GratitudeInput } from "@/src/features/gratitude/types";

const gratitudeKeys = {
  all: ["gratitude"] as const,
  list: (userId: string, limit: number) => ["gratitude", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["gratitude", "detail", userId, id] as const,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGratitudeEntry(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: gratitudeKeys.all });
    },
  });
}

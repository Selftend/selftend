import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteWorryEntry,
  getWorryEntry,
  listWorryEntries,
  saveWorryEntry,
  toggleWorryResolved,
} from "@/src/features/worry/repository";
import type { WorryEntryInput } from "@/src/features/worry/types";

const worryKeys = {
  all: ["worry"] as const,
  list: (userId: string) => ["worry", "list", userId] as const,
  detail: (userId: string, entryId: string) => ["worry", "detail", userId, entryId] as const,
};

export function useWorryEntries(userId: string | null) {
  return useQuery({
    queryKey: userId ? worryKeys.list(userId) : ["worry", "list", "anonymous"],
    queryFn: () => listWorryEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useWorryEntry(userId: string | null, entryId: string | null) {
  return useQuery({
    queryKey:
      userId && entryId ? worryKeys.detail(userId, entryId) : ["worry", "detail", "anonymous"],
    queryFn: () => getWorryEntry(userId!, entryId!),
    enabled: Boolean(userId && entryId),
  });
}

export function useSaveWorryEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, entryId }: { input: WorryEntryInput; entryId?: string }) =>
      saveWorryEntry(userId!, input, entryId),
    onSuccess: async (entry) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worryKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: worryKeys.detail(userId, entry.id) }),
      ]);
    },
  });
}

export function useDeleteWorryEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deleteWorryEntry(userId!, entryId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: worryKeys.list(userId) });
    },
  });
}

export function useToggleWorryResolved(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, resolved }: { entryId: string; resolved: boolean }) =>
      toggleWorryResolved(userId!, entryId, resolved),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: worryKeys.list(userId) });
    },
  });
}

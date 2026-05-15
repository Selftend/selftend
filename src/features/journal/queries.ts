import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteJournalEntry,
  getJournalEntry,
  listJournalEntries,
  saveJournalEntry,
} from "@/src/features/journal/repository";
import type { JournalInput } from "@/src/features/journal/types";

const journalKeys = {
  all: ["journal"] as const,
  list: (userId: string, limit: number) => ["journal", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["journal", "detail", userId, id] as const,
};

export function useJournalEntries(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: userId ? journalKeys.list(userId, limit) : ["journal", "list", "anonymous", limit],
    queryFn: () => listJournalEntries(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useJournalEntry(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? journalKeys.detail(userId, id) : ["journal", "detail", "anonymous", id ?? ""],
    queryFn: () => getJournalEntry(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useSaveJournalEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, entryId }: { input: JournalInput; entryId?: string }) =>
      saveJournalEntry(userId!, input, entryId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

export function useDeleteJournalEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJournalEntry(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
}

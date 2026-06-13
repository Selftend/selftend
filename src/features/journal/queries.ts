import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countJournalEntries,
  countJournalEntriesSince,
  deleteJournalEntry,
  getJournalEntry,
  listJournalEntries,
  saveJournalEntry,
} from "@/src/features/journal/repository";
import type { JournalInput } from "@/src/features/journal/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

const journalKeys = {
  all: ["journal"] as const,
  list: (userId: string, limit: number) => ["journal", "list", userId, limit] as const,
  detail: (userId: string, id: string) => ["journal", "detail", userId, id] as const,
  count: (userId: string) => ["journal", "count", userId] as const,
  countSince: (userId: string, sinceIso: string) =>
    ["journal", "count-since", userId, sinceIso] as const,
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

export function useJournalEntryCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? journalKeys.count(userId) : ["journal", "count", "anonymous"],
    queryFn: () => countJournalEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useJournalEntryCountSince(userId: string | null, sinceIso: string) {
  return useQuery({
    queryKey: userId
      ? journalKeys.countSince(userId, sinceIso)
      : ["journal", "count-since", "anonymous", sinceIso],
    queryFn: () => countJournalEntriesSince(userId!, sinceIso),
    enabled: Boolean(userId),
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
  return useDeleteMutation(userId, deleteJournalEntry, journalKeys.all);
}

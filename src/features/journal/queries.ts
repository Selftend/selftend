import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countJournalEntries,
  countJournalEntriesSince,
  deleteJournalEntry,
  getJournalEntry,
  listJournalEntries,
  listJournalEntriesPage,
  listJournalWritingBuckets,
  saveJournalEntry,
  sumJournalWords,
} from "@/src/features/journal/repository";
import type { JournalInput, JournalWritingRange } from "@/src/features/journal/types";
import { deviceTimeZone } from "@/src/utils/date";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { recordDaysKeys, useInvalidateRecordDays } from "@/src/features/progress/queries";

const journalKeys = {
  all: ["journal"] as const,
  list: (userId: string, limit: number) => ["journal", "list", userId, limit] as const,
  pages: (userId: string) => ["journal", "pages", userId] as const,
  detail: (userId: string, id: string) => ["journal", "detail", userId, id] as const,
  count: (userId: string) => ["journal", "count", userId] as const,
  wordTotal: (userId: string) => ["journal", "word-total", userId] as const,
  writingBuckets: (userId: string, timeZone: string, range: JournalWritingRange) =>
    ["journal", "writing-buckets", userId, timeZone, range] as const,
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

export const JOURNAL_ENTRIES_PAGE_SIZE = 50;

export function useJournalEntryPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId ? journalKeys.pages(userId) : ["journal", "pages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listJournalEntriesPage(userId!, JOURNAL_ENTRIES_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < JOURNAL_ENTRIES_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (entry) => entry.occurredAt ?? entry.createdAt),
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

// The RPC counts the signed-in user's own entries via auth.uid(), so it takes no argument;
// `userId` only gates and scopes the cache, exactly as it does for the sibling count hooks.
export function useJournalWordTotal(userId: string | null) {
  return useQuery({
    queryKey: userId ? journalKeys.wordTotal(userId) : ["journal", "word-total", "anonymous"],
    queryFn: sumJournalWords,
    enabled: Boolean(userId),
  });
}

export function useJournalWritingBuckets(userId: string | null, range: JournalWritingRange) {
  const timeZone = deviceTimeZone();
  return useQuery({
    queryKey: userId
      ? journalKeys.writingBuckets(userId, timeZone, range)
      : ["journal", "writing-buckets", "anonymous", timeZone, range],
    queryFn: () => listJournalWritingBuckets(timeZone, range),
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
  const invalidateRecordDays = useInvalidateRecordDays();
  return useMutation({
    mutationFn: ({ input, entryId }: { input: JournalInput; entryId?: string }) =>
      saveJournalEntry(userId!, input, entryId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { entryId }) => {
      if (!entryId) requestReminderPrompt("journal");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: journalKeys.all });
      await invalidateRecordDays();
    },
  });
}

export function useDeleteJournalEntry(userId: string | null) {
  return useDeleteMutation(userId, deleteJournalEntry, journalKeys.all, recordDaysKeys.all);
}

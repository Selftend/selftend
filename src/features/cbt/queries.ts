import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveThoughtRecord,
  countThoughtRecords,
  countThoughtRecordsSince,
  getLatestThoughtRecordAt,
  getThoughtRecord,
  listThoughtRecords,
  saveThoughtRecord,
} from "@/src/features/cbt/repository";
import type { ThoughtRecordInput } from "@/src/features/cbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const cbtKeys = {
  all: ["cbt"] as const,
  record: (userId: string, recordId: string) => ["cbt", "record", userId, recordId] as const,
  records: (userId: string) => ["cbt", "records", userId] as const,
  // Nested under the records prefix so the save/archive invalidations reach it too.
  latestRecord: (userId: string) => ["cbt", "records", userId, "latest"] as const,
  countSince: (userId: string, sinceIso: string) =>
    ["cbt", "count-since", userId, sinceIso] as const,
  count: (userId: string) => ["cbt", "count", userId] as const,
};

export function useThoughtRecords(userId: string | null) {
  return useQuery({
    queryKey: userId ? cbtKeys.records(userId) : ["cbt", "records", "anonymous"],
    queryFn: () => listThoughtRecords(userId!),
    enabled: Boolean(userId),
  });
}

export function useThoughtRecord(userId: string | null, recordId: string | null) {
  return useQuery({
    queryKey:
      userId && recordId ? cbtKeys.record(userId, recordId) : ["cbt", "record", "anonymous"],
    queryFn: () => getThoughtRecord(userId!, recordId!),
    enabled: Boolean(userId && recordId),
  });
}

/** Home's `Last {{when}}` clause - one row instead of the 500-row list (#990). */
export function useLatestThoughtRecordAt(userId: string | null) {
  return useQuery({
    queryKey: userId ? cbtKeys.latestRecord(userId) : ["cbt", "records", "anonymous", "latest"],
    queryFn: () => getLatestThoughtRecordAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useThoughtRecordCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? cbtKeys.count(userId) : ["cbt", "count", "anonymous"],
    queryFn: () => countThoughtRecords(userId!),
    enabled: Boolean(userId),
  });
}

export function useThoughtRecordCountSince(userId: string | null, sinceIso: string) {
  return useQuery({
    queryKey: userId
      ? cbtKeys.countSince(userId, sinceIso)
      : ["cbt", "count-since", "anonymous", sinceIso],
    queryFn: () => countThoughtRecordsSince(userId!, sinceIso),
    enabled: Boolean(userId),
  });
}

export function useSaveThoughtRecord(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, recordId }: { input: ThoughtRecordInput; recordId?: string }) =>
      saveThoughtRecord(userId!, input, recordId),
    onSuccess: async (record, { recordId }) => {
      if (!recordId) requestReminderPrompt("cbt");
      if (!userId) {
        return;
      }

      // Prime the single-record cache with the saved record so the post-save
      // closing-moment screen (thought-record-saved-screen) reads it instantly
      // instead of flashing a LoadingState while it re-fetches. The record query
      // is disabled on the new-record form, so without this the cache is empty.
      queryClient.setQueryData(cbtKeys.record(userId, record.id), record);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cbtKeys.records(userId) }),
        queryClient.invalidateQueries({ queryKey: cbtKeys.record(userId, record.id) }),
        // The count sits on its own root, so the `records` prefix above never reached it
        // and Home's `N records` clause stayed stale until a remount (found in #990).
        queryClient.invalidateQueries({ queryKey: cbtKeys.count(userId) }),
      ]);
    },
  });
}

export function useArchiveThoughtRecord(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => archiveThoughtRecord(userId!, recordId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cbtKeys.records(userId) }),
        queryClient.invalidateQueries({ queryKey: cbtKeys.count(userId) }),
      ]);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveThoughtRecord,
  getThoughtRecord,
  listThoughtRecords,
  saveThoughtRecord,
} from "@/src/features/cbt/repository";
import type { ThoughtRecordInput } from "@/src/features/cbt/types";

const cbtKeys = {
  all: ["cbt"] as const,
  record: (userId: string, recordId: string) => ["cbt", "record", userId, recordId] as const,
  records: (userId: string) => ["cbt", "records", userId] as const,
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
    queryKey: userId && recordId ? cbtKeys.record(userId, recordId) : ["cbt", "record", "anonymous"],
    queryFn: () => getThoughtRecord(userId!, recordId!),
    enabled: Boolean(userId && recordId),
  });
}

export function useSaveThoughtRecord(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, recordId }: { input: ThoughtRecordInput; recordId?: string }) =>
      saveThoughtRecord(userId!, input, recordId),
    onSuccess: async (record) => {
      if (!userId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cbtKeys.records(userId) }),
        queryClient.invalidateQueries({ queryKey: cbtKeys.record(userId, record.id) }),
      ]);
    },
  });
}

export function useArchiveThoughtRecord(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => archiveThoughtRecord(userId!, recordId),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: cbtKeys.records(userId) });
    },
  });
}

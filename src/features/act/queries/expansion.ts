import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteExpansionLog,
  getExpansionLog,
  listExpansionLogs,
  saveExpansionLog,
} from "@/src/features/act/repository";
import type { ExpansionLogInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { actKeys } from "./keys";

export function useExpansionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...actKeys.expansionList(userId), limit],
    queryFn: () => listExpansionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useExpansionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.expansionDetail(userId, logId),
    queryFn: () => getExpansionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveExpansionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpansionLogInput) => saveExpansionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.expansionList(userId) });
    },
  });
}

export function useDeleteExpansionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteExpansionLog, actKeys.expansionList(userId));
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteExpansionLog,
  getExpansionLog,
  getLatestExpansionLogAt,
  listExpansionLogs,
  saveExpansionLog,
} from "@/src/features/act/repository";
import type { ExpansionLogInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useExpansionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...actKeys.expansionList(userId), limit],
    queryFn: () => listExpansionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestExpansionLogAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.expansionLatest(userId),
    queryFn: () => getLatestExpansionLogAt(userId!),
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
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.expansionList(userId) });
    },
  });
}

export function useDeleteExpansionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteExpansionLog, actKeys.expansionList(userId));
}

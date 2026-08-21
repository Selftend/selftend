import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countDefusionLogs,
  deleteDefusionLog,
  getDefusionLog,
  getLatestDefusionLogAt,
  listDefusionLogs,
  saveDefusionLog,
} from "@/src/features/act/repository";
import type { DefusionLogInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useDefusionLogs(userId: string | null, limit = 30) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry; the limit-less
    // prefix in actKeys.defusionList still matches every variant on invalidation.
    queryKey: [...actKeys.defusionList(userId), limit],
    queryFn: () => listDefusionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * ACT home's "N thoughts unhooked" stat - an exact head count (#1378).
 *
 * ☠️ Never `useDefusionLogs(userId, 50).data?.length`. ACT home asks for 50 rows, so a
 * length read would tell a user with 60 logs that they had 50.
 */
export function useDefusionLogCount(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionCount(userId),
    queryFn: () => countDefusionLogs(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestDefusionLogAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionLatest(userId),
    queryFn: () => getLatestDefusionLogAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useDefusionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionDetail(userId, logId),
    queryFn: () => getDefusionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveDefusionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DefusionLogInput) => saveDefusionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.defusionList(userId) });
    },
  });
}

export function useDeleteDefusionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteDefusionLog, actKeys.defusionList(userId));
}

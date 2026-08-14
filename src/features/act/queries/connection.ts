import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteConnectionLog,
  getConnectionLog,
  getLatestConnectionLogAt,
  listConnectionLogs,
  saveConnectionLog,
} from "@/src/features/act/repository";
import type { ConnectionLogInput, ConnectionTechnique } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useConnectionLogs(userId: string | null, limit = 30) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry (routines
    // fetch a 250-row strip window, PR #124 review); the limit-less prefix in
    // actKeys.connectionList still matches every variant on invalidation.
    queryKey: [...actKeys.connectionList(userId), limit],
    queryFn: () => listConnectionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Home's drop-anchor row - one row, filtered in SQL, instead of the 30-row list (#990).
 * The technique rides the query key so each filter gets its own entry.
 */
export function useLatestConnectionLogAt(userId: string | null, technique: ConnectionTechnique) {
  return useQuery({
    queryKey: actKeys.connectionLatest(userId, technique),
    queryFn: () => getLatestConnectionLogAt(userId!, technique),
    enabled: Boolean(userId),
  });
}

export function useConnectionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.connectionDetail(userId, logId),
    queryFn: () => getConnectionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveConnectionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectionLogInput) => saveConnectionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.connectionList(userId) });
    },
  });
}

export function useDeleteConnectionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteConnectionLog, actKeys.connectionList(userId));
}

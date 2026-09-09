import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getLatestSelfCareLogAt,
  getSelfCareLog,
  listSelfCareLogs,
  upsertSelfCareLog,
} from "@/src/features/self-care/repository";
import type { SelfCareLogInput } from "@/src/features/self-care/types";
import { invalidateRecordDays } from "@/src/features/progress/queries";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const selfCareKeys = {
  all: ["self-care"] as const,
  list: (userId: string) => ["self-care", "list", userId] as const,
  // Nested under the list prefix so the upsert invalidation below reaches it too.
  latest: (userId: string) => ["self-care", "list", userId, "latest"] as const,
  detail: (userId: string, logDate: string) => ["self-care", "detail", userId, logDate] as const,
};

export function useSelfCareLog(userId: string | null, logDate: string | null) {
  return useQuery({
    queryKey:
      userId && logDate
        ? selfCareKeys.detail(userId, logDate)
        : ["self-care", "detail", "anonymous"],
    queryFn: () => getSelfCareLog(userId!, logDate!),
    enabled: Boolean(userId && logDate),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 14-row list (#990). */
export function useLatestSelfCareLogAt(userId: string | null) {
  return useQuery({
    queryKey: userId ? selfCareKeys.latest(userId) : ["self-care", "list", "anonymous", "latest"],
    queryFn: () => getLatestSelfCareLogAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useSelfCareLogs(userId: string | null) {
  return useQuery({
    queryKey: userId ? selfCareKeys.list(userId) : ["self-care", "list", "anonymous"],
    queryFn: () => listSelfCareLogs(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpsertSelfCareLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SelfCareLogInput) => upsertSelfCareLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (log) => {
      // The upsert merges on (user_id, log_date); only a fresh insert (audit
      // timestamps identical) is a completion, re-saving today's log is an edit.
      if (log.createdAt === log.updatedAt) requestReminderPrompt("cbt");
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: selfCareKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: selfCareKeys.detail(userId, log.logDate) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

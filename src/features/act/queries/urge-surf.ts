import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listUrgeSurfLogs, saveUrgeSurfLog } from "@/src/features/act/repository";
import type { UrgeSurfLogInput } from "@/src/features/act/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useUrgeSurfLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: [...actKeys.urgeSurfList(userId), limit],
    queryFn: () => listUrgeSurfLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveUrgeSurfLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UrgeSurfLogInput) => saveUrgeSurfLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.urgeSurfList(userId) });
    },
  });
}

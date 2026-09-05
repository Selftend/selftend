import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { countDbtSessions, listDbtSessions, saveDbtSession } from "@/src/features/dbt/repository";
import type { DbtSessionInput } from "@/src/features/dbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { invalidateRecordDays } from "@/src/features/progress/queries";
import { dbtKeys } from "./keys";

/** Newest first - the programme's read (#1990). No sessions list route exists. */
export function useDbtSessions(userId: string | null, limit = 100) {
  return useQuery({
    queryKey: [...dbtKeys.sessionList(userId), limit],
    queryFn: () => listDbtSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

/** The module home's `N sessions` - an exact head count, never `list.length`. */
export function useDbtSessionCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.sessionCount(userId),
    queryFn: () => countDbtSessions(userId!),
    enabled: Boolean(userId),
  });
}

/** Called on completion only (#1986) - Stop never reaches here. */
export function useSaveDbtSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DbtSessionInput) => saveDbtSession(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      // The once-ever reminder offer rides any DBT save (spec §4). The store
      // decides whether to show it and the shipped eligibility gates it; this
      // only reports that a save happened.
      requestReminderPrompt("dbt");
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.sessionList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

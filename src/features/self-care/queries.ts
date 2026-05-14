import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSelfCareLog,
  listSelfCareLogs,
  upsertSelfCareLog,
} from "@/src/features/self-care/repository";
import type { SelfCareLogInput } from "@/src/features/self-care/types";

const selfCareKeys = {
  all: ["self-care"] as const,
  list: (userId: string) => ["self-care", "list", userId] as const,
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
    onSuccess: async (log) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: selfCareKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: selfCareKeys.detail(userId, log.logDate) }),
      ]);
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteConnectionLog,
  getConnectionLog,
  listConnectionLogs,
  saveConnectionLog,
} from "@/src/features/act/repository";
import type { ConnectionLogInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { actKeys } from "./keys";

export function useConnectionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: actKeys.connectionList(userId),
    queryFn: () => listConnectionLogs(userId!, limit),
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
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.connectionList(userId) });
    },
  });
}

export function useDeleteConnectionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteConnectionLog, actKeys.connectionList(userId));
}

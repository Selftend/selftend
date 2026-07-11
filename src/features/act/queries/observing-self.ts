import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteObservingSelfSession,
  getObservingSelfSession,
  listObservingSelfSessions,
  saveObservingSelfSession,
} from "@/src/features/act/repository";
import type { ObservingSelfSessionInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { actKeys } from "./keys";

export function useObservingSelfSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: actKeys.observingList(userId),
    queryFn: () => listObservingSelfSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useObservingSelfSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: actKeys.observingDetail(userId, sessionId),
    queryFn: () => getObservingSelfSession(userId!, sessionId!),
    enabled: Boolean(userId) && Boolean(sessionId),
  });
}

export function useSaveObservingSelfSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ObservingSelfSessionInput) => saveObservingSelfSession(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.observingList(userId) });
    },
  });
}

export function useDeleteObservingSelfSession(userId: string | null) {
  return useDeleteMutation(userId, deleteObservingSelfSession, actKeys.observingList(userId));
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteChoicePoint,
  getChoicePoint,
  listChoicePoints,
  saveChoicePoint,
} from "@/src/features/act/repository";
import type { ChoicePointInput } from "@/src/features/act/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useChoicePoints(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: actKeys.choicePointList(userId),
    queryFn: () => listChoicePoints(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useChoicePoint(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointDetail(userId, id),
    queryFn: () => getChoicePoint(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveChoicePoint(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChoicePointInput) => saveChoicePoint(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.choicePointList(userId) });
    },
  });
}

export function useDeleteChoicePoint(userId: string | null) {
  return useDeleteMutation(userId, deleteChoicePoint, actKeys.choicePointList(userId));
}

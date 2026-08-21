import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countChoicePoints,
  deleteChoicePoint,
  getChoicePoint,
  getLatestChoicePointAt,
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

/**
 * ACT home's "N choice points mapped" stat - an exact head count (#1378).
 *
 * ☠️ Never `useChoicePoints(userId).data?.length`. This hook's list sibling leaves its
 * `limit` out of its query key, so home shares one cache entry with the list screen's
 * 30 and a length read renders 30 for every user past their thirtieth.
 */
export function useChoicePointCount(userId: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointCount(userId),
    queryFn: () => countChoicePoints(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestChoicePointAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.choicePointLatest(userId),
    queryFn: () => getLatestChoicePointAt(userId!),
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

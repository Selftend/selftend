import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countCommittedActions,
  deleteCommittedAction,
  getCommittedAction,
  listCommittedActions,
  saveCommittedAction,
  updateCommittedAction,
} from "@/src/features/act/repository";
import type {
  ActionStatus,
  CommittedActionInput,
  CommittedActionPatch,
} from "@/src/features/act/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { actKeys } from "./keys";

export function useCommittedActions(userId: string | null, status?: ActionStatus) {
  return useQuery({
    queryKey: actKeys.committedActionList(userId, status),
    queryFn: () => listCommittedActions(userId!, status),
    enabled: Boolean(userId),
  });
}

/**
 * Home's `N active` row - an exact count instead of an uncapped list read (#990).
 * The status rides the key, so each filter is its own entry under the list prefix
 * every committed-action mutation already invalidates.
 */
export function useCommittedActionCount(userId: string | null, status: ActionStatus) {
  return useQuery({
    queryKey: actKeys.committedActionCount(userId, status),
    queryFn: () => countCommittedActions(userId!, status),
    enabled: Boolean(userId),
  });
}

export function useCommittedAction(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey: actKeys.committedActionDetail(userId, actionId),
    queryFn: () => getCommittedAction(userId!, actionId!),
    enabled: Boolean(userId) && Boolean(actionId),
  });
}

export function useSaveCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommittedActionInput) => saveCommittedAction(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
    },
  });
}

export function useUpdateCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, patch }: { actionId: string; patch: CommittedActionPatch }) =>
      updateCommittedAction(userId!, actionId, patch),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
      await queryClient.invalidateQueries({
        queryKey: actKeys.committedActionDetail(userId, data.id),
      });
    },
  });
}

export function useDeleteCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => deleteCommittedAction(userId!, actionId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
    },
  });
}

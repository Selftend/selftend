import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeActivity,
  getActivity,
  listActivities,
  saveActivity,
} from "@/src/features/activities/repository";
import type { ActivityInput } from "@/src/features/activities/types";

const activityKeys = {
  all: ["activities"] as const,
  list: (userId: string) => ["activities", "list", userId] as const,
  detail: (userId: string, activityId: string) =>
    ["activities", "detail", userId, activityId] as const,
};

export function useActivities(userId: string | null) {
  return useQuery({
    queryKey: userId ? activityKeys.list(userId) : ["activities", "list", "anonymous"],
    queryFn: () => listActivities(userId!),
    enabled: Boolean(userId),
  });
}

export function useActivity(userId: string | null, activityId: string | null) {
  return useQuery({
    queryKey:
      userId && activityId
        ? activityKeys.detail(userId, activityId)
        : ["activities", "detail", "anonymous"],
    queryFn: () => getActivity(userId!, activityId!),
    enabled: Boolean(userId && activityId),
  });
}

export function useSaveActivity(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, activityId }: { input: ActivityInput; activityId?: string }) =>
      saveActivity(userId!, input, activityId),
    onSuccess: async (activity) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activityKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: activityKeys.detail(userId, activity.id) }),
      ]);
    },
  });
}

export function useCompleteActivity(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, moodAfter }: { activityId: string; moodAfter: number | null }) =>
      completeActivity(userId!, activityId, moodAfter),
    onSuccess: async (activity) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activityKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: activityKeys.detail(userId, activity.id) }),
      ]);
    },
  });
}

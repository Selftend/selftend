import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeActivity,
  getActivity,
  getLatestCompletedActivityAt,
  listActivities,
  listRecentCompletedActivities,
  saveActivity,
} from "@/src/features/activities/repository";
import type { ActivityInput } from "@/src/features/activities/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const activityKeys = {
  list: (userId: string) => ["activities", "list", userId] as const,
  // Nested under the list prefix so the existing save/complete invalidations
  // refresh it too; the limit rides in the key so differently-sized windows
  // never collide on one cache entry.
  recentCompleted: (userId: string, limit: number) =>
    ["activities", "list", userId, "recent-completed", limit] as const,
  latestCompleted: (userId: string) => ["activities", "list", userId, "latest-completed"] as const,
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

/**
 * Newest completed activities by completed_at - feeds the routines derive
 * engine ("activity completed on day X"), which the scheduled_at-ordered
 * 500-row default list cannot answer reliably (PR #124 review).
 */
export function useRecentCompletedActivities(userId: string | null, limit = 250) {
  return useQuery({
    queryKey: userId
      ? activityKeys.recentCompleted(userId, limit)
      : ["activities", "list", "anonymous", "recent-completed"],
    queryFn: () => listRecentCompletedActivities(userId!, limit),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 500-row list (#990). */
export function useLatestCompletedActivityAt(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? activityKeys.latestCompleted(userId)
      : ["activities", "list", "anonymous", "latest-completed"],
    queryFn: () => getLatestCompletedActivityAt(userId!),
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
    onSuccess: async (activity, { activityId }) => {
      if (!activityId) requestReminderPrompt("cbt");
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (activity) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activityKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: activityKeys.detail(userId, activity.id) }),
      ]);
    },
  });
}

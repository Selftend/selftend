import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeMilestone,
  countActiveGoals,
  deleteMilestonesForGoal,
  getGoal,
  listGoals,
  listMilestones,
  saveMilestones,
  saveGoal,
  uncompleteMilestone,
  updateGoalStatus,
} from "@/src/features/goals/repository";
import type { GoalInput, GoalStatus, MilestoneInput } from "@/src/features/goals/types";

const goalKeys = {
  all: ["goals"] as const,
  list: (userId: string) => ["goals", "list", userId] as const,
  // Nested under the list prefix so the save invalidation reaches it; the status update
  // invalidates `goalKeys.all`, which covers it either way.
  activeCount: (userId: string) => ["goals", "list", userId, "active-count"] as const,
  detail: (userId: string, goalId: string) => ["goals", "detail", userId, goalId] as const,
  milestones: (userId: string, goalId: string) => ["goals", "milestones", userId, goalId] as const,
};

export function useGoals(userId: string | null) {
  return useQuery({
    queryKey: userId ? goalKeys.list(userId) : ["goals", "list", "anonymous"],
    queryFn: () => listGoals(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `N active goals` row - an exact count instead of the 500-row list (#990). */
export function useActiveGoalCount(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? goalKeys.activeCount(userId)
      : ["goals", "list", "anonymous", "active-count"],
    queryFn: () => countActiveGoals(userId!),
    enabled: Boolean(userId),
  });
}

export function useGoal(userId: string | null, goalId: string | null) {
  return useQuery({
    queryKey: userId && goalId ? goalKeys.detail(userId, goalId) : ["goals", "detail", "anonymous"],
    queryFn: () => getGoal(userId!, goalId!),
    enabled: Boolean(userId && goalId),
  });
}

export function useMilestones(userId: string | null, goalId: string | null) {
  return useQuery({
    queryKey:
      userId && goalId ? goalKeys.milestones(userId, goalId) : ["goals", "milestones", "anonymous"],
    queryFn: () => listMilestones(userId!, goalId!),
    enabled: Boolean(userId && goalId),
  });
}

export function useSaveGoal(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      goalId,
      milestones,
    }: {
      input: GoalInput;
      goalId?: string;
      milestones: MilestoneInput[];
    }) => {
      const goal = await saveGoal(userId!, input, goalId);
      if (goalId) {
        await deleteMilestonesForGoal(userId!, goalId);
      }
      await saveMilestones(userId!, goal.id, milestones);
      return goal;
    },
    meta: { suppressGlobalErrorToast: true }, // wizard shows its own save-error toast
    onSuccess: async (goal) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalKeys.list(userId) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.detail(userId, goal.id) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.milestones(userId, goal.id) }),
      ]);
    },
  });
}

export function useUpdateGoalStatus(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, status }: { goalId: string; status: GoalStatus }) =>
      updateGoalStatus(userId!, goalId, status),
    meta: { suppressGlobalErrorToast: true }, // detail screen shows its own error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useToggleMilestone(userId: string | null, goalId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, completed }: { milestoneId: string; completed: boolean }) =>
      completed
        ? completeMilestone(userId!, milestoneId)
        : uncompleteMilestone(userId!, milestoneId),
    meta: { suppressGlobalErrorToast: true }, // detail screen shows its own error toast
    onSuccess: async () => {
      if (!userId || !goalId) return;
      await queryClient.invalidateQueries({ queryKey: goalKeys.milestones(userId, goalId) });
    },
  });
}

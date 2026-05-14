import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTask,
  listSteps,
  listTasks,
  saveSteps,
  saveTask,
  toggleStepComplete,
  updateTaskStatus,
} from "@/src/features/procrastination/repository";
import type {
  ProcrastinationTaskInput,
  TaskStatus,
  TaskStepInput,
} from "@/src/features/procrastination/types";

const taskKeys = {
  all: ["procrastination"] as const,
  list: (userId: string) => ["procrastination", "list", userId] as const,
  detail: (userId: string, taskId: string) =>
    ["procrastination", "detail", userId, taskId] as const,
  steps: (userId: string, taskId: string) => ["procrastination", "steps", userId, taskId] as const,
};

export function useTasks(userId: string | null) {
  return useQuery({
    queryKey: userId ? taskKeys.list(userId) : ["procrastination", "list", "anonymous"],
    queryFn: () => listTasks(userId!),
    enabled: Boolean(userId),
  });
}

export function useTask(userId: string | null, taskId: string | null) {
  return useQuery({
    queryKey:
      userId && taskId
        ? taskKeys.detail(userId, taskId)
        : ["procrastination", "detail", "anonymous"],
    queryFn: () => getTask(userId!, taskId!),
    enabled: Boolean(userId && taskId),
  });
}

export function useTaskSteps(userId: string | null, taskId: string | null) {
  return useQuery({
    queryKey:
      userId && taskId ? taskKeys.steps(userId, taskId) : ["procrastination", "steps", "anonymous"],
    queryFn: () => listSteps(userId!, taskId!),
    enabled: Boolean(userId && taskId),
  });
}

export function useSaveTask(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      steps,
    }: {
      input: ProcrastinationTaskInput;
      steps: TaskStepInput[];
    }) => {
      const task = await saveTask(userId!, input);
      await saveSteps(userId!, task.id, steps);
      return task;
    },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTaskStatus(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(userId!, taskId, status),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useToggleStep(userId: string | null, taskId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, completed }: { stepId: string; completed: boolean }) =>
      toggleStepComplete(userId!, stepId, completed),
    onSuccess: async () => {
      if (!userId || !taskId) return;
      await queryClient.invalidateQueries({ queryKey: taskKeys.steps(userId, taskId) });
    },
  });
}

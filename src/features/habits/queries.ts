import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveHabit,
  deleteHabit,
  getHabit,
  listHabitLogs,
  listHabits,
  restoreHabit,
  saveHabit,
  toggleHabitLog,
  upsertHabitLogNote,
} from "@/src/features/habits/repository";
import type { HabitInput } from "@/src/features/habits/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";

const habitKeys = {
  all: ["habits"] as const,
  list: (userId: string, includeArchived: boolean) =>
    ["habits", "list", userId, includeArchived] as const,
  detail: (userId: string, id: string) => ["habits", "detail", userId, id] as const,
  logs: (userId: string, scope: string) => ["habits", "logs", userId, scope] as const,
};

export function useHabits(userId: string | null, options: { includeArchived?: boolean } = {}) {
  const includeArchived = options.includeArchived ?? false;
  return useQuery({
    queryKey: userId
      ? habitKeys.list(userId, includeArchived)
      : ["habits", "list", "anonymous", includeArchived],
    queryFn: () => listHabits(userId!, includeArchived),
    enabled: Boolean(userId),
  });
}

export function useHabit(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? habitKeys.detail(userId, id) : ["habits", "detail", "anonymous", id ?? ""],
    queryFn: () => getHabit(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useHabitLogs(
  userId: string | null,
  options: { habitId?: string; sinceDate?: string; limit?: number } = {},
) {
  const scope = options.habitId
    ? `habit:${options.habitId}:${options.sinceDate ?? ""}:${options.limit ?? ""}`
    : `all:${options.sinceDate ?? ""}:${options.limit ?? ""}`;
  return useQuery({
    queryKey: userId ? habitKeys.logs(userId, scope) : ["habits", "logs", "anonymous", scope],
    queryFn: () => listHabitLogs(userId!, options),
    enabled: Boolean(userId),
  });
}

export function useSaveHabit(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, habitId }: { input: HabitInput; habitId?: string }) =>
      saveHabit(userId!, input, habitId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useArchiveHabit(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveHabit(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useRestoreHabit(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreHabit(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useDeleteHabit(userId: string | null) {
  return useDeleteMutation(userId, deleteHabit, habitKeys.all);
}

export function useToggleHabitLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, loggedOn }: { habitId: string; loggedOn: string }) =>
      toggleHabitLog(userId!, habitId, loggedOn),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useUpsertHabitLogNote(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      loggedOn,
      note,
    }: {
      habitId: string;
      loggedOn: string;
      note: string;
    }) => upsertHabitLogNote(userId!, habitId, loggedOn, note),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

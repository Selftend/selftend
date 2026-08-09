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
import {
  applyOptimisticToggle,
  habitLogsScope,
  isTickedInAnyPage,
  type HabitLogsScope,
} from "@/src/features/habits/optimistic-logs";
import type { HabitInput, HabitLog } from "@/src/features/habits/types";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const habitKeys = {
  all: ["habits"] as const,
  list: (userId: string, includeArchived: boolean) =>
    ["habits", "list", userId, includeArchived] as const,
  detail: (userId: string, id: string) => ["habits", "detail", userId, id] as const,
  /** Every logs page for one user - the filter the optimistic tick selects on. */
  logsRoot: (userId: string) => ["habits", "logs", userId] as const,
  /**
   * The scope rides as a structured object rather than a formatted string, so
   * an optimistic writer can read `sinceDate`/`limit` off the key and decide
   * whether a newly ticked day belongs in that page (#759). Query keys are
   * hashed structurally, so a fresh object per render is stable.
   */
  logs: (userId: string, scope: HabitLogsScope) => ["habits", "logs", userId, scope] as const,
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
  const scope = habitLogsScope(options);
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

export function useDeleteHabit(userId: string | null) {
  return useDeleteMutation(userId, deleteHabit, habitKeys.all);
}

/**
 * Ticking, applied to the cache first (#759).
 *
 * The overview's tick is the most-repeated control in the tool, so it may not
 * wait a round-trip to redraw. Deliberately **without**
 * `suppressGlobalErrorToast`: an optimistic write that silently rolls back
 * would leave the user believing a tick landed when it did not, so this is the
 * one mutation whose failure has to reach the global toast.
 */
export function useToggleHabitLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, loggedOn }: { habitId: string; loggedOn: string }) =>
      toggleHabitLog(userId!, habitId, loggedOn),
    onMutate: async ({ habitId, loggedOn }) => {
      if (!userId) return undefined;
      const filters = { queryKey: habitKeys.logsRoot(userId) };
      // In-flight reads would land after this write and clobber it.
      await queryClient.cancelQueries(filters);

      const previous = queryClient.getQueriesData<HabitLog[]>(filters);
      const intent = isTickedInAnyPage(
        previous.map(([, logs]) => logs),
        habitId,
        loggedOn,
      )
        ? "untick"
        : "tick";

      // Iterated rather than `setQueriesData`, because the updater has to see
      // each page's own scope - which `setQueriesData` does not hand it.
      for (const query of queryClient.getQueryCache().findAll(filters)) {
        const scope = (query.queryKey[3] ?? {}) as HabitLogsScope;
        queryClient.setQueryData<HabitLog[]>(query.queryKey, (logs) =>
          applyOptimisticToggle(logs, intent, { userId, habitId, loggedOn }, scope),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, logs] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, logs);
      }
    },
    onSuccess: (data) => {
      // Only a tick (log created) is a completion; unticking is not.
      if (data.ticked) requestReminderPrompt("habits");
    },
    // Both arms: a rollback restores a guess, not the server's answer, and the
    // insight/list caches never saw the optimistic write at all.
    onSettled: async () => {
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });
}

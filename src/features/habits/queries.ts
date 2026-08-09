import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

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
  /**
   * Under the `habits` root like every other key, so a tick invalidates the
   * history pages with the rest. Deliberately NOT under `logs`: the optimistic
   * tick walks `logsRoot` and writes flat `HabitLog[]` caches, and an infinite
   * query's cache is `{ pages, pageParams }` - the updater would corrupt it.
   */
  logPages: (userId: string) => ["habits", "logPages", userId] as const,
};

/**
 * Rows per history page (#762, decided on #696).
 *
 * The screen it replaces asked for 365 rows once and called that all history.
 * For a five-habit user that is ten weeks, silently - the worst cap of the
 * three screens the shared pattern covers.
 */
export const HABITS_HISTORY_PAGE_SIZE = 50;

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

/**
 * Every tick the user has, paged to exhaustion (#762).
 *
 * Offset paging rather than a cursor: `logged_on` is a `date`, so it is not
 * unique per row - two habits ticked on one day share it - and a
 * "less than the last row's key" cursor would skip whichever of them the page
 * boundary fell between.
 */
export function useHabitLogPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId ? habitKeys.logPages(userId) : ["habits", "logPages", "anonymous"],
    queryFn: ({ pageParam }) =>
      listHabitLogs(userId!, { limit: HABITS_HISTORY_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    // A short page is the end of the data. A full one may or may not be, so ask
    // again: one empty round trip at the exact boundary beats stopping early.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < HABITS_HISTORY_PAGE_SIZE
        ? undefined
        : lastPageParam + HABITS_HISTORY_PAGE_SIZE,
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
  /**
   * The (habit, day) pairs whose toggle is already in flight.
   *
   * `toggleHabitLog` is a read-then-write flip, so two overlapping calls for
   * one day race: both can read the same row and write in the same direction,
   * collapsing two intended toggles into one and settling the control opposite
   * to the user's last press. A ref rather than state, for the reason
   * `useSingleFlight` documents - `disabled={isPending}` cannot stop a rapid
   * double-press, because no re-render happens between two synchronous taps.
   *
   * Keyed rather than a single boolean, so ticking four habits in a row - the
   * interaction this tool exists for - stays fully concurrent.
   */
  const inFlight = useRef<Set<string>>(new Set());
  const mutation = useMutation({
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
    onSettled: async (_data, _error, { habitId, loggedOn }) => {
      inFlight.current.delete(toggleKey(habitId, loggedOn));
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: habitKeys.all });
    },
  });

  /**
   * The guard lives on the hook, not on a screen, so every caller inherits it:
   * the overview's row and the detail screen's calendar strip drive the same
   * row, and either can be double-pressed.
   */
  function mutate(variables: { habitId: string; loggedOn: string }) {
    const key = toggleKey(variables.habitId, variables.loggedOn);
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    mutation.mutate(variables);
  }

  return { ...mutation, mutate };
}

function toggleKey(habitId: string, loggedOn: string): string {
  return `${habitId}:${loggedOn}`;
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

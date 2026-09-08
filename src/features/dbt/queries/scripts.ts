import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countScripts,
  deleteScript,
  getScript,
  listDoneScriptsPage,
  listOpenScripts,
  listScripts,
  markScriptDone,
  saveScript,
} from "@/src/features/dbt/repository";
import type { ScriptDoneInput, ScriptInput } from "@/src/features/dbt/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { invalidateRecordDays, recordDaysKeys } from "@/src/features/progress/queries";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { DBT_HISTORY_PAGE_SIZE, dbtKeys } from "./keys";

export function useScripts(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: [...dbtKeys.scriptList(userId), limit],
    queryFn: () => listScripts(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * The open rungs, whole and in ladder order from the server (#2196). Not
 * paged: a page keyed on recency chose the window and difficulty only ordered
 * it, so the top row was the easiest of the newest twenty.
 */
export function useOpenScripts(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.scriptOpen(userId),
    queryFn: () => listOpenScripts(userId!),
    enabled: Boolean(userId),
  });
}

/** The done scripts under the ladder, newest-done first, keyset on `done_at`. */
export function useDoneScriptPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: dbtKeys.scriptDonePages(userId),
    queryFn: ({ pageParam }) => listDoneScriptsPage(userId!, DBT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.length < DBT_HISTORY_PAGE_SIZE
        ? undefined
        : // Every row on a done page has a done_at: the read filters on it.
          nextDescendingCursor(lastPage, (row) => row.doneAt!),
    enabled: Boolean(userId),
  });
}

export function useScriptCount(userId: string | null) {
  return useQuery({
    queryKey: dbtKeys.scriptCount(userId),
    queryFn: () => countScripts(userId!),
    enabled: Boolean(userId),
  });
}

export function useScript(userId: string | null, id: string | null) {
  return useQuery({
    queryKey: dbtKeys.scriptDetail(userId, id),
    queryFn: () => getScript(userId!, id!),
    enabled: Boolean(userId) && Boolean(id),
  });
}

export function useSaveScript(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScriptInput) => saveScript(userId!, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      // The once-ever reminder offer rides any DBT save (spec §4). The store
      // decides whether to show it and the shipped eligibility gates it; this
      // only reports that a save happened.
      requestReminderPrompt("dbt");
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.scriptList(userId) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

/** Done from the card - the one UPDATE a script takes (#1989). */
export function useMarkScriptDone(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScriptDoneInput }) =>
      markScriptDone(userId!, id, input),
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async (script) => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dbtKeys.scriptList(userId) }),
        queryClient.invalidateQueries({ queryKey: dbtKeys.scriptDetail(userId, script.id) }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useDeleteScript(userId: string | null) {
  return useDeleteMutation(userId, deleteScript, dbtKeys.scriptList(userId), recordDaysKeys.all);
}

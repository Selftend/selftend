import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  countCommittedActions,
  deleteCommittedAction,
  getCommittedAction,
  listCommittedActionArchivePage,
  listCommittedActions,
  saveCommittedAction,
  updateCommittedAction,
} from "@/src/features/act/repository";
import type {
  ActionStatus,
  CommittedAction,
  CommittedActionArchiveStatus,
  CommittedActionInput,
  CommittedActionPatch,
} from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { noteToolSave } from "@/src/stores/tool-save-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useCommittedActions(userId: string | null, status?: ActionStatus) {
  return useQuery({
    queryKey: actKeys.committedActionList(userId, status),
    queryFn: () => listCommittedActions(userId!, status),
    enabled: Boolean(userId),
  });
}

/**
 * The finished committed actions at one status — completed or abandoned — newest first, a
 * page at a time (#1517, tier 3).
 *
 * ☠️ The list screen is NOT flat, and that is why it does not simply take the keyset shape
 * the other ACT archives took. It renders three status sections, and a flat
 * `created_at desc` page cuts across all three: page one can legitimately hold zero active
 * rows, and the sections would fill raggedly as the user scrolls. So the read is split by
 * status instead — **active stays whole and unbounded** on `useCommittedActions(user,
 * "active")`, because a committed action is a working set the widget, routines engine and
 * programme each treat as non-existent when missing, and this hook bounds only the half
 * that grows without end.
 *
 * ☠️ And the finished half is split AGAIN, one archive per status (#2186). The same
 * raggedness argument applies between Completed and Abandoned: a page holding both, split
 * client-side, can legitimately hold zero rows of one status — twenty recent completions
 * hid every abandoned action behind a "Show more" that named no section. Each section now
 * pages itself, so an empty section is an empty section.
 *
 * Status sectioning names no day, so none of this is a #1513 second-frame problem.
 */
export function useCommittedActionArchivePages(
  userId: string | null,
  status: CommittedActionArchiveStatus,
) {
  return useInfiniteQuery({
    queryKey: actKeys.committedActionArchivePages(userId, status),
    queryFn: ({ pageParam }) =>
      listCommittedActionArchivePage(userId!, status, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (action) => action.createdAt),
    enabled: Boolean(userId),
  });
}

/**
 * Every committed action the list screen holds right now — the whole active set plus the
 * loaded pages of both finished archives — so the detail screen can paint a tapped row
 * from the cache it just came from (#2190).
 *
 * ☠️ These are the three entries the list screen FILLS, and that is the whole point. The
 * detail used to probe `useCommittedActions(userId)` with no status — the entry the
 * pre-#1517 list screen shared with it — which nothing on the list-to-detail path fills
 * any more: every open missed, mounted a spinner, and fired the one committed-action read
 * that has no bound (`listCommittedActions` without a status is every action the person
 * owns, archive included, decrypted). Probing the list screen's own entries hits on the
 * hop and, on a cold deep link, costs only the bounded reads the list would make anyway.
 */
export function useListedCommittedActions(userId: string | null) {
  const { data: active } = useCommittedActions(userId, "active");
  const { data: completed } = useCommittedActionArchivePages(userId, "completed");
  const { data: abandoned } = useCommittedActionArchivePages(userId, "abandoned");
  const data = useMemo<CommittedAction[] | undefined>(
    () =>
      active || completed || abandoned
        ? [
            ...(active ?? []),
            ...(completed?.pages.flat() ?? []),
            ...(abandoned?.pages.flat() ?? []),
          ]
        : undefined,
    [active, completed, abandoned],
  );
  return { data };
}

/**
 * Home's `N active` row - an exact count instead of an uncapped list read (#990).
 * The status rides the key, so each filter is its own entry under the list prefix
 * every committed-action mutation already invalidates.
 *
 * Omit `status` for ACT home's lifetime stat, which counts actions at every status
 * (#1378): an active-only count falls 1 → 0 when a user completes their only action,
 * and a counter that goes down on success reads as punishment for finishing.
 */
export function useCommittedActionCount(userId: string | null, status?: ActionStatus) {
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
      noteToolSave();
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

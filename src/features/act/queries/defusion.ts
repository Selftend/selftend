import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  countDefusionLogs,
  deleteDefusionLog,
  getDefusionLog,
  getLatestDefusionLogAt,
  listDefusionLogs,
  listDefusionLogsPage,
  saveDefusionLog,
} from "@/src/features/act/repository";
import type { DefusionLog, DefusionLogInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

/**
 * The limit `useDefusionLogs` reads at when a caller names none — the entry the programme
 * (`useActProgram`) and the widget sync fill, and the one `useListedDefusionLogs` probes.
 */
export const DEFUSION_LIST_DEFAULT_LIMIT = 30;

/** `enabled: false` subscribes to the cache entry without ever reading for it — a probe. */
interface ProbeOptions {
  enabled?: boolean;
}

export function useDefusionLogs(
  userId: string | null,
  limit = DEFUSION_LIST_DEFAULT_LIMIT,
  { enabled = true }: ProbeOptions = {},
) {
  return useQuery({
    // Include limit so 30/N callers don't collide on one cache entry; the limit-less
    // prefix in actKeys.defusionList still matches every variant on invalidation.
    queryKey: [...actKeys.defusionList(userId), limit],
    queryFn: () => listDefusionLogs(userId!, limit),
    enabled: enabled && Boolean(userId),
  });
}

/**
 * Every defusion log, newest first, a page at a time — the defusion screen's archive
 * (#1517). Flat and newest-first, never day-sectioned: #1513 binds ACT to the flat
 * family, so no day heading, date control or `formatRelativeDayKey` label belongs on
 * what this feeds.
 */
export function useDefusionLogPages(userId: string | null, { enabled = true }: ProbeOptions = {}) {
  return useInfiniteQuery({
    queryKey: actKeys.defusionHistoryPages(userId),
    queryFn: ({ pageParam }) => listDefusionLogsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (log) => log.createdAt),
    enabled: enabled && Boolean(userId),
  });
}

/**
 * Every defusion log some surface has already cached — the archive's loaded pages and the
 * plain recent list — so the detail screen can paint a tapped row from whichever entry
 * the hop came through (#2256).
 *
 * ☠️ A defusion detail has TWO doors, and they fill different entries. The list screen
 * fills `defusionHistoryPages`; ACT home's "Recent" rows push the same detail, and home
 * fills the plain default-limit list instead (through `useActProgram`, which is also the
 * entry the widget sync writes). #2190 moved the probe from the plain list to the pages
 * and closed the list-to-detail miss by opening the home-to-detail one: a full-screen
 * spinner, a 20-row page read and a single-row read on the module's most-trodden path.
 * Both entries are probed now, and a hit on either paints the row.
 *
 * ☠️ Both probes are PASSIVE (`enabled: false`). An active probe of an entry the hop did
 * not fill is a read for a surface that renders none of it — with two doors, every hop
 * would pay one. A disabled observer still sees the entry the list or home screen keeps
 * fresh underneath, and on a cold deep link both miss and `useCachedItem` falls through
 * to the single-row read, which is the one read that screen needs.
 */
export function useListedDefusionLogs(userId: string | null) {
  const { data: pages } = useDefusionLogPages(userId, { enabled: false });
  const { data: recent } = useDefusionLogs(userId, DEFUSION_LIST_DEFAULT_LIMIT, {
    enabled: false,
  });
  const data = useMemo<DefusionLog[] | undefined>(
    () => (pages || recent ? [...(pages?.pages.flat() ?? []), ...(recent ?? [])] : undefined),
    [pages, recent],
  );
  return { data };
}

/**
 * ACT home's "N thoughts unhooked" stat - an exact head count, never
 * `useDefusionLogs(...).data?.length`; `countRows` explains why (#1378).
 */
export function useDefusionLogCount(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionCount(userId),
    queryFn: () => countDefusionLogs(userId!),
    enabled: Boolean(userId),
  });
}

/** Home's `Last {{when}}` row - one row instead of the 30-row list (#990). */
export function useLatestDefusionLogAt(userId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionLatest(userId),
    queryFn: () => getLatestDefusionLogAt(userId!),
    enabled: Boolean(userId),
  });
}

export function useDefusionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionDetail(userId, logId),
    queryFn: () => getDefusionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveDefusionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DefusionLogInput) => saveDefusionLog(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("act");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.defusionList(userId) });
    },
  });
}

export function useDeleteDefusionLog(userId: string | null) {
  return useDeleteMutation(userId, deleteDefusionLog, actKeys.defusionList(userId));
}

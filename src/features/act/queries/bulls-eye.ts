import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getLatestBullsEyeByDomain,
  listBullsEyeSnapshots,
  listBullsEyeSnapshotsPage,
  saveBullsEyeSnapshot,
} from "@/src/features/act/repository";
import type { BullsEyeSnapshotInput } from "@/src/features/act/types";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";
import { ACT_HISTORY_PAGE_SIZE, actKeys } from "./keys";

export function useBullsEyeSnapshots(userId: string | null) {
  return useQuery({
    queryKey: actKeys.bullsEyeList(userId),
    queryFn: () => listBullsEyeSnapshots(userId!),
    enabled: Boolean(userId),
  });
}

/**
 * Every bull's-eye snapshot, newest first, a page at a time — the values screen's history
 * section (#1517, tier 2: a series with no body, so it pages but grows no detail route).
 *
 * ☠️ The visible history here was **three review dates**, and the cap was not a day
 * filter but an in-place slice: `HISTORY_ROWS = 12` over a 50-row read, against a check-in
 * that writes ONE ROW PER RATED DOMAIN — up to four. A weekly reviewer lost sight of week
 * four. The repo already knew the 50 bites: `getLatestBullsEyeByDomain` exists precisely to
 * route the values rows around it, "a cap wearing the face of an absence".
 *
 * ⚠️ Ordered on `(reviewed_at, id)`, and the tie-break earns its keep here more than
 * anywhere else in ACT: `saveBullsEyeSnapshot` defaults `reviewed_at` per row and the
 * check-in saves domains through `Promise.allSettled`, so one check-in produces up to four
 * snapshots milliseconds apart. Without `id` a page boundary could land inside that group
 * and repeat or drop a row.
 */
export function useBullsEyeSnapshotPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: actKeys.bullsEyeHistoryPages(userId),
    queryFn: ({ pageParam }) =>
      listBullsEyeSnapshotsPage(userId!, ACT_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the last page: asking for another would spend a round trip to
    // learn nothing. Only a FULL page can have more behind it.
    getNextPageParam: (lastPage) =>
      lastPage.length < ACT_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (snapshot) => snapshot.reviewedAt),
    enabled: Boolean(userId),
  });
}

/**
 * The newest rating per domain, for the values rows. Deliberately NOT a slice of
 * `useBullsEyeSnapshots` - that list caps at 50 and would report a fallen-off domain
 * as never rated (see `getLatestBullsEyeByDomain`).
 */
export function useLatestBullsEyeByDomain(userId: string | null) {
  return useQuery({
    queryKey: actKeys.bullsEyeLatest(userId),
    queryFn: () => getLatestBullsEyeByDomain(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveBullsEyeSnapshot(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BullsEyeSnapshotInput) => saveBullsEyeSnapshot(userId!, input),
    // A check-in saves each domain separately, so the global toast would fire once per
    // failed domain and still not say WHICH. The screen names them in a card instead.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      // Non-exact by default, and `bullsEyeLatest` sits under this prefix, so this one
      // call refreshes BOTH the history and the per-domain latest read the values rows
      // render. Pinned by `actKeys` nesting test - a latest key moved to a sibling
      // prefix would leave the row showing a stale number after a save, silently.
      await queryClient.invalidateQueries({ queryKey: actKeys.bullsEyeList(userId) });
    },
  });
}

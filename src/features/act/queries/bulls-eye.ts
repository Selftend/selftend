import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getLatestBullsEyeByDomain,
  listBullsEyeSnapshots,
  saveBullsEyeSnapshot,
} from "@/src/features/act/repository";
import type { BullsEyeSnapshotInput } from "@/src/features/act/types";
import { actKeys } from "./keys";

export function useBullsEyeSnapshots(userId: string | null) {
  return useQuery({
    queryKey: actKeys.bullsEyeList(userId),
    queryFn: () => listBullsEyeSnapshots(userId!),
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
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
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

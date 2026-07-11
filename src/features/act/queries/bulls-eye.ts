import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listBullsEyeSnapshots, saveBullsEyeSnapshot } from "@/src/features/act/repository";
import type { BullsEyeSnapshotInput } from "@/src/features/act/types";
import { actKeys } from "./keys";

export function useBullsEyeSnapshots(userId: string | null) {
  return useQuery({
    queryKey: actKeys.bullsEyeList(userId),
    queryFn: () => listBullsEyeSnapshots(userId!),
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
      await queryClient.invalidateQueries({ queryKey: actKeys.bullsEyeList(userId) });
    },
  });
}
